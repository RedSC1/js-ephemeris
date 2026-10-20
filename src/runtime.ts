import {
  registerContextExtensionHost,
  registerRuntimeExtensionHost,
} from "./internal/extension-access.js";
import {
  loadModule,
  Wire,
  diagnostic,
  type WasmInitializationOptions,
  type ContextHost,
  type RuntimeResourceHost,
} from "./internal/wasm.js";
import { ClosedContextError } from "./errors.js";
import {
  integer,
  finite,
  ResultFlags,
  result,
  RouteRule,
  TdbModel,
  ApparentFrame,
  type EphemerisDiagnostic,
  type OperationResult,
} from "./models.js";
import { PositionApi } from "./position.js";
import { Time } from "./time.js";
import { SolarTime } from "./solar-time.js";
import {
  ChineseCalendar,
  ChineseCalendarConfig,
  type ChineseCalendarConfiguration,
} from "./calendar.js";
import { EclipseApi } from "./eclipse.js";
import {
  EventsApi,
  VisibilityApi,
  PhenomenaApi,
  OrbitalApi,
  HeliacalApi,
  OccultationsApi,
  AstrologyApi,
  AdditionalContextConfiguration,
  SourceManagementApi,
} from "./astronomy.generated.js";
import { StarsApi, ObservedApi } from "./stellar-observed.js";
import {
  registerCustomModel,
  type CustomTargetModel,
  type CustomAyanamshaModel,
  type CustomHouseSystemModel,
  type CustomModelRegistration,
} from "./custom-models.js";
import { decode, decodeText, width } from "./internal/records.js";
import { assertAstronomyProtocol } from "./internal/astronomy-transport.js";
import type { RuntimeRegisteredDataSource } from "./internal/astronomy-records.generated.js";

export interface InitializationOptions extends WasmInitializationOptions {
  loadBuiltinEop?: boolean;
  segmentCacheMaxEntries?: number;
  strictDiscovery?: boolean;
}
export interface ContextOptions {
  chineseCalendarConfig?: ChineseCalendarConfig | ChineseCalendarConfiguration;
  tdbModel?: TdbModel;
  allowUtcOutOfRangeEstimate?: boolean;
}
export interface ApparentConfig {
  flags: number;
  outputFrame?: ApparentFrame;
  lightTimeMethod?: number;
  shapiroDelayModel?: number;
  aberrationModel?: number;
  deflectionModel?: number;
  maxLightTimeIterations?: number;
  lightTimeToleranceDays?: number;
  matrixDerivativeStepDays?: number;
}

