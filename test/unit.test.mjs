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
  Ephemeris,
  PhenomenaApi,
  PositionApi,
  ObservedApi,
  StarsApi,
} from "./all-packages.mjs";
import { positionMask } from "../packages/js-ephemeris/dist/models.js";
import {
  uint64,
  encode,
  decode,
  width,
} from "../packages/js-ephemeris/dist/internal/records.js";
import { Wire } from "../packages/js-ephemeris/dist/internal/wasm.js";
import { astronomyProtocolId } from "../packages/js-ephemeris/dist/internal/astronomy-operations.generated.js";

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
test("generated and observed APIs reject unsafe masks before BigInt conversion", () => {
  const reachedNative = new Error("reached native transport");
  let calls = 0;
  let captured;
  const host = {
    handle: 1,
    run: (fn) => fn(),
    record: () => {},
    wire: {
      invoke: () => astronomyProtocolId,
      structured: (name, prefix, input) => {
        calls++;
        captured = input;
        throw reachedNative;
      },
    },
  };
  const tt = TtJulianDate.fromDouble(2460310.5);
  const ut1 = Ut1JulianDate.fromDouble(2460310.5);
  const cases = [
    [(options) => new PhenomenaApi(host).atTt(301, tt, options), 3],
    [(options) => new ObservedApi(host).atUt1(301, ut1, options), 2],
    [(options) => new StarsApi(host).observedAtUt1("Antares", ut1, options), 2],
  ];
  for (const [call, offset] of cases) {
    for (const key of ["options", "flags"])
      for (const bad of [
        2 ** 53,
        Number.MAX_SAFE_INTEGER + 2,
        0.5,
        NaN,
        Infinity,
        -1,
        -1n,
        1n << 64n,
      ]) {
        const before = calls;
        assert.throws(() => call({ [key]: bad }), RangeError);
        assert.equal(calls, before, "invalid masks must not reach native code");
      }
    for (const options of [
      { options: Number.MAX_SAFE_INTEGER, positionFlags: [PositionFlag.speed] },
      {
        options: (1n << 63n) | (1n << 32n),
        positionFlags: [PositionFlag.speed],
      },
      { flags: 0xffffffffffffffffn },
      { flags: 0n, options: 2 ** 53, positionFlags: [PositionFlag.speed] },
    ]) {
      const expected = options.flags ?? BigInt(options.options) | 1n;
      assert.throws(
        () => call(options),
        (error) => error === reachedNative,
      );
      assert.deepEqual(captured.slice(offset, offset + 2), uint64(expected));
    }
  }
});
test("batch positions combine every row including unsigned high result flags", () => {
  let rowFlags = [];
  let calls = 0;
  const api = new PositionApi({
    handle: 1,
    run: (fn) => fn(),
    record: () => {},
    wire: {
      fixed: () => {
        calls++;
        const values = new Array(32 * rowFlags.length).fill(0);
        rowFlags.forEach((mask, i) => {
          values[i * 32] = mask;
        });
        return { status: 0, values };
      },
      checked: (reply) => reply.values,
    },
  });
  for (const masks of [[0, 4], [4, 0], [0, 1, 0x80000000, 2], [0]]) {
    rowFlags = masks;
    const targets = masks.map((_, i) => i + 1);
    const expected = Number(
      masks.reduce((all, mask) => all | BigInt(mask), 0n),
    );
    for (const call of [
      () => api.batchAtTt(targets, TtJulianDate.fromDouble(2460310.5)),
      () => api.batchAtUt1(targets, Ut1JulianDate.fromDouble(2460310.5)),
      () => api.batchAtUtc(targets, new Date("2024-01-01T00:00:00Z")),
      () =>
        api.batchAtTdb(
          targets,
          new JulianDate(2460310, 0.5, "TDB"),
          TtJulianDate.fromDouble(2460310.5),
        ),
      () =>
        api.batchAtUt1WithDeltaT(
          targets,
          Ut1JulianDate.fromDouble(2460310.5),
          69,
        ),
    ]) {
      const batch = call();
      assert.equal(batch.value.length, targets.length);
      assert.equal(batch.flags.mask, expected);
    }
  }
  const before = calls;
  assert.equal(
    api.batchAtTt([], TtJulianDate.fromDouble(2460310.5)).flags.mask,
    0,
  );
  assert.equal(calls, before);
});
test("runtime metadata rejects stale or missing astronomy protocols before decoding", async () => {
  const buffer = new ArrayBuffer(8192);
  let next = 8;
  let extraCalls = 0;
  let version = astronomyProtocolId - 1;
  const reachedNative = new Error("reached metadata transport");
  const module = {
    HEAPU8: new Uint8Array(buffer),
    HEAPF64: new Float64Array(buffer),
    _malloc: (n) => {
      const at = next;
      next += n;
      return at;
    },
    _free: () => {},
    _taiyin_web_bridge_version: () => 1,
    _taiyin_get_c_abi_version: () => 11,
    _taiyin_web_initialize: (input, output) => {
      module.HEAPF64.fill(0, output / 8, output / 8 + 32);
      return 0;
    },
    _taiyin_web_astronomy_version: () => version,
    _taiyin_web_astronomy_extra: () => {
      extraCalls++;
      throw reachedNative;
    },
  };
  const eph = await Ephemeris.initialize({ moduleFactory: () => module });
  try {
    for (const read of [
      () => eph.registeredDataSources(),
      () => eph.capabilities,
    ]) {
      version = astronomyProtocolId - 1;
      const before = extraCalls;
      assert.throws(read, /astronomy protocol mismatch/);
      assert.equal(extraCalls, before);
      version = astronomyProtocolId;
      assert.throws(read, (error) => error === reachedNative);
      assert.equal(extraCalls, before + 1);
      version = astronomyProtocolId - 1;
      assert.throws(read, /astronomy protocol mismatch/);
      assert.equal(
        extraCalls,
        before + 1,
        "protocol must be checked on every operation",
      );
    }
    delete module._taiyin_web_astronomy_version;
    assert.throws(() => eph.registeredDataSources(), /Wasm export missing/);
    assert.throws(() => eph.capabilities, /Wasm export missing/);
  } finally {
    eph.close();
  }
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
