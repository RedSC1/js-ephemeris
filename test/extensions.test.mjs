import test from "node:test";
import assert from "node:assert/strict";
import * as E from "js-ephemeris";
import factory from "js-ephemeris/assets/taiyin_web.mjs";

test("optional packages augment an existing context without creating another Wasm", async () => {
  assert.equal(E.BaziContext, undefined);
  assert.equal(E.ZiweiContext, undefined);
  assert.equal(E.EphemerisContext.prototype.bazi, undefined);
  assert.equal(E.EphemerisContext.prototype.ziwei, undefined);
  let instances = 0;
  const eph = await E.Ephemeris.initialize({
    moduleFactory: (options) => {
      instances++;
      return factory(options);
    },
  });
  const ctx = eph.createContext();
  const other = eph.createContext();
  const calendar = ctx.createChineseCalendar(
    E.ChineseCalendarConfig.localAstronomicalUtcOffset(420),
  );
  try {
    const B = await import("js-bazi");
    assert.equal(ctx.ziwei, undefined);
    assert.equal(eph.createZiweiDataCatalog, undefined);
    const bazi = ctx.bazi({ chineseCalendar: calendar });
    assert.ok(bazi instanceof B.BaziContext);
    assert.notEqual(bazi, ctx.bazi());
    assert.throws(() => calendar.close());
    assert.throws(() => other.bazi({ chineseCalendar: calendar }), TypeError);
    const local = new E.AstroDateTime(2003, 3, 13, 14, 15);
    assert.ok(
      bazi.calculateLocal(local, { gender: B.BaziGender.male }).value.chart,
    );

    const Z = await import("js-ziwei");
    const catalog = eph.createZiweiDataCatalog();
    const ziwei = ctx.ziwei({ chineseCalendar: calendar, catalog });
    assert.ok(ziwei instanceof Z.ZiweiContext);
    assert.throws(() => other.ziwei({ chineseCalendar: calendar }), TypeError);
    assert.equal(
      ziwei.createChartLocal(local, { gender: Z.ZiweiGender.male }).value
        .summary.anchors.length,
      31,
    );
    assert.equal(
      instances,
      1,
      "extensions must reuse the exact initialized Wasm",
    );
    const clone = ctx.clone();
    clone.bazi();
    clone.ziwei();
    clone.close();
    eph.close();
    assert.throws(() => ctx.bazi(), E.ClosedContextError);
    assert.throws(() => ctx.ziwei(), E.ClosedContextError);
    assert.throws(() => eph.createBaziShenShaCatalog(), E.ClosedContextError);
    assert.throws(() => eph.createZiweiDataCatalog(), E.ClosedContextError);
    assert.throws(
      () => bazi.calculateLocal(local, { gender: B.BaziGender.male }),
      E.ClosedContextError,
    );
    assert.throws(
      () => ziwei.createChartLocal(local, { gender: Z.ZiweiGender.male }),
      E.ClosedContextError,
    );
  } finally {
    eph.close();
  }
});
