import * as errors from "../errors.js";
import {
  ResultFlags,
  type EphemerisDiagnostic,
  integer,
  text,
} from "../models.js";

interface WasmFS {
  mkdirTree(path: string): void;
  writeFile(path: string, data: Uint8Array): void;
  unlink(path: string): void;
  analyzePath(path: string): { exists: boolean };
}
export interface WasmModule {
  HEAPF64: Float64Array;
  HEAPU8: Uint8Array;
  FS: WasmFS;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  UTF8ToString(pointer: number): string;
  [key: string]: unknown;
}
export interface WasmInitializationOptions {
  /** Trusted Emscripten loader URL; not an ephemeris data URL. */
  wasmModuleUri?: string | URL;
  /** Supply the factory when a bundler manages the Emscripten loader. */
  moduleFactory?: (options: {
    locateFile: (name: string) => string;
  }) => unknown | Promise<unknown>;
}
type ModuleFactory = NonNullable<WasmInitializationOptions["moduleFactory"]>;
const factories = new Map<string, Promise<ModuleFactory>>();
const ownedModules = new WeakSet<object>();
let browserQueue: Promise<void> = Promise.resolve();
function browserFactory(uri: URL): Promise<ModuleFactory> {
  const job = browserQueue.then(async () => {
    if (typeof document === "undefined")
      throw new Error("In a Worker, pass moduleFactory explicitly");
    const scope = globalThis as unknown as {
      createTaiyinModule: ModuleFactory | undefined;
    };
    const previous = scope.createTaiyinModule;
    scope.createTaiyinModule = undefined;
    const script = document.createElement("script");
    script.src = uri.href;
    try {
      return await new Promise<ModuleFactory>((resolve, reject) => {
        script.onload = () => {
          if (typeof scope.createTaiyinModule !== "function")
            reject(new Error("Missing createTaiyinModule factory"));
          else resolve(scope.createTaiyinModule);
        };
        script.onerror = () =>
          reject(new Error(`Cannot load Wasm loader: ${uri.href}`));
        document.head.append(script);
      });
    } finally {
      script.remove();
      scope.createTaiyinModule = previous;
    }
  });
  browserQueue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export async function loadModule(
  options: WasmInitializationOptions,
): Promise<WasmModule> {
  const uri = new URL(
    options.wasmModuleUri ?? "../../assets/taiyin_web.js",
    import.meta.url,
  );
  const node = typeof process !== "undefined" && !!process.versions?.node;
  let factory = options.moduleFactory;
  if (!factory) {
    let pending = factories.get(uri.href);
    if (!pending) {
      pending = (async () => {
        if (node) {
          if (uri.protocol !== "file:")
            throw new TypeError("Node requires a local Wasm loader URL");
          const { createRequire } = await import("node:module");
          return createRequire(import.meta.url)(
            (await import("node:url")).fileURLToPath(uri),
          ) as ModuleFactory;
        }
        return browserFactory(uri);
      })();
      factories.set(uri.href, pending);
      void pending.catch(() => factories.delete(uri.href));
    }
    factory = await pending;
  }
  if (typeof factory !== "function")
    throw new TypeError("Expected an Emscripten module factory");
  const filePath = node ? (await import("node:url")).fileURLToPath : undefined;
  const value = await factory({
    locateFile: (name) => {
      const asset = new URL(name, uri);
      // Emscripten's Node loader expects a filesystem path, not file://.
      return filePath && asset.protocol === "file:"
        ? filePath(asset)
        : asset.href;
    },
  });
  if (!value || typeof value !== "object")
    throw new TypeError("Invalid Wasm module");
  if (ownedModules.has(value))
    throw new Error("Each Ephemeris must own a fresh Wasm module instance");
  const module = value as WasmModule;
  const wire = new Wire(module);
  if (
    wire.invoke("_taiyin_web_bridge_version") !== 1 ||
    wire.invoke("_taiyin_get_c_abi_version") !== 11
  )
    throw new Error("Incompatible Taiyin Wasm bridge or C ABI");
  ownedModules.add(value);
  return module;
}

/** Private transport. Values are copied out before either allocation is freed. */
export class Wire {
  constructor(readonly module: WasmModule) {}
  invoke(name: string, ...args: number[]): number {
    const fn = this.module[name];
    if (typeof fn !== "function")
      throw new Error(`Wasm export missing: ${name}`);
    return (fn as (...args: number[]) => number)(...args);
  }
  bytes<T>(value: Uint8Array, callback: (pointer: number) => T): T {
    const pointer = this.module._malloc(Math.max(1, value.length));
    if (!pointer) throw new RangeError("Wasm allocation failed");
    try {
      this.module.HEAPU8.set(value, pointer);
      return callback(pointer);
    } finally {
      this.module._free(pointer);
    }
  }
  string<T>(value: string, callback: (pointer: number) => T): T {
    return this.bytes(new TextEncoder().encode(`${text(value)}\0`), callback);
  }
  fixed(
    name: string,
    prefix: readonly number[],
    input: readonly number[] = [],
    outputSize = 32,
    inputUsed = true,
  ): { status: number; values: number[] } {
    integer(outputSize, 1, 3200000, "output size");
    return this.bytes(
      new Uint8Array(Math.max(32, input.length) * 8),
      (pointer) => {
        this.module.HEAPF64.set(input, pointer / 8);
        return this.bytes(new Uint8Array(outputSize * 8), (output) => {
          const status = this.invoke(
            name,
            ...prefix,
            ...(inputUsed ? [pointer] : []),
            output,
          );
          return {
            status,
            values: Array.from(
              this.module.HEAPF64.subarray(output / 8, output / 8 + outputSize),
            ),
          };
        });
      },
    );
  }
  structured(
    name: string,
    prefix: readonly number[],
    input: readonly number[],
  ): { status: number; values: number[] } {
    return this.bytes(
      new Uint8Array(Math.max(1, input.length) * 8),
      (pointer) => {
        this.module.HEAPF64.set(input, pointer / 8);
        const reply = this.invoke(name, ...prefix, pointer, input.length);
        if (!reply) throw new RangeError("Wasm reply allocation failed");
        try {
          const size = this.invoke("_taiyin_web_eclipse_length", reply);
          integer(size, 32, 100000000, "Wasm reply size");
          const data = this.invoke("_taiyin_web_eclipse_data", reply);
          const values = Array.from(
            this.module.HEAPF64.subarray(data / 8, data / 8 + size),
          );
          return { status: values[1]!, values };
        } finally {
          this.invoke("_taiyin_web_eclipse_destroy", reply);
        }
      },
    );
  }
  checked(
    reply: { status: number; values: number[] },
    diagnosticOffset?: number,
    diagnostics?: readonly EphemerisDiagnostic[],
  ): number[] {
    const take = this.module.taiyinTakeAstronomyError as
      undefined | (() => { error: unknown } | undefined);
    const callbackError = take?.();
    if (callbackError) throw callbackError.error;
    if (reply.status === 0) return reply.values;
    const d =
      diagnosticOffset === undefined
        ? undefined
        : diagnostic(reply.values, diagnosticOffset);
    const name = this.module.UTF8ToString(
      this.invoke("_taiyin_status_name", reply.status),
    );
    const message = this.module.UTF8ToString(
      this.invoke("_taiyin_status_message", reply.status),
    );
    const classes: Record<number, typeof errors.EphemerisError> = {
      [-1]: errors.InvalidArgumentError,
      [-2]: errors.EphemerisOutOfMemoryError,
      [-3]: errors.InternalCalculationError,
      [-4]: errors.UnsupportedOperationError,
      [-3001]: errors.EarthOrientationDataError,
      [-3002]: errors.LeapSecondDataError,
    };
    const category = this.invoke("_taiyin_status_category", reply.status);
    const categories: Record<number, typeof errors.EphemerisError> = {
      10: errors.EphemerisRouteError,
      20: errors.DataFileError,
      30: errors.TimeScaleError,
      40: errors.ObserverError,
      50: errors.EventSearchError,
      60: errors.RuntimeServiceError,
    };
    const ErrorType =
      classes[reply.status] ??
      categories[category] ??
      errors.UnknownNativeError;
    throw new ErrorType(
      reply.status,
      name,
      message,
      new ResultFlags(reply.values[0] ?? 0),
      d,
      diagnostics ?? (d ? [d] : []),
    );
  }
}
export function diagnostic(
  values: readonly number[],
  offset = 0,
): EphemerisDiagnostic {
  const v = (i: number) => values[offset + i]!;
  return Object.freeze({
    status: v(10),
    targetId: v(11),
    centerId: v(12),
    frame: v(13),
    jdTdb: Object.freeze([v(14), v(15)]) as readonly [number, number],
    candidateCount: v(16),
    attemptedMethodId: v(17),
    nearestCoverageStart: v(18),
    nearestCoverageEnd: v(19),
    componentTargetId: v(20),
    componentCenterId: v(21),
    componentMethodId: v(22),
    timeScaleRoute: v(23),
    timeScaleFallbackReason: v(24),
    timeScaleFlags: v(25),
    taiMinusUtcSeconds: v(26),
    dut1Seconds: v(27),
    deltaTSeconds: v(28),
  });
}

export interface ContextHost {
  readonly wire: Wire;
  readonly handle: number;
  run<T>(callback: () => T): T;
  record(values: readonly number[], offset?: number): void;
}
export interface RuntimeResourceHost {
  readonly wire: Wire;
  run<T>(callback: () => T): T;
  own(value: { close(): void }): void;
  forget(value: { close(): void }): void;
}
