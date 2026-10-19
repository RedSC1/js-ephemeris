import {
  JulianDate,
  type Ut1JulianDate,
  type TtJulianDate,
  type TimeScale,
  jdValues,
  sameScale,
} from "./date.js";
import { finite, result, ResultFlags, type OperationResult } from "./models.js";
import type { ContextHost } from "./internal/wasm.js";
export interface EquationOfTime {
  readonly julianDateUt1: Ut1JulianDate;
  readonly julianDateTt: TtJulianDate;
  readonly equationDays: number;
  readonly equationSeconds: number;
  readonly apparentSunRightAscensionRad: number;
  readonly gastRad: number;
}
export class SolarTime {
  constructor(private readonly host: ContextHost) {}
  private call(op: number, jd: JulianDate, longitude = 0): number[] {
    return this.host.run(() => {
      const reply = this.host.wire.fixed(
        "_taiyin_web_solar_time",
        [this.host.handle, op],
        [...jdValues(jd), finite(longitude, "longitude radians")],
      );
      this.host.record(reply.values);
      return this.host.wire.checked(reply, 0);
    });
  }
  private equation(
    op: number,
    jd: JulianDate,
  ): OperationResult<EquationOfTime> {
    const v = this.call(op, jd);
    return result(
      Object.freeze({
        julianDateUt1: new JulianDate(v[1]!, v[2]!, "UT1"),
        julianDateTt: new JulianDate(v[3]!, v[4]!, "TT"),
        equationDays: v[5]!,
        equationSeconds: v[6]!,
        apparentSunRightAscensionRad: v[7]!,
        gastRad: v[8]!,
      }),
      new ResultFlags(v[0]!),
    );
  }
  equationOfTimeAtUt1(jd: Ut1JulianDate): OperationResult<EquationOfTime> {
    sameScale(jd, "UT1");
    return this.equation(0, jd);
  }
  equationOfTimeAtTt(jd: TtJulianDate): OperationResult<EquationOfTime> {
    sameScale(jd, "TT");
    return this.equation(1, jd);
  }
  localMeanToApparent(
    jd: JulianDate<"LOCAL_MEAN">,
    longitudeRadians: number,
  ): OperationResult<JulianDate<"LOCAL_APPARENT">> {
    sameScale(jd, "LOCAL_MEAN");
    const v = this.call(2, jd, longitudeRadians);
    return result(
      new JulianDate(v[1]!, v[2]!, "LOCAL_APPARENT"),
      new ResultFlags(v[0]!),
    );
  }
  localApparentToMean(
    jd: JulianDate<"LOCAL_APPARENT">,
    longitudeRadians: number,
  ): OperationResult<JulianDate<"LOCAL_MEAN">> {
    sameScale(jd, "LOCAL_APPARENT");
    const v = this.call(3, jd, longitudeRadians);
    return result(
      new JulianDate(v[1]!, v[2]!, "LOCAL_MEAN"),
      new ResultFlags(v[0]!),
    );
  }
}
