import {
  AstroDateTime,
  JulianDate,
  UtcJulianDate,
  type Ut1JulianDate,
  jdValues,
  dateValues,
  sameScale,
} from "js-ephemeris/extension-host";
import {
  ChineseCalendar,
  type SolarDate,
  type LunarDate,
} from "js-ephemeris/extension-host";
import {
  withZiweiCatalog,
  type ZiweiDataCatalog,
  type ZiweiRuleset,
} from "./ziwei-catalog.js";
import { ClosedContextError } from "js-ephemeris/extension-host";
import {
  result,
  ResultFlags,
  integer,
  finite,
  type OperationResult,
} from "js-ephemeris/extension-host";
import { withCalendar, retainCalendar } from "js-ephemeris/extension-host";
import {
  decode,
  encode,
  encodeText,
  decodeText,
  width,
} from "js-ephemeris/extension-host";
import type * as R from "js-ephemeris/extension-host";
import type { ContextHost } from "js-ephemeris/extension-host";
import type { Time } from "js-ephemeris/extension-host";

export enum ZiweiGender {
  male = 0,
  female = 1,
}
export enum ZiweiClockMode {
  fixedOffset = 0,
  meanSolar = 1,
  apparentSolar = 2,
}
export enum ZiweiChartMode {
  tianPan = 0,
  diPan = 1,
  renPan = 2,
}
export enum ZiweiFlowLevel {
  decade = 0,
  year = 1,
  month = 2,
  day = 3,
  hour = 4,
}
export enum ZiweiPillarBoundary {
  solarTerm = 0,
  lunar = 1,
}
export enum ZiweiLeapMonthStrategy {
  asPrevious = 0,
  asNext = 1,
  splitAfterFifteenth = 2,
}
export enum ZiweiFlowMonthPalaceStrategy {
  physicalSequence = 0,
  effectiveMonth = 1,
}
export enum ZiweiBureau {
  water2 = 0,
  wood3 = 1,
  metal4 = 2,
  earth5 = 3,
  fire6 = 4,
}
export enum ZiweiPalace {
  life = 0,
  siblings = 1,
  spouse = 2,
  children = 3,
  wealth = 4,
  health = 5,
  travel = 6,
  friends = 7,
  career = 8,
  property = 9,
  fortune = 10,
  parents = 11,
}
export interface ZiweiClock {
  mode?: ZiweiClockMode;
  longitudeRadians?: number;
}
export interface ZiweiOptionSelection {
  placementDefault?: string;
  placement?: Readonly<Record<string, string>>;
  brightnessDefault?: string;
  brightness?: Readonly<Record<string, string>>;
  sihuaDefault?: string;
  sihua?: Readonly<Record<string, string>>;
  masters?: string;
  longevity?: string;
}
export interface ZiweiJsonRuleModule {
  label: string;
  starsJson?: string;
  brightnessJson?: string;
  sihuaJson?: string;
  flowJson?: string;
  mastersJson?: string;
}
export interface ZiweiConfiguration {
  selection?: ZiweiOptionSelection;
  ruleModules?: readonly ZiweiJsonRuleModule[];
  ruleset?: ZiweiRuleset;
  catalog?: ZiweiDataCatalog;
}
export interface ZiweiCalculateOptions {
  gender: ZiweiGender;
  options?: ZiweiBirthConfiguration;
  clock?: ZiweiClock;
}
export interface ZiweiCivilOptions extends ZiweiCalculateOptions {
  hour: number;
  minute?: number;
  second?: number;
  nanosecond?: number;
}
export interface ZiweiUtcClockTarget {
  readonly instantUtc: UtcJulianDate;
  readonly virtualTime: AstroDateTime;
  readonly ratHourSegment: number;
}
export interface ZiweiStar {
  readonly id: number;
  readonly key: string;
  readonly category: number;
  readonly isNatal: boolean;
}
export interface ZiweiStarPosition {
  readonly branch: number;
  readonly palace: number;
  readonly brightness: number;
  readonly transformationMask: number;
}
export interface ZiweiChartSummary {
  readonly anchors: readonly number[];
  readonly gender: number;
  readonly bureau: number;
  readonly bodyPalace: number;
  readonly lifeMaster: number;
  readonly bodyMaster: number;
  readonly yearTransforms: R.ZiweiTransformSet;
  readonly palaceBranches: readonly number[];
  readonly palaceStems: readonly number[];
  readonly input: R.ZiweiPlacementInput;
  readonly overrides: R.ZiweiPlacementPatch;
  readonly lifePalaceShift: number;
}
export interface ZiweiClockTarget {
  readonly instantUt1: Ut1JulianDate;
  readonly virtualTime: AstroDateTime;
  readonly ratHourSegment: number;
}
export interface ZiweiReverseUt1Candidate extends Omit<
  R.ZiweiReverseCandidate,
  "instantUtc"
