import test from "node:test";
import assert from "node:assert/strict";
import {
  UtcJulianDate,
  TtJulianDate,
  Ut1JulianDate,
  JulianDate,
  AstroDateTime,
  ResultFlags,
  ResultFlag,
  PositionFlag,
  ChineseCalendarConfig,
} from "../dist/index.js";
import { positionMask } from "../dist/models.js";
import { uint64, encode, decode, width } from "../dist/internal/records.js";
import { Wire } from "../dist/internal/wasm.js";

test("split dates normalize fractions without collapsing to a double", () => {
  const jd = UtcJulianDate.fromParts(2460000, 1.25);
  assert.equal(jd.dayNumber, 2460001);
  assert.equal(jd.dayFraction, 0.25);
  assert.equal(jd.addSeconds(0.000001).dayNumber, 2460001);
  assert.ok(Math.abs(jd.daysUntil(jd.addSeconds(1)) * 86400 - 1) < 1e-10);
});
test("Date is an instant and Unix timestamps are milliseconds", () => {
  const d = new Date("2003-03-13T06:15:00.123Z");
  assert.equal(
    UtcJulianDate.fromDate(d).toDouble(),
    UtcJulianDate.fromUnixMilliseconds(d.getTime()).toDouble(),
  );
  assert.deepEqual(
    AstroDateTime.fromDate(d),
    new AstroDateTime(2003, 3, 13, 6, 15, 0, 123000000),
  );
  assert.equal(UtcJulianDate.fromUnixMilliseconds(-1).dayNumber, 2440587);
});
test("invalid dates, unsafe integers and implicit scale comparisons are rejected", () => {
  assert.throws(() => UtcJulianDate.fromDate(new Date(NaN)), RangeError);
  assert.throws(() => UtcJulianDate.fromDouble(NaN), RangeError);
  assert.throws(() => new JulianDate(2 ** 53, 0, "UTC"), RangeError);
  assert.throws(
    () =>
      TtJulianDate.fromDouble(2451545).compareTo(
        Ut1JulianDate.fromDouble(2451545),
      ),
    TypeError,
  );
  assert.throws(() => new AstroDateTime(2024, 258, 266), RangeError);
});
test("result flags keep the full unsigned low 32 bits", () => {
  const flags = new ResultFlags(0x80000001);
  assert.equal(flags.mask, 2147483649);
  assert.ok(flags.contains(ResultFlag.fallbackOccurred));
  assert.equal(flags.union(new ResultFlags(2)).mask, 2147483651);
  assert.throws(() => new ResultFlags(-1), RangeError);
});
test("input flags and high eclipse options do not pass through bitwise int32", () => {
  assert.equal(positionMask([PositionFlag.speed, PositionFlag.xyz]), 3);
  assert.deepEqual(uint64((1n << 63n) | (1n << 33n) | 7n), [7, 0x80000002]);
  assert.throws(() => uint64(2 ** 53), RangeError);
  assert.throws(() => uint64(-1n), RangeError);
  assert.throws(() => positionMask(4096), RangeError);
});
test("record arrays and native integer widths are checked before writing Wasm", () => {
  assert.throws(
    () =>
      encode("taiyin_ganzhi_four_pillars", {
        year: 2 ** 32 + 1,
        month: 0,
        day: 0,
        hour: 0,
      }),
    RangeError,
  );
  assert.throws(
    () =>
      encode("taiyin_ziwei_birth_options", {
        ratHourMode: 2 ** 32,
        leapMonthStrategy: 0,
        chartMode: 0,
        wuHuDunYearBoundary: 0,
        sihuaYearBoundary: 0,
        bodyMasterYearBoundary: 0,
      }),
    RangeError,
  );
  assert.equal(width("taiyin_bazi_chart"), 48);
  assert.equal(width("taiyin_solar_besselian_polynomial"), 91);
});
test("absent native contact times are null, not invalid JD objects", () => {
  const v = decode("taiyin_split_julian_date", [0, NaN], 0);
  assert.equal(v, null);
  assert.deepEqual(encode("taiyin_split_julian_date", null), [0, NaN]);
});
test("explicit clock/meridian calendar policies remain independent", () => {
  assert.equal(
    ChineseCalendarConfig.localAstronomicalUtcOffset(420).dayBoundaryMode,
    0,
  );
  const c = ChineseCalendarConfig.localAstronomicalMeridian(105.8, {
    utcOffsetMinutes: 420,
  });
  assert.equal(c.dayBoundaryMode, 1);
  assert.equal(c.utcOffsetMinutes, 420);
  assert.equal(c.calendarMeridianDegrees, 105.8);
  assert.throws(
    () => new ChineseCalendarConfig({ utcOffsetMinutes: 2 ** 32 + 480 }),
    RangeError,
  );
});
test("transport copies results and frees both allocations even on a thrown native call", () => {
  let next = 8;
  const freed = [];
  const buffer = new ArrayBuffer(4096);
  const module = {
    HEAPU8: new Uint8Array(buffer),
    HEAPF64: new Float64Array(buffer),
    _malloc: (n) => {
      const p = next;
      next += n;
      return p;
    },
    _free: (p) => freed.push(p),
    _throw: () => {
      throw new Error("callback failed");
    },
    _copy: (input, output) => {
      module.HEAPF64[output / 8 + 1] = module.HEAPF64[input / 8];
      return 0;
    },
  };
  const w = new Wire(module);
  const r = w.fixed("_copy", [], [42]);
  assert.equal(r.values[1], 42);
  assert.equal(freed.length, 2);
  module.HEAPF64.fill(9);
  assert.equal(r.values[1], 42);
  assert.throws(() => w.fixed("_throw", [], []), /callback failed/);
  assert.equal(freed.length, 4);
});
