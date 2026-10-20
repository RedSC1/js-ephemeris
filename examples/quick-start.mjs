import {
  Ephemeris,
  Body,
  Ut1JulianDate,
  AstroDateTime,
  BaziGender,
  ZiweiGender,
} from "../test/all-packages.mjs";
const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
try {
  const instant = Ut1JulianDate.fromDouble(2460310.5);
  console.log(
    "Mars barycenter:",
    ctx.position.atUt1(Body.marsBarycenter, instant),
  );
  console.log(
    "Lunar date:",
    ctx.chineseCalendar.fromSolar({ year: 2024, month: 2, day: 10 }),
  );
  console.log("Next solar eclipse:", ctx.eclipses.nextSolarAtUt1(instant));
  const local = new AstroDateTime(2003, 3, 13, 14, 15);
  const bazi = ctx.bazi();
  console.log("BaZi:", bazi.calculateLocal(local, { gender: BaziGender.male }));
  const ziwei = ctx.ziwei();
  const chart = ziwei.createChartLocal(local, {
    gender: ZiweiGender.male,
  }).value;
  console.log("Ziwei:", chart.summary);
} finally {
  eph.close();
}