/** One independently instantiated C++ runtime; initialization alone is asynchronous. */
export class Ephemeris {
  #closed = false;
  #active = 0;
  #contexts = new Set<EphemerisContext>();
  #names = new Set<string>();
  #serial = 0;
  #resources = new Set<{ close(): void }>();
  private resourceHost(): RuntimeResourceHost {
    return {
      wire: this.wire,
      run: <T>(fn: () => T) => this.run(fn),
      own: (value) => this.#resources.add(value),
      forget: (value) => this.#resources.delete(value),
    };
  }
  private setupHost(): RuntimeResourceHost {
    return {
      ...this.resourceHost(),
      run: <T>(fn: () => T) => {
        if (this.#active)
          throw new Error(
            "Custom model registration cannot change during a calculation",
          );
        return this.run(fn);
      },
    };
  }
  registerCustomTarget(model: CustomTargetModel): CustomModelRegistration {
    return registerCustomModel(this.setupHost(), 0, model);
  }
  registerCustomAyanamshaModel(
    model: CustomAyanamshaModel,
  ): CustomModelRegistration {
    return registerCustomModel(this.setupHost(), 1, model);
  }
  registerCustomHouseSystemModel(
    model: CustomHouseSystemModel,
  ): CustomModelRegistration {
    return registerCustomModel(this.setupHost(), 2, model);
  }
  readonly sources: SourceManagementApi;
  private constructor(private readonly wire: Wire) {
    registerRuntimeExtensionHost(this, this.resourceHost());
    this.sources = new SourceManagementApi({
      wire,
      handle: 0,
      run: <T>(fn: () => T) => {
        if (this.#active)
          throw new Error(
            "Source configuration cannot change during a calculation",
          );
        return this.run(fn);
      },
      record: () => {},
    });
  }
  registeredDataSources(): readonly (RuntimeRegisteredDataSource & {
    readonly source: string;
  })[] {
    return this.run(() => {
      assertAstronomyProtocol(this.wire);
      const v = this.wire.checked(
        this.wire.structured("_taiyin_web_astronomy_extra", [0, 4], []),
      );
      let cursor = 32;
      const data = Array.from(
        { length: integer(v[2]!, 0, 100000, "source count") },
        () => {
          const item = decode<RuntimeRegisteredDataSource>(
            "taiyin_runtime_registered_data_source",
            v,
            cursor,
          );
          cursor += width("taiyin_runtime_registered_data_source");
          const name = decodeText(v, cursor);
          cursor = name.next;
          return Object.freeze({ ...item, source: name.value });
        },
      );
      if (cursor !== v.length) throw new Error("Invalid source metadata reply");
      return Object.freeze(data);
    });
  }
  get capabilities(): bigint {
    return this.run(() => {
      assertAstronomyProtocol(this.wire);
      const v = this.wire.checked(
        this.wire.structured("_taiyin_web_astronomy_extra", [0, 5], []),
      );
      return BigInt(v[32]!) | (BigInt(v[33]!) << 32n);
    });
  }
  setEphemerisSourcePriority(filename: string, priority: number): void {
    this.sources.setEphemerisSourcePriority(filename, priority);
  }
  clearEphemerisSourcePriority(filename: string): void {
    this.sources.clearEphemerisSourcePriority(filename);
  }
  clearAllEphemerisSourcePriorities(): void {
    this.sources.clearAllEphemerisSourcePriorities();
  }
  registerBuiltinAstrologyTargets(): void {
    this.sources.registerBuiltinAstrologyTargets();
  }
  static async initialize(
    options: InitializationOptions = {},
  ): Promise<Ephemeris> {
    for (const key of ["loadBuiltinEop", "strictDiscovery"] as const)
      if (options[key] !== undefined && typeof options[key] !== "boolean")
        throw new TypeError(`${key} must be boolean`);
    const wire = new Wire(await loadModule(options));
    wire.checked(
      wire.fixed(
        "_taiyin_web_initialize",
        [],
        [
          1,
          +(options.loadBuiltinEop ?? true),
          integer(
            options.segmentCacheMaxEntries ?? 0,
            0,
            1000000,
            "cache entries",
          ),
          +(options.strictDiscovery ?? false),
        ],
      ),
    );
    return new Ephemeris(wire);
  }
  get libraryVersion(): string {
    return this.run(() =>
      this.wire.module.UTF8ToString(
        this.wire.invoke("_taiyin_get_library_version"),
      ),
    );
  }
  get cAbiVersion(): number {
    return this.run(() => this.wire.invoke("_taiyin_get_c_abi_version"));
  }
  get libraryCodename(): string {
    return this.run(() =>
      this.wire.module.UTF8ToString(
        this.wire.invoke("_taiyin_get_library_codename"),
      ),
    );
  }
  private run<T>(callback: () => T): T {
    if (this.#closed)
      throw new ClosedContextError("Ephemeris runtime is closed");
    this.#active++;
    try {
      return callback();
    } finally {
      this.#active--;
    }
  }
  createContext(options: ContextOptions = {}): EphemerisContext {
    return this.run(() => {
      // Validate before allocating a C++ context (constructor failure must not
      // strand a native handle).
      const calendar =
        options.chineseCalendarConfig instanceof ChineseCalendarConfig
          ? options.chineseCalendarConfig
          : new ChineseCalendarConfig(options.chineseCalendarConfig);
      options = { ...options, chineseCalendarConfig: calendar };
      const handle = this.wire.checked(
        this.wire.fixed("_taiyin_web_context_create", [], [], 32, false),
      )[1]!;
      const ctx: EphemerisContext = new EphemerisContext(
        this.wire,
        handle,
        (fn) => this.run(fn),
        () => this.#contexts.delete(ctx),
        options,
        (): EphemerisContext => {
          const cloneHandle = this.wire.checked(
            this.wire.fixed(
              "_taiyin_web_context_clone",
              [handle],
              [],
              32,
              false,
            ),
          )[1]!;
          return this.adopt(cloneHandle, {
            chineseCalendarConfig: ctx.calendarConfig,
            tdbModel: ctx.time.configuredTdbModel,
          });
        },
      );
      this.#contexts.add(ctx);
      try {
        ctx.initialize(options);
        return ctx;
      } catch (e) {
        ctx.close();
        throw e;
      }
    });
  }
  private adopt(handle: number, options: ContextOptions): EphemerisContext {
    const ctx: EphemerisContext = new EphemerisContext(
      this.wire,
      handle,
      (fn) => this.run(fn),
      () => this.#contexts.delete(ctx),
      options,
      (): EphemerisContext => {
        const h = this.wire.checked(
          this.wire.fixed("_taiyin_web_context_clone", [handle], [], 32, false),
        )[1]!;
        return this.adopt(h, {
          chineseCalendarConfig: ctx.calendarConfig,
          tdbModel: ctx.time.configuredTdbModel,
        });
      },
    );
    this.#contexts.add(ctx);
    ctx.time.syncModel(options.tdbModel ?? TdbModel.fastPeriodic);
    return ctx;
  }
  private loadFile(
    kind: number,
    bytes: Uint8Array,
    filename: string,
  ): OperationResult<void> {
    return this.run(() => {
      if (!(bytes instanceof Uint8Array) || bytes.length === 0)
        throw new TypeError("Expected nonempty Uint8Array");
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(filename))
        throw new TypeError("Use a basename, not a path");
      const key = filename.toLowerCase();
      if (kind === 0 && this.#names.has(key))
        throw new Error(`Ephemeris source already loaded: ${filename}`);
      if (kind === 0) {
        const magic = new TextDecoder().decode(bytes.subarray(0, 8));
        if (key.endsWith(".opm2")) {
          if (!magic.startsWith("OPM2"))
            throw new TypeError("Expected OPM2 bytes");
        } else if (/\.(bsp|spk)$/.test(key)) {
          if (!magic.startsWith("DAF/SPK"))
            throw new TypeError("Expected SPK bytes");
        } else if (key.endsWith(".tkc1")) {
          if (!magic.startsWith("TKC1"))
            throw new TypeError("Expected TKC1 bytes");
        } else if (!key.endsWith(".tke1"))
          throw new TypeError(
            "Supported ephemeris files: .opm2, .bsp, .spk, .tkc1, .tke1",
          );
      }
      const directory = `/js-data/${++this.#serial}`;
      const path = `${directory}/${filename}`;
      this.wire.module.FS.mkdirTree(directory);
      this.wire.module.FS.writeFile(path, bytes);
      try {
        const v = this.wire.string(path, (p) =>
          this.wire.checked(
            this.wire.fixed("_taiyin_web_load_file", [kind, p], [], 32, false),
          ),
        );
        if (kind === 0) this.#names.add(key);
        return result(undefined, new ResultFlags(v[0]!));
      } catch (e) {
        this.wire.module.FS.unlink(path);
        throw e;
      }
    });
  }
  loadEphemerisBytes(
    bytes: Uint8Array,
    { filename }: { filename: string },
  ): OperationResult<void> {
    return this.loadFile(0, bytes, filename);
  }
  loadEopBytes(
    bytes: Uint8Array,
    { filename = "finals2000a.all" } = {},
  ): OperationResult<void> {
    return this.loadFile(1, bytes, filename);
  }
  loadLunarLimbBytes(
    bytes: Uint8Array,
    { filename = "lunar.tll1" } = {},
  ): OperationResult<void> {
    return this.loadFile(2, bytes, filename);
  }
  loadStarCatalogBytes(bytes: Uint8Array): OperationResult<void> {
    return this.run(() => {
      if (!(bytes instanceof Uint8Array) || !bytes.length)
        throw new TypeError("Expected nonempty TSC1 Uint8Array");
      const v = this.wire.bytes(bytes, (p) =>
        this.wire.checked(
          this.wire.fixed(
            "_taiyin_web_star_memory",
            [p, bytes.length],
            [],
            32,
            false,
          ),
        ),
      );
      return result(undefined, new ResultFlags(v[0]!));
    });
  }
  loadStarAliasesBytes(
    bytes: Uint8Array,
    { filename = "stars.tsf1" } = {},
  ): OperationResult<void> {
    return this.loadFile(3, bytes, filename);
  }
  private resource(op: number): number[] {
    return this.run(() =>
      this.wire.checked(
        this.wire.fixed("_taiyin_web_resource", [op], [], 32, false),
      ),
    );
  }
  loadBuiltinEop(): void {
    this.resource(0);
  }
  clearEop(): void {
    this.resource(1);
  }
  get hasEop(): boolean {
    return !!this.resource(2)[1];
  }
  clearLunarLimb(): void {
    this.resource(3);
  }
  get hasLunarLimb(): boolean {
    return !!this.resource(4)[1];
  }
  clearStarCatalogs(): void {
    this.resource(5);
  }
  get starCount(): number {
    return this.resource(6)[1]!;
  }
  findStarMagnitude(key: string): OperationResult<number> {
    return this.run(() => {
      const v = this.wire.string(key, (p) =>
        this.wire.checked(
          this.wire.fixed("_taiyin_web_star_magnitude", [p], [], 32, false),
        ),
      );
      return result(v[1]!, new ResultFlags(v[0]!));
    });
  }
  close(): void {
    if (this.#closed) return;
    if (this.#active)
      throw new Error("Cannot close runtime during an active calculation");
    for (const ctx of [...this.#contexts]) ctx.close();
    for (const resource of [...this.#resources].reverse()) resource.close();
    this.#closed = true;
  }
}

/** Mutable configuration and small C++ caches are scoped to this context. */
export class EphemerisContext {
  #closed = false;
  #active = 0;
  #calendar: ChineseCalendar | undefined;
  #children = new Set<{ close(): void }>();
  #diagnostic: EphemerisDiagnostic | undefined;
  readonly position: PositionApi;
  readonly time: Time;
  readonly solarTime: SolarTime;
  readonly eclipses: EclipseApi;
  readonly events: EventsApi;
  readonly visibility: VisibilityApi;
  readonly phenomena: PhenomenaApi;
  readonly orbits: OrbitalApi;
  readonly heliacal: HeliacalApi;
  readonly occultations: OccultationsApi;
  readonly astrology: AstrologyApi;
  readonly stars: StarsApi;
  readonly observed: ObservedApi;
  readonly configuration: ContextConfiguration;
  readonly calendarConfig: ChineseCalendarConfig;
  private readonly host: ContextHost;
  constructor(
    wire: Wire,
    handle: number,
    private readonly runtimeRun: <T>(fn: () => T) => T,
    private readonly onClose: () => void,
    options: ContextOptions,
    private readonly cloneContext: () => EphemerisContext,
  ) {
    this.calendarConfig =
      options.chineseCalendarConfig instanceof ChineseCalendarConfig
        ? options.chineseCalendarConfig
        : new ChineseCalendarConfig(options.chineseCalendarConfig);
    this.host = {
      wire,
      handle,
      run: <T>(fn: () => T) => this.run(fn),
      record: (v, offset = 0) => {
        this.#diagnostic = diagnostic(v, offset);
      },
    };
    // Reads/calculations may nest, but a callback must not mutate the context
    // whose native calculation is still active. Other contexts remain usable.
    const configurationHost: ContextHost = {
      ...this.host,
      run: <T>(fn: () => T) => {
        if (this.#active)
          throw new Error(
            "Context configuration cannot change during an active calculation",
          );
        return this.run(fn);
      },
    };
    this.position = new PositionApi(this.host);
    this.time = new Time(this.host, configurationHost);
    this.solarTime = new SolarTime(this.host);
    this.eclipses = new EclipseApi(this.host);
    this.events = new EventsApi(this.host);
    this.visibility = new VisibilityApi(this.host);
    this.phenomena = new PhenomenaApi(this.host);
    this.orbits = new OrbitalApi(this.host);
    this.heliacal = new HeliacalApi(this.host);
    this.occultations = new OccultationsApi(this.host);
    this.astrology = new AstrologyApi(this.host);
    this.stars = new StarsApi(this.host);
    this.observed = new ObservedApi(this.host);
    this.configuration = new ContextConfiguration(configurationHost, this.time);
    registerContextExtensionHost(this, {
      host: this.host,
      time: this.time,
      calendar: () => this.chineseCalendar,
      createChild: <T extends { close(): void }>(
        factory: (onClose: () => void) => T,
      ): T =>
        this.run(() => {
          const child = factory(() => this.#children.delete(child));
          this.#children.add(child);
          return child;
        }),
    });
  }
  /** @internal Initialization performed by Ephemeris. */
  initialize(options: ContextOptions): void {
    if (options.tdbModel !== undefined) this.time.setTdbModel(options.tdbModel);
    if (options.allowUtcOutOfRangeEstimate !== undefined)
      this.time.setAllowUtcOutOfRangeEstimate(
        options.allowUtcOutOfRangeEstimate,
      );
  }
  private run<T>(fn: () => T): T {
    if (this.#closed) throw new ClosedContextError();
    return this.runtimeRun(() => {
      this.#active++;
      try {
        return fn();
      } finally {
        this.#active--;
      }
    });
  }
  get lastDiagnostic(): EphemerisDiagnostic | undefined {
    return this.run(() => this.#diagnostic);
  }
  get chineseCalendar(): ChineseCalendar {
    return this.run(
      () =>
        (this.#calendar ??= this.createChineseCalendar(this.calendarConfig)),
    );
  }
  createChineseCalendar(
    config: ChineseCalendarConfig | ChineseCalendarConfiguration = this
      .calendarConfig,
  ): ChineseCalendar {
    return this.run(() => {
      const c =
        config instanceof ChineseCalendarConfig
          ? config
          : new ChineseCalendarConfig(config);
      const v = this.host.wire.checked(
        this.host.wire.fixed(
          "_taiyin_web_calendar_create",
          [this.host.handle],
          [
            c.mode,
            c.dayBoundaryMode,
            c.utcOffsetMinutes,
            c.calendarMeridianDegrees,
          ],
        ),
      );
      const cal = new ChineseCalendar(this.host, this.time, v[1]!, c, () => {
        this.#children.delete(cal);
        if (this.#calendar === cal) this.#calendar = undefined;
      });
      this.#children.add(cal);
      return cal;
    });
  }
  clone(): EphemerisContext {
    return this.run(() => this.cloneContext());
  }
  close(): void {
    if (this.#closed) return;
    if (this.#active)
      throw new Error("Cannot close context during an active calculation");
    this.runtimeRun(() => {
      for (const child of [...this.#children].reverse()) child.close();
      this.host.wire.invoke("_taiyin_context_destroy", this.host.handle);
      this.#closed = true;
      this.onClose();
    });
  }
}

export class ContextConfiguration extends AdditionalContextConfiguration {
  constructor(
    private readonly host: ContextHost,
    private readonly time: Time,
  ) {
    super(host);
  }
  private set(op: number, args: readonly number[]): void {
    this.host.run(() =>
      this.host.wire.checked(
        this.host.wire.fixed(
          "_taiyin_web_configure",
          [this.host.handle, op],
          args,
        ),
      ),
    );
  }
  setRouteRule(rule: RouteRule): void {
    this.set(0, [integer(rule, 0, 3, "route rule")]);
  }
  setAllowUtcOutOfRangeEstimate(allow: boolean): void {
    this.time.setAllowUtcOutOfRangeEstimate(allow);
  }
  setGeocentricObserver(observerId: number, centerId: number): void {
    this.set(2, [
      integer(observerId, -2147483648, 2147483647, "observer ID"),
      integer(centerId, -2147483648, 2147483647, "center ID"),
    ]);
  }
  setObserverLocation({
    longitudeDegrees,
    latitudeDegrees,
    heightMeters = 0,
  }: {
    longitudeDegrees: number;
    latitudeDegrees: number;
    heightMeters?: number;
  }): void {
    if (Math.abs(finite(latitudeDegrees, "latitude")) > 90)
      throw new RangeError("Latitude must be in [-90,90]");
    this.set(3, [
      finite(longitudeDegrees, "longitude"),
      latitudeDegrees,
      finite(heightMeters, "height"),
    ]);
  }
  clearObserverLocation(): void {
    this.set(4, []);
  }
  setModels({
    tdbModel = this.time.configuredTdbModel,
    precessionModel = -1,
    nutationModel = -1,
    obliquityModel = 0,
    frameRoute = 0,
  }: {
    tdbModel?: TdbModel;
    precessionModel?: number;
    nutationModel?: number;
    obliquityModel?: number;
    frameRoute?: number;
  } = {}): void {
    this.set(5, [
      integer(tdbModel, 0, 1, "TDB model"),
      integer(precessionModel, -1, 2147483647, "precession model"),
      integer(nutationModel, -1, 2147483647, "nutation model"),
      integer(obliquityModel, 0, 2147483647, "obliquity model"),
      integer(frameRoute, 0, 2147483647, "frame route"),
    ]);
    this.time.syncModel(tdbModel);
  }
  setApparentConfig(c: ApparentConfig): void {
    this.set(6, [
      integer(c.flags, 0, 0xffffffff, "apparent flags"),
      integer(c.outputFrame ?? 2, 0, 7, "output frame"),
      integer(c.lightTimeMethod ?? 0, 0, 2147483647, "light-time method"),
      integer(c.shapiroDelayModel ?? 0, 0, 2147483647, "Shapiro model"),
      integer(c.aberrationModel ?? 0, 0, 2147483647, "aberration model"),
      integer(c.deflectionModel ?? 0, 0, 2147483647, "deflection model"),
      integer(c.maxLightTimeIterations ?? 8, 0, 0xffffffff, "iterations"),
      finite(c.lightTimeToleranceDays ?? 1e-12, "tolerance"),
      finite(c.matrixDerivativeStepDays ?? 0.001, "derivative step"),
    ]);
  }
  useSolarDeflector(): void {
    this.set(7, []);
  }
  clearDeflectors(): void {
    this.set(8, []);
  }
  /** Reset astronomy configuration to core defaults; calendar objects are unchanged. */
  reset(): void {
    this.set(9, []);
    this.time.syncModel(TdbModel.fastPeriodic);
  }
  setLightTimeIteration(iterations: number, toleranceDays: number): void {
    this.set(10, [
      integer(iterations, 0, 0xffffffff, "iterations"),
      finite(toleranceDays, "tolerance"),
    ]);
  }
  setTdbModel(model: TdbModel): void {
    this.time.setTdbModel(model);
  }
  setDeltaTModel(model = 0, family = 0): void {
    this.set(11, [
      integer(model, 0, 2147483647, "Delta-T model"),
      integer(family, 0, 2147483647, "family"),
    ]);
  }
}
