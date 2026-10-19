import { JulianDate, type TdbJulianDate, type TtJulianDate } from "./date.js";
import { integer, finite, type CartesianState } from "./models.js";
import { uint64 } from "./internal/records.js";
import type { RuntimeResourceHost, Wire } from "./internal/wasm.js";
import { astronomyProtocolId } from "./internal/astronomy-operations.generated.js";
export interface CustomTargetInput {
  readonly targetId: number;
  readonly tdb: TdbJulianDate;
  readonly tt: TtJulianDate;
  readonly flags: number;
}
export interface CustomTargetModel {
  targetId: number;
  evaluatePosition: (input: CustomTargetInput) => readonly number[];
  evaluateState?: (input: CustomTargetInput) => CartesianState;
}
export interface CustomAyanamshaModel {
  modelId: number;
  referencePrecessionModelId?: number;
  evaluate: (input: {
    readonly tt: TtJulianDate;
    readonly flags: bigint;
  }) => number;
}
export interface CustomHouseInput {
  readonly armcRad: number;
  readonly observerLatitudeRad: number;
  readonly trueObliquityRad: number;
  readonly ascendantRad: number;
  readonly midheavenRad: number;
}
export interface CustomHouseSystemModel {
  modelId: number;
  fallbackModelId?: number;
  evaluate: (input: CustomHouseInput) => readonly number[] | null;
}
interface Entry {
  token: number;
  kind: number;
  id: number;
  model:
    | CustomTargetModel
    | CustomAyanamshaModel
    | CustomHouseSystemModel
    | undefined;
  busy: boolean;
}
const registries = new WeakMap<Wire, Registry>();
function synchronous<T>(value: T): T {
  if (value instanceof Promise) {
    void value.catch(() => {});
    throw new TypeError("Custom model callbacks must be synchronous");
  }
  return value;
}
class Registry {
  next = 1;
  readonly entries = new Map<number, Entry>();
  pending: { error: unknown } | undefined;
  constructor(readonly wire: Wire) {
    wire.module.taiyinTakeAstronomyError = () => {
      const error = this.pending;
      this.pending = undefined;
      return error;
    };
    wire.module.taiyinAstronomyCallback = (
      kind: number,
      token: number,
      pointer: number,
      count: number,
      output: number,
      capacity: number,
    ) => {
      const e = this.entries.get(token);
      if (!e) return -1;
      if (this.pending) return -1;
      if (e.busy) {
        this.pending = {
          error: new Error("Recursive custom-model evaluation"),
        };
        return -1;
      }
      e.busy = true;
      try {
        // Read all values before invoking user code: nested calls may grow memory.
        const input = Array.from(
          wire.module.HEAPF64.subarray(pointer / 8, pointer / 8 + count),
        );
        let values: readonly number[];
        if (kind === 0 || kind === 1) {
          const model = e.model as CustomTargetModel;
          const request = Object.freeze({
            targetId: input[0]!,
            tdb: new JulianDate(input[1]!, input[2]!, "TDB"),
            tt: new JulianDate(input[3]!, input[4]!, "TT"),
            flags: input[5]!,
          });
          if (kind === 0) values = synchronous(model.evaluatePosition(request));
          else {
            const state = synchronous(model.evaluateState!(request));
            values = [
              state.positionAu.x,
              state.positionAu.y,
              state.positionAu.z,
              state.velocityAuPerDay.x,
              state.velocityAuPerDay.y,
              state.velocityAuPerDay.z,
              state.accelerationAuPerDay2.x,
              state.accelerationAuPerDay2.y,
              state.accelerationAuPerDay2.z,
            ];
          }
        } else if (kind === 2) {
          const answer = synchronous(
            (e.model as CustomAyanamshaModel).evaluate(
              Object.freeze({
                tt: new JulianDate(input[0]!, input[1]!, "TT"),
                flags: BigInt(input[2]!) | (BigInt(input[3]!) << 32n),
              }),
            ),
          );
          values = [answer];
        } else if (kind === 3) {
          const answer = synchronous(
            (e.model as CustomHouseSystemModel).evaluate(
              Object.freeze({
                armcRad: input[0]!,
                observerLatitudeRad: input[1]!,
                trueObliquityRad: input[2]!,
                ascendantRad: input[3]!,
                midheavenRad: input[4]!,
              }),
            ),
          );
          if (answer === null) return -1;
          values = answer;
        } else throw Error("Unknown custom callback kind");
        if (!Array.isArray(values) || values.length !== capacity)
          throw new TypeError(
            `Custom callback must return ${capacity} numbers synchronously`,
          );
        const validated = values.map((n) => finite(n, "callback result"));
        wire.module.HEAPF64.set(validated, output / 8);
        return 0;
      } catch (error) {
        this.pending = { error };
        return -1;
      } finally {
        e.busy = false;
      }
    };
  }
}
/** Owns a callback registration. Close only after evaluations have completed. */
export class CustomModelRegistration {
  #closed = false;
  /** @internal */
  constructor(
    private readonly host: RuntimeResourceHost,
    private readonly registry: Registry,
    private readonly entry: Entry,
    private readonly registration: bigint,
  ) {
    host.own(this);
  }
  get isClosed(): boolean {
    return this.#closed;
  }
  close(): void {
    if (this.#closed) return;
    this.host.run(() => {
      if (this.entry.busy) throw Error("Cannot close a running custom model");
      this.host.wire.checked(
        this.host.wire.structured(
          "_taiyin_web_astronomy_callbacks",
          [1],
          [this.entry.kind, this.entry.id, ...uint64(this.registration)],
        ),
      );
      this.#closed = true;
      this.registry.entries.delete(this.entry.token);
      this.entry.model = undefined;
      this.host.forget(this);
    });
  }
}
/** @internal The supplied host rejects mutation while the runtime is evaluating. */
export function registerCustomModel(
  host: RuntimeResourceHost,
  kind: number,
  model: CustomTargetModel | CustomAyanamshaModel | CustomHouseSystemModel,
): CustomModelRegistration {
  return host.run(() => {
    if (
      host.wire.invoke("_taiyin_web_astronomy_version") !== astronomyProtocolId
    )
      throw Error("Wasm astronomy protocol mismatch");
    let registry = registries.get(host.wire);
    if (!registry) {
      registry = new Registry(host.wire);
      registries.set(host.wire, registry);
    }
    const id =
      kind === 0
        ? integer(
            (model as CustomTargetModel).targetId,
            -2147483648,
            -1,
            "custom target ID",
          )
        : integer(
            (model as CustomAyanamshaModel).modelId,
            10000,
            2147483647,
            "custom model ID",
          );
    if (
      [...registry.entries.values()].some((e) => e.kind === kind && e.id === id)
    )
      throw Error("Custom model ID already registered");
    const snapshot = Object.freeze({ ...model });
    const fn =
      kind === 0
        ? (snapshot as CustomTargetModel).evaluatePosition
        : (snapshot as CustomAyanamshaModel).evaluate;
    if (
      typeof fn !== "function" ||
      (kind === 0 &&
        (snapshot as CustomTargetModel).evaluateState !== undefined &&
        typeof (snapshot as CustomTargetModel).evaluateState !== "function")
    )
      throw new TypeError("Expected synchronous callback functions");
    const token = integer(registry.next++, 1, 2147483647, "callback token");
    const entry: Entry = { token, kind, id, model: snapshot, busy: false };
    const reference =
      kind === 1
        ? integer(
            (model as CustomAyanamshaModel).referencePrecessionModelId ?? 0,
            0,
            2147483647,
            "reference precession model",
          )
        : kind === 2
          ? integer(
              (model as CustomHouseSystemModel).fallbackModelId ?? 2,
              0,
              2147483647,
              "fallback house system",
            )
          : 0;
    const reply = host.wire.checked(
      host.wire.structured(
        "_taiyin_web_astronomy_callbacks",
        [0],
        [
          kind,
          id,
          token,
          reference,
          +(kind === 0 && !!(snapshot as CustomTargetModel).evaluateState),
        ],
      ),
    );
    registry.entries.set(token, entry);
    return new CustomModelRegistration(
      host,
      registry,
      entry,
      BigInt(reply[32]!) | (BigInt(reply[33]!) << 32n),
    );
  });
}