> {
  readonly instantUt1: Ut1JulianDate;
}
export type ZiweiBirthConfiguration = Partial<R.ZiweiBirthOptions>;
export type ZiweiFlowConfiguration = Partial<R.ZiweiFlowOptions>;
const birth = (v: ZiweiBirthConfiguration = {}) =>
  encode("taiyin_ziwei_birth_options", {
    ratHourMode: 0,
    leapMonthStrategy: 2,
    chartMode: 0,
    wuHuDunYearBoundary: 1,
    sihuaYearBoundary: 1,
    bodyMasterYearBoundary: 1,
    ...v,
  });
const flow = (v: ZiweiFlowConfiguration = {}) =>
  encode("taiyin_ziwei_flow_options", {
    boundary: 1,
    ratHourMode: 0,
    childhoodStrategy: 0,
    flowMonthPalaceStrategy: 0,
    ...v,
  });
const clock = (v: ZiweiClock = {}) => {
  const mode = integer(v.mode ?? 0, 0, 2, "clock mode");
  const longitude = finite(v.longitudeRadians ?? 0, "longitude radians");
  if (mode !== 0 && Math.abs(longitude) > Math.PI)
    throw new RangeError("Longitude radians must be in [-pi,pi]");
  return [mode, longitude];
};
const direction = (v: number) => {
  if (v !== 1 && v !== -1) throw new RangeError("Direction must be -1 or 1");
  return v;
};
const patch = (v: Partial<R.ZiweiPlacementPatch>) =>
  encode("taiyin_ziwei_placement_patch", {
    yearStem: -1,
    yearBranch: -1,
    month: -1,
    day: -1,
    hourBranch: -1,
    updateBureau: -1,
    ...v,
  });
type ChartCall = (op: number, input?: number[]) => number[];

