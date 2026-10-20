import {
  Ephemeris,
  Body,
  Ut1JulianDate,
  type OperationResult,
  type Position,
} from "js-ephemeris";
import { BaziGender, type BaziCalculation } from "js-bazi";
import { ZiweiGender, type ZiweiChart } from "js-ziwei";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const position: OperationResult<Position> = ctx.position.atUt1(
  Body.moon,
  Ut1JulianDate.fromDouble(2460310.5),
);
const longitude: number = position.value.values[0]!;
console.log(longitude, position.flags.mask);
const birth = new Date("2003-03-13T06:15:00Z");
const bazi: OperationResult<BaziCalculation> = ctx
  .bazi()
  .calculateInstant(birth, {
    gender: BaziGender.male,
  });
const ziwei: OperationResult<ZiweiChart> = ctx.ziwei().calculateInstant(birth, {
  gender: ZiweiGender.male,
});
console.log(bazi.value.chart, ziwei.value.summary);
eph.close();
