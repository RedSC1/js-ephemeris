import { integer, finite } from "./models.js";
export type TimeScale =
  "UTC" | "TAI" | "TT" | "UT1" | "TDB" | "LOCAL_MEAN" | "LOCAL_APPARENT";
/** Split Julian date. A time scale is a label, never an implicit conversion. */
export class JulianDate<S extends TimeScale = TimeScale> {
  readonly dayNumber: number;
  readonly dayFraction: number;
  constructor(
    dayNumber: number,
    dayFraction: number,
    readonly scale: S,
  ) {
    if (
      ![
        "UTC",
        "TAI",
        "TT",
        "UT1",
        "TDB",
        "LOCAL_MEAN",
        "LOCAL_APPARENT",
      ].includes(scale)
    )
      throw new TypeError("Unknown Julian-date time scale");
    integer(
      dayNumber,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      "Julian day",
    );
    finite(dayFraction, "Julian fraction");
    const carry = Math.floor(dayFraction);
    this.dayNumber = integer(
      dayNumber + carry,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      "Julian day",
    );
    this.dayFraction = dayFraction - carry;
    Object.freeze(this);
  }
  addSeconds(seconds: number): JulianDate<S> {
    return new JulianDate(
      this.dayNumber,
      this.dayFraction + finite(seconds, "seconds") / 86400,
      this.scale,
    );
  }
  addDays(days: number): JulianDate<S> {
    return new JulianDate(
      this.dayNumber,
      this.dayFraction + finite(days, "days"),
      this.scale,
    );
  }
  compareTo(other: JulianDate<S>): number {
    sameScale(other, this.scale);
    return (
      Math.sign(this.dayNumber - other.dayNumber) ||
      Math.sign(this.dayFraction - other.dayFraction)
    );
  }
  daysUntil(other: JulianDate<S>): number {
    sameScale(other, this.scale);
    return (
      other.dayNumber - this.dayNumber + other.dayFraction - this.dayFraction
    );
  }
  toDouble(): number {
    return this.dayNumber + this.dayFraction;
  }
}
function factory<S extends TimeScale>(scale: S) {
  return Object.freeze({
    fromParts: (day: number, fraction: number) =>
      new JulianDate(day, fraction, scale),
    fromDouble: (jd: number) => {
      finite(jd, "Julian date");
      const day = Math.floor(jd);
      return new JulianDate(day, jd - day, scale);
    },
  });
}
export type UtcJulianDate = JulianDate<"UTC">;
export const UtcJulianDate = Object.freeze({
  ...factory("UTC"),
  fromDate: (date: Date) => fromUnixMilliseconds(date.getTime()),
  fromUnixMilliseconds,
});
export type TaiJulianDate = JulianDate<"TAI">;
export const TaiJulianDate = factory("TAI");
export type TtJulianDate = JulianDate<"TT">;
export const TtJulianDate = factory("TT");
export type Ut1JulianDate = JulianDate<"UT1">;
export const Ut1JulianDate = factory("UT1");
export type TdbJulianDate = JulianDate<"TDB">;
export const TdbJulianDate = factory("TDB");
export type LocalMeanSolarJulianDate = JulianDate<"LOCAL_MEAN">;
export const LocalMeanSolarJulianDate = factory("LOCAL_MEAN");
export type LocalApparentSolarJulianDate = JulianDate<"LOCAL_APPARENT">;
export const LocalApparentSolarJulianDate = factory("LOCAL_APPARENT");
export function fromUnixMilliseconds(ms: number): UtcJulianDate {
  integer(ms, -8640000000000000, 8640000000000000, "Unix milliseconds");
  const days = Math.floor(ms / 86400000);
  return new JulianDate(
    2440587 + days,
    0.5 + (ms - days * 86400000) / 86400000,
    "UTC",
  );
}
export function sameScale<S extends TimeScale>(
  value: JulianDate<S>,
  scale: S,
): void {
  if (!(value instanceof JulianDate) || value.scale !== scale)
    throw new TypeError(
      `Expected a ${scale} Julian date, not an implicit time-scale conversion`,
    );
}
export class AstroDateTime {
  constructor(
    readonly year: number,
    readonly month: number,
    readonly day: number,
    readonly hour = 0,
    readonly minute = 0,
    readonly second = 0,
    readonly nanosecond = 0,
  ) {
    integer(year, -2147483648, 2147483647, "year");
    integer(month, 1, 12, "month");
    integer(day, 1, 31, "day");
    integer(hour, 0, 23, "hour");
    integer(minute, 0, 59, "minute");
    integer(second, 0, 60, "second");
    integer(nanosecond, 0, 999999999, "nanosecond");
    Object.freeze(this);
  }
  static fromDate(date: Date): AstroDateTime {
    if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid Date");
    return new AstroDateTime(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds() * 1000000,
    );
  }
  get fractionalSecond(): number {
    return this.second + this.nanosecond / 1e9;
  }
}
export function civil(value: AstroDateTime | Date): AstroDateTime {
  if (value instanceof Date) return AstroDateTime.fromDate(value);
  if (!(value instanceof AstroDateTime))
    throw new TypeError("Expected AstroDateTime or Date");
  return value;
}
export function dateValues(value: AstroDateTime | Date): number[] {
  const v = civil(value);
  return [v.year, v.month, v.day, v.hour, v.minute, v.fractionalSecond];
}
export function jdValues(value: JulianDate): number[] {
  if (!(value instanceof JulianDate))
    throw new TypeError("Expected JulianDate");
  return [value.dayNumber, value.dayFraction];
}
export function readDate(v: readonly number[], at = 0): AstroDateTime {
  const second = v[at + 5]!;
  const ns = Math.round(second * 1e9);
  if (ns >= 60000000000)
    throw new RangeError(
      "Calendar rounding crossed a minute; use the core reverse conversion",
    );
  return new AstroDateTime(
    v[at]!,
    v[at + 1]!,
    v[at + 2]!,
    v[at + 3]!,
    v[at + 4]!,
    Math.floor(ns / 1e9),
    ns % 1e9,
  );
}