/** Reuses one compiled C++ rule snapshot for every natal/flow/casting chart. */
export class ZiweiContext {
  #closed = false;
  #charts = new Set<{ close(): void }>();
  #release: () => void;
  /** @internal */
  constructor(
    private readonly host: ContextHost,
    private readonly time: Time,
    readonly chineseCalendar: ChineseCalendar,
    private readonly handle: number,
    private readonly catalog: number,
    private readonly onClose: () => void,
  ) {
    this.#release = retainCalendar(chineseCalendar, host);
  }
  #call(op: number, input: number[] = [], chart = 0): number[] {
    return this.host.run(() => {
      if (this.#closed) throw new ClosedContextError("Ziwei context is closed");
      return withCalendar(this.chineseCalendar, this.host, (c) => {
        const reply = this.host.wire.structured(
          "_taiyin_web_ziwei",
          [this.handle, chart, c, op],
          input,
        );
        this.host.record(reply.values);
        return this.host.wire.checked(reply, 0);
      });
    });
  }
  get isClosed(): boolean {
    return this.#closed;
  }
  close(): void {
    if (this.#closed) return;
    this.host.run(() => {
      for (const chart of [...this.#charts]) chart.close();
      this.#call(5);
      if (this.catalog !== 0)
        this.host.wire.checked(
          this.host.wire.structured(
            "_taiyin_web_ziwei",
            [this.catalog, 0, 0, 1],
            [],
          ),
        );
      this.#closed = true;
      this.#release();
      this.onClose();
    });
  }
  get generation(): bigint {
    const v = this.#call(6);
    return BigInt(v[32]!) | (BigInt(v[33]!) << 32n);
  }
  get starCount(): number {
    return this.#call(6)[34]!;
  }
  findStar(key: string): ZiweiStar | null {
    const v = this.#call(7, encodeText(key));
    return v[32] === 65535
      ? null
      : Object.freeze({
          id: v[32]!,
          category: v[33]!,
          isNatal: !!v[34],
          key: decodeText(v, 35).value,
        });
  }
  star(id: number): ZiweiStar {
    const v = this.#call(8, [integer(id, 0, 65534, "star ID")]);
    return Object.freeze({
      id: v[32]!,
      category: v[33]!,
      isNatal: !!v[34],
      key: decodeText(v, 35).value,
    });
  }
  private adoptChart(reply: number[]): OperationResult<ZiweiChart> {
    const handle = reply[32]!;
    const chart: ZiweiChart = new ZiweiChart(
      (op, input = []) => this.#call(op, input, handle),
      this.time,
      this.chineseCalendar,
      (v) => this.adoptChart(v),
      () => this.#charts.delete(chart),
    );
    this.#charts.add(chart);
    return result(chart, new ResultFlags(reply[0]!));
  }
  private adoptCasting(reply: number[]): OperationResult<ZiweiCastingChart> {
    const handle = reply[32]!;
    const chart: ZiweiCastingChart = new ZiweiCastingChart(
      (op, input = []) => this.#call(op, input, handle),
      this.time,
      (v) => this.adoptCasting(v),
      () => this.#charts.delete(chart),
    );
    this.#charts.add(chart);
    return result(chart, new ResultFlags(reply[0]!));
  }
  createChartLocal(
    local: AstroDateTime,
    {
      gender,
      options = {},
    }: { gender: ZiweiGender; options?: ZiweiBirthConfiguration },
  ): OperationResult<ZiweiChart> {
    const utc = this.chineseCalendar.instantFromLocal(local);
    return this.adoptChart(
      this.#call(9, [
        ...jdValues(utc.value),
        ...dateValues(local),
        integer(gender, 0, 1, "gender"),
        ...birth(options),
      ]),
    );
  }
  createChartUtc(
    utc: UtcJulianDate,
    {
      gender,
      options = {},
    }: { gender: ZiweiGender; options?: ZiweiBirthConfiguration },
  ): OperationResult<ZiweiChart> {
    sameScale(utc, "UTC");
    const local = this.chineseCalendar.localFromInstant(utc);
    return this.adoptChart(
      this.#call(9, [
        ...jdValues(utc),
        ...dateValues(local.value),
        integer(gender, 0, 1, "gender"),
        ...birth(options),
      ]),
    );
  }
  createChartAtUt1(
    ut1: Ut1JulianDate,
    {
      gender,
      clock: policy = {},
      options = {},
    }: {
      gender: ZiweiGender;
      clock?: ZiweiClock;
      options?: ZiweiBirthConfiguration;
    },
  ): OperationResult<ZiweiChart> {
    sameScale(ut1, "UT1");
    return this.adoptChart(
      this.#call(10, [
        ...jdValues(ut1),
        ...clock(policy),
        integer(gender, 0, 1, "gender"),
        ...birth(options),
      ]),
    );
  }
  calculateLocal(
    local: AstroDateTime,
    options: ZiweiCalculateOptions,
  ): OperationResult<ZiweiChart> {
    const policy = options.clock ?? {};
    clock(policy);
    if ((policy.mode ?? 0) === ZiweiClockMode.fixedOffset)
      return this.createChartLocal(local, options);
    const utc = this.chineseCalendar.instantFromLocal(local);
    const ut1 = this.time.utcToUt1(utc.value);
    const chart = this.createChartAtUt1(ut1.value, options);
    return result(chart.value, utc.flags.union(ut1.flags).union(chart.flags));
  }
  calculateInstant(
    instant: UtcJulianDate | Date,
    options: ZiweiCalculateOptions,
  ): OperationResult<ZiweiChart> {
    const utc =
      instant instanceof Date ? UtcJulianDate.fromDate(instant) : instant;
    sameScale(utc, "UTC");
    clock(options.clock ?? {});
    if ((options.clock?.mode ?? 0) === 0)
      return this.createChartUtc(utc, options);
    const ut1 = this.time.utcToUt1(utc);
    const chart = this.createChartAtUt1(ut1.value, options);
    return result(chart.value, ut1.flags.union(chart.flags));
  }
  calculateSolarDay(
    day: SolarDate,
    options: ZiweiCivilOptions,
  ): OperationResult<ZiweiChart> {
    return this.calculateLocal(
      new AstroDateTime(
        day.year,
        day.month,
        day.day,
        options.hour,
        options.minute ?? 0,
        options.second ?? 0,
        options.nanosecond ?? 0,
      ),
      options,
    );
  }
  calculateLunarDay(
    day: LunarDate,
    options: ZiweiCivilOptions,
  ): OperationResult<ZiweiChart> {
    const solar = this.chineseCalendar.fromLunar(day);
    const chart = this.calculateSolarDay(solar.value, options);
    return result(chart.value, solar.flags.union(chart.flags));
  }
  private legacyStep(
    op: number,
    options: {
      instantUtc: UtcJulianDate;
      virtualTime: AstroDateTime;
      ratHourMode?: number;
      direction?: number;
    },
  ): OperationResult<ZiweiUtcClockTarget> {
    sameScale(options.instantUtc, "UTC");
    const v = this.#call(op, [
      ...jdValues(options.instantUtc),
      ...dateValues(options.virtualTime),
      integer(options.ratHourMode ?? 0, 0, 2, "rat hour mode"),
      direction(options.direction ?? 1),
    ]);
    return result(
      Object.freeze({
        instantUtc: new JulianDate(v[32]!, v[33]!, "UTC"),
        virtualTime: decode<AstroDateTime>(
          "taiyin_calendar_datetime",
          v,
          34,
          this.time,
        ),
        ratHourSegment: v[40]!,
      }),
      new ResultFlags(v[0]!),
    );
  }
  stepFlowHourTarget(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
    ratHourMode?: number;
    direction?: number;
  }): OperationResult<ZiweiUtcClockTarget> {
    return this.legacyStep(29, options);
  }
  stepFlowDayTarget(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
    direction?: number;
  }): OperationResult<ZiweiUtcClockTarget> {
    return this.legacyStep(30, options);
  }
  nextFlowHourTarget(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
    ratHourMode?: number;
  }): OperationResult<ZiweiUtcClockTarget> {
    return this.stepFlowHourTarget(options);
  }
  previousFlowHourTarget(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
    ratHourMode?: number;
  }): OperationResult<ZiweiUtcClockTarget> {
    return this.stepFlowHourTarget({ ...options, direction: -1 });
  }
  nextFlowDayTarget(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
  }): OperationResult<ZiweiUtcClockTarget> {
    return this.stepFlowDayTarget(options);
  }
  previousFlowDayTarget(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
  }): OperationResult<ZiweiUtcClockTarget> {
    return this.stepFlowDayTarget({ ...options, direction: -1 });
  }
  reverseLookupTier1(options: {
    start: UtcJulianDate;
    end: UtcJulianDate;
    startVirtualTime?: AstroDateTime;
    gender: ZiweiGender;
    birthOptions?: ZiweiBirthConfiguration;
    query: Partial<R.ZiweiReverseQuery>;
  }): OperationResult<readonly R.ZiweiReverseCandidate[]> {
    sameScale(options.start, "UTC");
    sameScale(options.end, "UTC");
    const virtual =
      options.startVirtualTime ??
      this.chineseCalendar.localFromInstant(options.start).value;
    const query = encode("taiyin_ziwei_reverse_query", {
      lucunBranch: -1,
      hongluanBranch: -1,
      zuofuBranch: -1,
      youbiBranch: -1,
      wenchangBranch: -1,
      wenquBranch: -1,
      santaiBranch: -1,
      bazuoBranch: -1,
      ziweiBranch: -1,
      ...options.query,
    });
    const v = this.#call(31, [
      ...jdValues(options.start),
      ...jdValues(options.end),
      ...dateValues(virtual),
      integer(options.gender, 0, 1, "gender"),
      ...birth(options.birthOptions),
      ...query,
    ]);
    return result(
      Object.freeze(
        Array.from({ length: v[2]! }, (_, i) =>
          decode<R.ZiweiReverseCandidate>(
            "taiyin_ziwei_reverse_candidate",
            v,
            32 + i * width("taiyin_ziwei_reverse_candidate"),
            this.time,
            "UTC",
          ),
        ),
      ),
      new ResultFlags(v[0]!),
    );
  }
  private casting(options: {
    gender: ZiweiGender;
    chartMode?: ZiweiChartMode;
    fixedBureau?: number;
  }): number[] {
    return [
      integer(options.gender, 0, 1, "gender"),
      integer(options.chartMode ?? 0, 0, 2, "chart mode"),
      integer(options.fixedBureau ?? -1, -1, 4, "bureau"),
    ];
  }
  createCastingChart(
    input: R.ZiweiPlacementInput,
    options: {
      gender: ZiweiGender;
      chartMode?: ZiweiChartMode;
      fixedBureau?: number;
    },
  ): OperationResult<ZiweiCastingChart> {
    return this.adoptCasting(
      this.#call(33, [
        ...this.casting(options),
        ...encode("taiyin_ziwei_placement_input", input),
      ]),
    );
  }
  castingFromIndex(
    index: number,
    options: { gender: ZiweiGender; chartMode?: ZiweiChartMode },
  ): OperationResult<ZiweiCastingChart> {
    return this.adoptCasting(
      this.#call(34, [
        ...this.casting(options),
        integer(index, 0, 259199, "casting index"),
      ]),
    );
  }
  castingFromNumber(
    number: string,
    options: { gender: ZiweiGender; chartMode?: ZiweiChartMode },
  ): OperationResult<ZiweiCastingChart> {
    if (!/^[0-9]+$/.test(number))
      throw new TypeError("Casting number must be ASCII decimal text");
    return this.adoptCasting(
      this.#call(35, [...this.casting(options), ...encodeText(number)]),
    );
  }
  randomCastingChart(options: {
    gender: ZiweiGender;
    chartMode?: ZiweiChartMode;
  }): OperationResult<ZiweiCastingChart> {
    return this.adoptCasting(this.#call(36, this.casting(options)));
  }
  chartTimeFromUt1(
    ut1: Ut1JulianDate,
    policy: ZiweiClock = {},
  ): OperationResult<AstroDateTime> {
    sameScale(ut1, "UT1");
    const v = this.#call(25, [...clock(policy), ...jdValues(ut1)]);
    return result(
      decode<AstroDateTime>("taiyin_calendar_datetime", v, 32, this.time),
      new ResultFlags(v[0]!),
    );
  }
  chartTimeToUt1(
    time: AstroDateTime,
    policy: ZiweiClock = {},
  ): OperationResult<Ut1JulianDate> {
    const v = this.#call(26, [...clock(policy), ...dateValues(time)]);
    return result(
      new JulianDate(v[32]!, v[33]!, "UT1"),
      new ResultFlags(v[0]!),
    );
  }
  private step(
    op: number,
    ut1: Ut1JulianDate,
    options: { clock?: ZiweiClock; direction?: number; ratHourMode?: number },
  ): OperationResult<ZiweiClockTarget> {
    sameScale(ut1, "UT1");
    const v = this.#call(op, [
      ...clock(options.clock),
      ...jdValues(ut1),
      integer(options.ratHourMode ?? 0, 0, 2, "rat hour mode"),
      direction(options.direction ?? 1),
    ]);
    return result(
      Object.freeze({
        instantUt1: new JulianDate(v[32]!, v[33]!, "UT1"),
        virtualTime: decode<AstroDateTime>(
          "taiyin_calendar_datetime",
          v,
          34,
          this.time,
        ),
        ratHourSegment: v[40]!,
      }),
      new ResultFlags(v[0]!),
    );
  }
  stepFlowHourAtUt1(
    ut1: Ut1JulianDate,
    options: {
      clock?: ZiweiClock;
      direction?: number;
      ratHourMode?: number;
    } = {},
  ): OperationResult<ZiweiClockTarget> {
    return this.step(27, ut1, options);
  }
  stepFlowDayAtUt1(
    ut1: Ut1JulianDate,
    options: { clock?: ZiweiClock; direction?: number } = {},
  ): OperationResult<ZiweiClockTarget> {
    return this.step(28, ut1, options);
  }
  reverseLookupTier1AtUt1(options: {
    start: Ut1JulianDate;
    end: Ut1JulianDate;
    gender: ZiweiGender;
    clock?: ZiweiClock;
    birthOptions?: ZiweiBirthConfiguration;
    query: Partial<R.ZiweiReverseQuery>;
  }): OperationResult<readonly ZiweiReverseUt1Candidate[]> {
    sameScale(options.start, "UT1");
    sameScale(options.end, "UT1");
    const virtual = this.chartTimeFromUt1(options.start, options.clock).value;
    const q = encode("taiyin_ziwei_reverse_query", {
      lucunBranch: -1,
      hongluanBranch: -1,
      zuofuBranch: -1,
      youbiBranch: -1,
      wenchangBranch: -1,
      wenquBranch: -1,
      santaiBranch: -1,
      bazuoBranch: -1,
      ziweiBranch: -1,
      ...options.query,
    });
    const v = this.#call(32, [
      ...jdValues(options.start),
      ...jdValues(options.end),
      ...dateValues(virtual),
      integer(options.gender, 0, 1, "gender"),
      ...birth(options.birthOptions),
      ...q,
      ...clock(options.clock),
    ]);
    return result(
      Object.freeze(
        Array.from({ length: v[2]! }, (_, i) => {
          const record = decode<R.ZiweiReverseCandidate>(
            "taiyin_ziwei_reverse_candidate",
            v,
            32 + i * width("taiyin_ziwei_reverse_candidate"),
            this.time,
            "UT1",
          );
          const { instantUtc, ...fields } = record;
          if (!instantUtc)
            throw new Error("Reverse lookup returned no physical instant");
          return Object.freeze({
            ...fields,
            instantUt1: new JulianDate(
              instantUtc.dayNumber,
              instantUtc.dayFraction,
              "UT1",
            ),
          });
        }),
      ),
      new ResultFlags(v[0]!),
    );
  }
}

