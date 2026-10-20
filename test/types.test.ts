import { ZiweiGender, ZiweiRuleset } from "js-ziwei";
import { BaziGender, BaziClockMode } from "js-bazi";
// Compile-only public TypeScript consumer. No runtime import of internal transport.
import {
  Ephemeris,
  Body,
  TtJulianDate,
  Ut1JulianDate,
  PositionFlag,
  AstroDateTime,
  EclipseOption,
  ChineseCalendarConfig,
  UtcJulianDate,
} from "js-ephemeris";
const eph = await Ephemeris.initialize();
const ctx = eph.createContext({
  chineseCalendarConfig: ChineseCalendarConfig.localAstronomicalUtcOffset(420),
});
const tt = TtJulianDate.fromDouble(2460310.5);
const ut1 = Ut1JulianDate.fromDouble(2460310.5);
const p = ctx.position.atTt(Body.moon, tt, { flags: [PositionFlag.speed] });
const longitude: number = p.value.coordinates[0]!;
const mask: number = p.flags.mask;
ctx.position.atUtc(Body.sun, new Date());
ctx.eclipses.nextSolarAtUt1(ut1, { options: EclipseOption.includeContacts });
ctx.ziwei().createChartLocal(new AstroDateTime(2003, 3, 13, 14, 15), {
  gender: ZiweiGender.male,
});
const birth = ctx.bazi().calculateInstant(new Date(), {
  gender: BaziGender.male,
  clock: { mode: BaziClockMode.meanSolar, longitudeRadians: 1 },
});
const reversed = ctx
  .bazi()
  .reverseLookupAtUt1(birth.value.pillars, ut1, ut1.addDays(2));
const reverseStart: Ut1JulianDate | null | undefined =
  reversed.value[0]?.startJdUt1;
ctx.bazi().reverseLookupAtUt1(
  birth.value.pillars,
  // @ts-expect-error Reverse bounds are physical UT1, not UTC.
  UtcJulianDate.fromDate(new Date()),
  ut1,
);
ctx
  .bazi()
  .calcQiyun(ut1, birth.value.chartTime, birth.value.chart, BaziGender.male);
ctx.bazi().calcQiyun(
  // @ts-expect-error QiYun expects physical UT1, not UTC relabeled as UT1.
  UtcJulianDate.fromDate(new Date()),
  birth.value.chartTime,
  birth.value.chart,
  BaziGender.male,
);
const catalog = eph.createBaziShenShaCatalog().addModule({
  label: "my-school",
  rules: [
    { id: "x", name: "x", test: (input) => input.gender === BaziGender.male },
  ],
});
catalog
  .createContext()
  .evaluate(birth.value.chart, birth.value.chart.dayPillar);
catalog.addModule({
  label: "async",
  rules: [
    {
      id: "x",
      name: "x",
      // @ts-expect-error Predicates must return synchronously, not Promise<boolean>.
      test: async () => true,
    },
  ],
});
const tables = eph.createZiweiDataCatalog();
tables.reload();
ctx
  .ziwei({ catalog: tables, ruleset: new ZiweiRuleset() })
  .calculateInstant(new Date(), { gender: ZiweiGender.male });
// @ts-expect-error UT1 coordinates must not be silently accepted as TT.
ctx.position.atTt(Body.moon, ut1);
// @ts-expect-error A date is not an inferred numeric Julian coordinate.
ctx.position.atUt1(Body.sun, new Date());
// @ts-expect-error Returned snapshots are read-only.
p.value.values[0] = longitude;
// @ts-expect-error Result flags are not input position flags.
ctx.position.atTt(Body.sun, tt, { flags: p.flags });
void mask;
ctx.events.lunarPhaseCrossingsAtUt1(0, ut1, ut1.addDays(40));
ctx.orbits.osculatingAtTt(Body.marsBarycenter, tt);
ctx.observed.atUtc(Body.sun, new Date());
ctx.stars.atTt("catalog-key", tt);
// @ts-expect-error General event roots must preserve their TT/UT1 scale.
ctx.events.solarLongitudeAtTt(0, ut1);
// @ts-expect-error Stellar TT calls must not silently relabel UT1.
ctx.stars.atTt("catalog-key", ut1);
eph.registerCustomAyanamshaModel({
  modelId: 11000,
  evaluate: (input) => input.tt.dayFraction,
});
// @ts-expect-error Custom models run synchronously at the native boundary.
eph.registerCustomAyanamshaModel({ modelId: 11000, evaluate: async () => 0 });
eph.close();
