import { recordSchemas } from "./records.generated.js";
import { astronomySchemas } from "./astronomy-records.generated.js";
import {
  AstroDateTime,
  JulianDate,
  dateValues,
  jdValues,
  sameScale,
  readDate,
  type TimeScale,
} from "../date.js";
import { finite, integer, text } from "../models.js";
import type { Time } from "../time.js";
type SchemaField = {
  readonly key: string;
  readonly type: string;
  readonly shape: readonly number[];
};
const schemas: Readonly<Record<string, readonly SchemaField[]>> = {
  ...recordSchemas,
  ...astronomySchemas,
};
export function width(name: string): number {
  if (name === "taiyin_split_julian_date") return 2;
  if (name === "taiyin_calendar_datetime") return 6;
  const fields = schemas[name];
  if (!fields) throw new Error(`Unknown record: ${name}`);
  return fields.reduce(
    (n, f) =>
      n +
      f.shape.reduce((n, d) => n * d, 1) *
        (schemas[f.type]
          ? width(f.type)
          : f.type === "taiyin_split_julian_date"
            ? 2
            : f.type === "taiyin_calendar_datetime"
              ? 6
              : f.type === "uint64_t"
                ? 2
                : 1),
    0,
  );
}
function scale(key: string, fallback: TimeScale): TimeScale {
  return /utc/i.test(key)
    ? "UTC"
    : /Ut1/.test(key)
      ? "UT1"
      : /Tdb/.test(key)
        ? "TDB"
        : /Tt/.test(key)
          ? "TT"
          : fallback;
}
function scalar(value: unknown, type: string): number {
  if (typeof value !== "number")
    throw new TypeError(`Expected numeric ${type}`);
  if (type === "double" || type === "float")
    return finite(value, "record number");
  const ranges: Record<string, readonly [number, number]> = {
    uint8_t: [0, 255],
    uint16_t: [0, 65535],
    uint32_t: [0, 4294967295],
    int32_t: [-2147483648, 2147483647],
    taiyin_ganzhi: [0, 255],
    int64_t: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    size_t: [0, 4294967295],
    taiyin_bool: [0, 255],
    taiyin_status: [-2147483648, 2147483647],
  };
  const range = ranges[type];
  if (!range) throw new Error(`Unsupported scalar type: ${type}`);
  return integer(value, range[0], range[1], type);
}
export function encode(
  name: string,
  value: unknown,
  fallback: TimeScale = "TT",
  allowNaN = false,
): number[] {
  if (name === "taiyin_split_julian_date") {
    if (value === null) return [0, NaN];
    if (!(value instanceof JulianDate))
      throw new TypeError("Expected JulianDate");
    sameScale(value, fallback);
    return jdValues(value);
  }
  if (name === "taiyin_calendar_datetime") {
    if (!(value instanceof AstroDateTime))
      throw new TypeError("Expected AstroDateTime");
    return dateValues(value);
  }
  const fields = schemas[name];
  if (!fields) throw new Error(`Unknown record: ${name}`);
  if (!value || typeof value !== "object")
    throw new TypeError(`Expected ${name} object`);
  const object = value as Record<string, unknown>;
  const output: number[] = [];
  const emit = (field: SchemaField, v: unknown, depth: number): void => {
    if (depth < field.shape.length) {
      if (!Array.isArray(v) || v.length !== field.shape[depth])
        throw new RangeError(`${field.key} has incorrect array shape`);
      for (const item of v) emit(field, item, depth + 1);
    } else if (
      schemas[field.type] ||
      field.type === "taiyin_split_julian_date" ||
      field.type === "taiyin_calendar_datetime"
    )
      output.push(
        ...encode(field.type, v, scale(field.key, fallback), allowNaN),
      );
    else if (field.type === "uint64_t")
      output.push(...uint64(v as number | bigint));
    else if (
      allowNaN &&
      field.type === "double" &&
      typeof v === "number" &&
      Number.isNaN(v)
    )
      output.push(NaN);
    else output.push(scalar(v, field.type));
  };
  for (const field of fields) emit(field, object[field.key], 0);
  return output;
}
export function decode<T>(
  name: string,
  values: readonly number[],
  offset = 32,
  time?: Time,
  fallback: TimeScale = "TT",
): T {
  if (offset + width(name) > values.length)
    throw new RangeError("Truncated Wasm record");
  let cursor = offset;
  const read = (type: string, key: string): unknown => {
    if (type === "taiyin_split_julian_date") {
      const day = values[cursor]!,
        fraction = values[cursor + 1]!;
      cursor += 2;
      return Number.isNaN(fraction)
        ? null
        : new JulianDate(day, fraction, scale(key, fallback));
    }
    if (type === "taiyin_calendar_datetime") {
      const at = cursor;
      cursor += 6;
      if (Math.round(values[at + 5]! * 1e9) >= 60e9 && time) {
        const base = new AstroDateTime(
          values[at]!,
          values[at + 1]!,
          values[at + 2]!,
          values[at + 3]!,
          values[at + 4]!,
        );
        return time.reverseJulianDay(
          time.julianDay(base, "UT1").value.addSeconds(values[at + 5]!),
        ).value;
      }
      return readDate(values, at);
    }
    if (type === "uint64_t") {
      const low = values[cursor++]!;
      const high = values[cursor++]!;
      return BigInt(low) | (BigInt(high) << 32n);
    }
    if (!schemas[type]) return values[cursor++]!;
    const object: Record<string, unknown> = {};
    for (const field of schemas[type]!) {
      const dim = (depth: number): unknown =>
        depth === field.shape.length
          ? read(field.type, field.key)
          : Object.freeze(
              Array.from({ length: field.shape[depth]! }, () => dim(depth + 1)),
            );
      object[field.key] = dim(0);
    }
    return Object.freeze(object);
  };
  return read(name, "") as T;
}
export function encodeText(value: string, allowEmpty = false): number[] {
  const bytes = new TextEncoder().encode(text(value, "text", allowEmpty));
  return [bytes.length, ...bytes];
}
export function decodeText(
  values: readonly number[],
  offset: number,
): { value: string; next: number } {
  const size = integer(
    values[offset]!,
    0,
    values.length - offset - 1,
    "text length",
  );
  const bytes = values
    .slice(offset + 1, offset + 1 + size)
    .map((v) => integer(v, 0, 255, "UTF-8 byte"));
  return {
    value: new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(bytes),
    ),
    next: offset + 1 + size,
  };
}
export function uint64(value: bigint | number): number[] {
  const mask =
    typeof value === "bigint"
      ? value
      : BigInt(integer(value, 0, Number.MAX_SAFE_INTEGER, "64-bit mask"));
  if (mask < 0n || mask > 0xffffffffffffffffn)
    throw new RangeError("Mask must fit uint64");
  return [Number(mask & 0xffffffffn), Number(mask >> 32n)];
}