export class ZiweiChart {
  #closed = false;
  /** @internal */
  constructor(
    private readonly call: ChartCall,
    private readonly time: Time,
    private readonly calendar: ChineseCalendar,
    private readonly adopt: (reply: number[]) => OperationResult<ZiweiChart>,
    private readonly onClose: () => void,
  ) {}
  #use(op: number, input: number[] = []): number[] {
    if (this.#closed) throw new ClosedContextError("Ziwei chart is closed");
    return this.call(op, input);
  }
  get isClosed(): boolean {
    return this.#closed;
  }
  get anchors(): readonly number[] {
    return this.summary.anchors;
  }
  get placement(): {
    readonly input: R.ZiweiPlacementInput;
    readonly overrides: R.ZiweiPlacementPatch;
    readonly lifePalaceShift: number;
  } {
    const s = this.summary;
    return Object.freeze({
      input: s.input,
      overrides: s.overrides,
      lifePalaceShift: s.lifePalaceShift,
    });
  }
  get palaces(): readonly {
    readonly palace: number;
    readonly branch: number;
    readonly stem: number;
    readonly starIds: readonly number[];
  }[] {
    const s = this.summary;
    return Object.freeze(
      s.palaceBranches.map((branch, palace) =>
        Object.freeze({
          palace,
          branch,
          stem: s.palaceStems[palace]!,
          starIds: this.palaceStars(branch),
        }),
      ),
    );
  }
  close(): void {
    if (this.#closed) return;
    this.#use(11);
    this.#closed = true;
    this.onClose();
  }
  get summary(): ZiweiChartSummary {
    const v = this.#use(12);
    return Object.freeze({
      anchors: Object.freeze(v.slice(32, 63)),
      gender: v[63]!,
      bureau: v[64]!,
      bodyPalace: v[65]!,
      lifeMaster: v[66]!,
      bodyMaster: v[67]!,
      yearTransforms: decode<R.ZiweiTransformSet>(
        "taiyin_ziwei_transform_set",
        v,
        68,
      ),
      palaceBranches: Object.freeze(
        Array.from({ length: 12 }, (_, i) => v[72 + 2 * i]!),
      ),
      palaceStems: Object.freeze(
        Array.from({ length: 12 }, (_, i) => v[73 + 2 * i]!),
      ),
      input: decode<R.ZiweiPlacementInput>(
        "taiyin_ziwei_placement_input",
        v,
        96,
      ),
      overrides: decode<R.ZiweiPlacementPatch>(
        "taiyin_ziwei_placement_patch",
        v,
        101,
      ),
      lifePalaceShift: v[107]!,
    });
  }
  star(id: number): ZiweiStarPosition {
    const v = this.#use(13, [integer(id, 0, 65534, "star ID")]);
    return Object.freeze({
      branch: v[32]!,
      palace: v[33]!,
      brightness: v[34]!,
      transformationMask: v[35]!,
    });
  }
  starPosition(id: number): number | null {
    const branch = this.star(id).branch;
    return branch === 255 ? null : branch;
  }
  starPalace(id: number): number | null {
    const palace = this.star(id).palace;
    return palace === 255 ? null : palace;
  }
  brightness(id: number): number {
    return this.star(id).brightness;
  }
  transformMask(id: number): number {
    return this.star(id).transformationMask;
  }
  hasTransform(id: number, mark: number): boolean {
    return (
      (this.transformMask(id) &
        (1 << integer(mark, 0, 11, "transformation mark"))) !==
      0
    );
  }
  palaceStars(branch: number): readonly number[] {
    const v = this.#use(14, [integer(branch, 0, 11, "branch")]);
    return Object.freeze(v.slice(32));
  }
  modify(values: Partial<R.ZiweiPlacementPatch>): OperationResult<ZiweiChart> {
    return this.adopt(this.#use(15, patch(values)));
  }
  shiftLifePalace(steps: number): OperationResult<ZiweiChart> {
    return this.adopt(
      this.#use(16, [integer(steps, -2147483648, 2147483647, "steps")]),
    );
  }
  reset(): OperationResult<ZiweiChart> {
    return this.adopt(this.#use(17));
  }
  setFlowAtUt1(
    ut1: Ut1JulianDate,
    {
      clock: policy = {},
      options = {},
      level = ZiweiFlowLevel.hour,
    }: {
      clock?: ZiweiClock;
      options?: ZiweiFlowConfiguration;
      level?: ZiweiFlowLevel;
    } = {},
  ): OperationResult<R.ZiweiFlowSummary> {
    sameScale(ut1, "UT1");
    const v = this.#use(19, [
      ...jdValues(ut1),
      ...clock(policy),
      ...flow(options),
      integer(level, 0, 4, "flow level"),
    ]);
    return result(
      decode<R.ZiweiFlowSummary>("taiyin_ziwei_flow_summary", v),
      new ResultFlags(v[0]!),
    );
  }
  setFlowInstant(
    instant: UtcJulianDate | Date,
    {
      clock: policy = {},
      options = {},
      level = ZiweiFlowLevel.hour,
    }: {
      clock?: ZiweiClock;
      options?: ZiweiFlowConfiguration;
      level?: ZiweiFlowLevel;
    } = {},
  ): OperationResult<R.ZiweiFlowSummary> {
    const utc =
      instant instanceof Date ? UtcJulianDate.fromDate(instant) : instant;
    sameScale(utc, "UTC");
    clock(policy);
    if ((policy.mode ?? 0) !== 0) {
      const ut1 = this.time.utcToUt1(utc);
      const f = this.setFlowAtUt1(ut1.value, { clock: policy, options, level });
      return result(f.value, ut1.flags.union(f.flags));
    }
    const local = this.calendar.localFromInstant(utc);
    const v = this.#use(18, [
      ...jdValues(utc),
      ...dateValues(local.value),
      ...flow(options),
      integer(level, 0, 4, "flow level"),
    ]);
    return result(
      decode<R.ZiweiFlowSummary>("taiyin_ziwei_flow_summary", v),
      local.flags.union(new ResultFlags(v[0]!)),
    );
  }
  setFlowLocal(
    local: AstroDateTime,
    options: {
      clock?: ZiweiClock;
      options?: ZiweiFlowConfiguration;
      level?: ZiweiFlowLevel;
    } = {},
  ): OperationResult<R.ZiweiFlowSummary> {
    const utc = this.calendar.instantFromLocal(local);
    const f = this.setFlowInstant(utc.value, options);
    return result(f.value, utc.flags.union(f.flags));
  }
  /** Removes this level and every deeper flow layer. */
  truncateFlow(firstRemovedLevel: ZiweiFlowLevel): void {
    this.#use(20, [
      integer(firstRemovedLevel, 0, 4, "first removed flow level"),
    ]);
  }
  get flowLayerCount(): number {
    return this.#use(21)[32]!;
  }
  flowLayer(level: ZiweiFlowLevel): {
    readonly lifePalace: number;
    readonly stem: number;
    readonly branch: number;
    readonly transforms: R.ZiweiTransformSet;
  } {
    const v = this.#use(22, [integer(level, 0, 4, "flow level")]);
    return Object.freeze({
      lifePalace: v[32]!,
      stem: v[33]!,
      branch: v[34]!,
      transforms: decode<R.ZiweiTransformSet>(
        "taiyin_ziwei_transform_set",
        v,
        35,
      ),
    });
  }
  flowStarPosition(level: ZiweiFlowLevel, starId: number): number {
    return this.#use(23, [
      integer(level, 0, 4, "flow level"),
      integer(starId, 0, 65534, "star ID"),
    ])[32]!;
  }
  flowPalaceStars(level: ZiweiFlowLevel, branch: number): readonly number[] {
    return Object.freeze(
      this.#use(24, [
        integer(level, 0, 4, "flow level"),
        integer(branch, 0, 11, "branch"),
      ]).slice(32),
    );
  }
  omittedPlacements(): readonly R.ZiweiOmittedPlacement[] {
    const v = this.#use(45);
    return Object.freeze(
      Array.from({ length: v[2]! }, (_, i) =>
        decode<R.ZiweiOmittedPlacement>(
          "taiyin_ziwei_omitted_placement",
          v,
          32 + i * 2,
        ),
      ),
    );
  }
}
export class ZiweiCastingChart {
  #closed = false;
  #stars:
    | readonly {
        readonly branch: number;
        readonly transformationMask: number;
      }[]
    | undefined;
  /** @internal */
  constructor(
    private readonly call: ChartCall,
    private readonly time: Time,
    private readonly adopt: (
      reply: number[],
    ) => OperationResult<ZiweiCastingChart>,
    private readonly onClose: () => void,
  ) {}
  #use(op: number, input: number[] = []): number[] {
    if (this.#closed) throw new ClosedContextError("Casting chart is closed");
    return this.call(op, input);
  }
  get isClosed(): boolean {
    return this.#closed;
  }
  starPosition(id: number): number | null {
    const s = this.stars[integer(id, 0, this.stars.length - 1, "star ID")]!;
    return s.branch === 255 ? null : s.branch;
  }
  starPalace(id: number): number | null {
    const b = this.starPosition(id);
    return b === null ? null : this.summary.palaceBranches.indexOf(b);
  }
  transformMask(id: number): number {
    return this.stars[integer(id, 0, this.stars.length - 1, "star ID")]!
      .transformationMask;
  }
  hasTransform(id: number, mark: number): boolean {
    return (
      (this.transformMask(id) &
        (1 << integer(mark, 0, 11, "transformation mark"))) !==
      0
    );
  }
  palaceStars(branch: number): readonly number[] {
    integer(branch, 0, 11, "branch");
    return Object.freeze(
      this.stars.flatMap((s, i) => (s.branch === branch ? [i] : [])),
    );
  }
  close(): void {
    if (this.#closed) return;
    this.#use(37);
    this.#closed = true;
    this.onClose();
  }
  get summary(): R.ZiweiCastingSummary {
    return decode<R.ZiweiCastingSummary>(
      "taiyin_ziwei_casting_summary",
      this.#use(38),
    );
  }
  get number(): string {
    const v = this.#use(38);
    return decodeText(v, 32 + width("taiyin_ziwei_casting_summary")).value;
  }
  get stars(): readonly {
    readonly branch: number;
    readonly transformationMask: number;
  }[] {
    if (this.#closed) throw new ClosedContextError("Casting chart is closed");
    if (this.#stars) return this.#stars;
    const v = this.#use(39);
    return (this.#stars = Object.freeze(
      Array.from({ length: v[2]! }, (_, i) =>
        Object.freeze({
          branch: v[32 + i * 2]!,
          transformationMask: v[33 + i * 2]!,
        }),
      ),
    ));
  }
  brightness(id: number): number {
    return this.#use(40, [integer(id, 0, 65534, "star ID")])[32]!;
  }
  omittedPlacements(): readonly R.ZiweiOmittedPlacement[] {
    const v = this.#use(41);
    return Object.freeze(
      Array.from({ length: v[2]! }, (_, i) =>
        decode<R.ZiweiOmittedPlacement>(
          "taiyin_ziwei_omitted_placement",
          v,
          32 + i * 2,
        ),
      ),
    );
  }
  modify(
    values: Partial<R.ZiweiPlacementPatch>,
  ): OperationResult<ZiweiCastingChart> {
    return this.adopt(this.#use(42, patch(values)));
  }
  shiftLifePalace(steps: number): OperationResult<ZiweiCastingChart> {
    return this.adopt(
      this.#use(43, [integer(steps, -2147483648, 2147483647, "steps")]),
    );
  }
  reset(): OperationResult<ZiweiCastingChart> {
    return this.adopt(this.#use(44));
  }
}

/** @internal */
export function createZiwei(
  host: ContextHost,
  time: Time,
  calendar: ChineseCalendar,
  config: ZiweiConfiguration,
  onClose: () => void,
): ZiweiContext {
  return withCalendar(calendar, host, (h) => {
    if (config.ruleset && config.ruleModules)
      throw new TypeError("Pass ruleset or ruleModules, not both");
    const build = (catalog: number, owned: boolean): ZiweiContext => {
      try {
        const s = config.selection ?? {};
        const entries: [number, string, string][] = [];
        for (const [component, values, all] of [
          [0, s.placement, s.placementDefault],
          [1, s.brightness, s.brightnessDefault],
          [2, s.sihua, s.sihuaDefault],
        ] as const) {
          if (all) entries.push([component, "", all]);
          for (const [key, value] of Object.entries(values ?? {}))
            entries.push([component, key, value]);
        }
        if (s.masters) entries.push([3, "", s.masters]);
        if (s.longevity) entries.push([4, "", s.longevity]);
        const payload = [entries.length];
        for (const [component, key, value] of entries)
          payload.push(
            component,
            ...encodeText(key, true),
            ...encodeText(value),
          );
        const modules = config.ruleset?.modules ?? config.ruleModules ?? [];
        payload.push(modules.length);
        const labels = new Set<string>();
        for (const m of modules) {
          if (labels.has(m.label))
            throw new Error(`Duplicate rule module: ${m.label}`);
          labels.add(m.label);
          for (const value of [
            m.label,
            m.starsJson ?? "",
            m.brightnessJson ?? "",
            m.sihuaJson ?? "",
            m.flowJson ?? "",
            m.mastersJson ?? "",
          ])
            payload.push(...encodeText(value, true));
        }
        const v = host.wire.checked(
          host.wire.structured(
            "_taiyin_web_ziwei",
            [catalog, 0, h, 4],
            payload,
          ),
        );
        return new ZiweiContext(
          host,
          time,
          calendar,
          v[32]!,
          owned ? catalog : 0,
          onClose,
        );
      } catch (error) {
        if (owned)
          host.wire.checked(
            host.wire.structured("_taiyin_web_ziwei", [catalog, 0, 0, 1], []),
          );
        throw error;
      }
    };
    if (config.catalog)
      return withZiweiCatalog(config.catalog, host, (c) => build(c, false));
    const catalog = host.wire.checked(
      host.wire.structured(
        "_taiyin_web_ziwei",
        [0, 0, 0, 0],
        encodeText("/taiyin/ziwei/rules/default.toml"),
      ),
    )[32]!;
    return build(catalog, true);
  });
}
