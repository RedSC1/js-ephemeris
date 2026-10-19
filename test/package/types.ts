import {
  Ephemeris,
  Body,
  Ut1JulianDate,
  type OperationResult,
  type Position,
} from "js-ephemeris";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const position: OperationResult<Position> = ctx.position.atUt1(
  Body.moon,
  Ut1JulianDate.fromDouble(2460310.5),
);
const longitude: number = position.value.values[0]!;
console.log(longitude, position.flags.mask);
eph.close();
