import {
  astronomyOperations,
  astronomyProtocolId,
} from "./astronomy-operations.generated.js";
import { decode, encode, encodeText, uint64, width } from "./records.js";
import {
  JulianDate,
  dateValues,
  jdValues,
  sameScale,
  type TimeScale,
} from "../date.js";
import {
  finite,
  integer,
  result,
  ResultFlags,
  type OperationResult,
} from "../models.js";
import type { ContextHost } from "./wasm.js";
interface Argument {
  name: string;
  type: string;
  string?: boolean;
  record?: boolean;
  optional?: boolean;
  arrayInput?: boolean;
  capacity?: boolean;
}
interface Output {
  name: string;
  type: string;
  array?: boolean;
  tuple?: number;
}
interface Operation {
  id: number;
  name: string;
  inputs: readonly Argument[];
  outputs: readonly Output[];
  capacity: boolean;
  args: readonly { type: string }[];
}
const operations: readonly Operation[] = astronomyOperations;
function scaleFor(key: string, fallback: TimeScale): TimeScale {
  return /utc/.test(key)
    ? "UTC"
    : /tdb/.test(key)
      ? "TDB"
      : /_ut1\b|_ut\b/.test(key)
        ? "UT1"
        : /_tt\b/.test(key)
          ? "TT"
          : fallback;
}
function scalar(v: unknown, type: string): number {
  if (typeof v === "bigint" && (type === "uint32_t" || type === "int32_t")) {
    if (v < 0n || v > 0xffffffffn)
      throw new RangeError("Flags must fit uint32");
    v = Number(v);
  }
  if (typeof v !== "number") throw new TypeError(`Expected ${type} number`);
  if (type === "double") return finite(v, "argument");
  const limits: Record<string, readonly [number, number]> = {
    size_t: [0, 100000],
    int32_t: [-2147483648, 2147483647],
    uint32_t: [0, 4294967295],
    uint8_t: [0, 255],
    taiyin_bool: [0, 1],
  };
  const range = limits[type];
  if (!range) throw new Error(`Unrecognized argument type ${type}`);
  return integer(v, ...range, "argument");
}
/** Private field-wise adapter. Never exposes a Wasm allocation or C pointer. */
export class AstronomyTransport {
  constructor(private readonly host: ContextHost) {}
  call<T>(
    id: number,
    params: Readonly<Record<string, unknown>>,
  ): OperationResult<T> {
    return this.host.run(() => {
      if (
        this.host.wire.invoke("_taiyin_web_astronomy_version") !==
        astronomyProtocolId
      )
        throw Error(
          "Wasm astronomy protocol mismatch: rebuild the JS and Wasm together",
        );
      const op =
        operations[integer(id, 0, operations.length - 1, "operation")]!;
      const fallback: TimeScale = op.name.endsWith("_ut") ? "UT1" : "TT";
      const input: number[] = [];
      const emit = (a: Argument, value: unknown) => {
        if (a.string) {
          input.push(...encodeText(value as string));
          return;
        }
        if (a.type === "uint64_t") {
          input.push(...uint64(value as number | bigint));
          return;
        }
        if (a.type === "taiyin_split_julian_date") {
          if (!(value instanceof JulianDate))
            throw new TypeError("Expected a typed JulianDate");
          if (a.name !== "reference_epoch_jd")
            sameScale(value, scaleFor(a.name, fallback));
          input.push(...jdValues(value));
          return;
        }
        if (a.type === "taiyin_calendar_datetime") {
          input.push(...dateValues(value as never));
          return;
        }
        if (a.record || (a.arrayInput && a.type.startsWith("taiyin_"))) {
          if (a.name === "conditions")
            value = {
              extinctionMagPerAirmass: NaN,
              skyBrightnessNanolambert: NaN,
              nightSkyBrightnessNanolambert: NaN,
              ...(value as object),
            };
          input.push(...encode(a.type, value, fallback, true));
          return;
        }
        input.push(scalar(value, a.type));
      };
      for (const a of op.inputs) {
        const v = params[a.name];
        if (a.optional) {
          input.push(v == null ? 0 : 1);
          if (v == null) continue;
        }
        if (a.arrayInput) {
          if (!Array.isArray(v)) throw new TypeError("Expected an input array");
          input.push(integer(v.length, 0, 100000, "array length"));
          for (const item of v) emit(a, item);
        } else emit(a, v);
      }
      const reply = this.host.wire.structured(
        "_taiyin_web_astronomy",
        [this.host.handle, id],
        input,
      );
      if (op.args.some((a) => a.type === "taiyin_ephemeris_diagnostic"))
        this.host.record(reply.values);
      const v = this.host.wire.checked(
        reply,
        op.args.some((a) => a.type === "taiyin_ephemeris_diagnostic")
          ? 0
          : undefined,
      );
      let cursor = 32;
      const take = (o: Output): unknown => {
        if (
          o.type === "double" ||
          o.type === "size_t" ||
          o.type === "taiyin_bool"
        ) {
          if (o.tuple)
            return Object.freeze(v.slice(cursor, (cursor += o.tuple)));
          return v[cursor++];
        }
        const value = decode(o.type, v, cursor, undefined, fallback);
        cursor += width(o.type);
        return value;
      };
      const read = () => {
        if (op.outputs.length === 0) return undefined;
        if (op.outputs.length === 1) return take(op.outputs[0]!);
        const coordinate = take(op.outputs[0]!);
        const secondary = take(op.outputs[1]!);
        return Object.freeze({
          coordinate,
          [op.outputs[1]!.name === "out_longitude_rad"
            ? "longitudeRad"
            : "targetAspectRad"]: secondary,
        });
      };
      const value = op.capacity
        ? Object.freeze(
            Array.from(
              { length: integer(v[2]!, 0, 100000, "result count") },
              read,
            ),
          )
        : read();
      if (cursor !== v.length)
        throw new Error("Unexpected astronomy reply size");
      return result(value as T, new ResultFlags(v[0]!));
    });
  }
}
