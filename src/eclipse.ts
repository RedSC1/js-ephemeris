// Generated transport facade for the existing C++ eclipse API; no algorithms here.
import {
  JulianDate,
  jdValues,
  sameScale,
  type TtJulianDate,
  type Ut1JulianDate,
} from "./date.js";
import {
  finite,
  integer,
  positionMask,
  result,
  ResultFlags,
  type PositionFlags,
  type OperationResult,
} from "./models.js";
import type { ContextHost } from "./internal/wasm.js";
import { encode, decode, width, uint64 } from "./internal/records.js";
import type * as R from "./internal/records.generated.js";
export interface EclipseOptions {
  positionFlags?: PositionFlags;
  options?: bigint | number;
  kinds?: number;
  maxResults?: number;
  maxRows?: number;
  routeSampleCount?: number;
}
export enum EclipseKind {
  none = 0,
  penumbral = 1,
  partial = 2,
  total = 4,
  annular = 8,
  hybrid = 16,
  central = 32,
  noncentral = 64,
}
export const EclipseOption = Object.freeze({
  includeContacts: 1n << 33n,
  excludePenumbral: 1n << 34n,
  backward: 1n << 35n,
  localRefraction: 1n << 37n,
  lunarLimbCorrection: 1n << 38n,
  localStrictMeteorology: 1n << 32n,
});
const flags = (o: EclipseOptions) => {
  const [low, high] = uint64(o.options ?? 0);
  return uint64(
    BigInt(positionMask(o.positionFlags)) |
      BigInt(low!) |
      (BigInt(high!) << 32n),
  );
};
function jd(value: JulianDate, scale: "TT" | "UT1"): number[] {
  sameScale(value, scale);
  return jdValues(value);
}
export interface SolarEclipseRouteProduct {
  readonly summary: R.SolarEclipseRouteProductSummary;
  readonly points: readonly R.SolarEclipseRouteProductPoint[];
}
export class EclipseApi {
  constructor(private readonly host: ContextHost) {}
  private call(op: number, input: number[]): number[] {
    return this.host.run(() => {
      const reply = this.host.wire.structured(
        "_taiyin_web_eclipse",
        [this.host.handle, op],
        input,
      );
      this.host.record(reply.values);
      return this.host.wire.checked(reply, 0);
    });
  }
  private one<T>(
    op: number,
    input: number[],
    name: string,
  ): OperationResult<T> {
    const v = this.call(op, input);
    return result(decode<T>(name, v), new ResultFlags(v[0]!));
  }
  private many<T>(
    op: number,
    input: number[],
    name: string,
  ): OperationResult<readonly T[]> {
    const v = this.call(op, input);
    return result(
      Object.freeze(
        Array.from(
          { length: integer(v[2]!, 0, 1000000, "record count") },
          (_, i) => decode<T>(name, v, 32 + i * width(name)),
        ),
      ),
      new ResultFlags(v[0]!),
    );
  }
  private product(
    op: number,
    input: number[],
  ): OperationResult<SolarEclipseRouteProduct> {
    const v = this.call(op, input);
    const name = "taiyin_solar_eclipse_route_product_summary";
    return result(
      Object.freeze({
        summary: decode<R.SolarEclipseRouteProductSummary>(name, v),
        points: Object.freeze(
          Array.from(
            { length: integer(v[2]!, 0, 1000000, "point count") },
            (_, i) =>
              decode<R.SolarEclipseRouteProductPoint>(
                "taiyin_solar_eclipse_route_product_point",
                v,
                32 +
                  width(name) +
                  i * width("taiyin_solar_eclipse_route_product_point"),
              ),
          ),
        ),
      }),
      new ResultFlags(v[0]!),
    );
  }
  /** C++ taiyin_solve_lunar_eclipse_at_tt. */
  solveLunarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LunarEclipseResultTt> {
    return this.one<R.LunarEclipseResultTt>(
      0,
      [...jd(coordinate, "TT"), ...flags(options)],
      "taiyin_lunar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_solve_lunar_eclipse_at_ut. */
  solveLunarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LunarEclipseResultUt1> {
    return this.one<R.LunarEclipseResultUt1>(
      1,
      [...jd(coordinate, "UT1"), ...flags(options)],
      "taiyin_lunar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_search_next_lunar_eclipse_tt. */
  nextLunarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LunarEclipseResultTt> {
    return this.one<R.LunarEclipseResultTt>(
      2,
      [
        ...jd(coordinate, "TT"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_lunar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_search_next_lunar_eclipse_ut. */
  nextLunarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LunarEclipseResultUt1> {
    return this.one<R.LunarEclipseResultUt1>(
      3,
      [
        ...jd(coordinate, "UT1"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_lunar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_search_lunar_eclipses_tt. */
  lunarEclipsesAtTt(
    start: TtJulianDate,
    end: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<readonly R.LunarEclipseResultTt[]> {
    return this.many<R.LunarEclipseResultTt>(
      4,
      [
        ...jd(start, "TT"),
        ...jd(end, "TT"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
        integer(options.maxResults ?? 16, 1, 1000000, "maximum results"),
      ],
      "taiyin_lunar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_search_lunar_eclipses_ut. */
  lunarEclipsesAtUt1(
    start: Ut1JulianDate,
    end: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<readonly R.LunarEclipseResultUt1[]> {
    return this.many<R.LunarEclipseResultUt1>(
      5,
      [
        ...jd(start, "UT1"),
        ...jd(end, "UT1"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
        integer(options.maxResults ?? 16, 1, 1000000, "maximum results"),
      ],
      "taiyin_lunar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_compute_local_lunar_eclipse_visibility_tt. */
  localLunarVisibilityAtTt(
    eclipse: R.LunarEclipseResultTt,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalLunarEclipseResultTt> {
    return this.one<R.LocalLunarEclipseResultTt>(
      6,
      [
        ...encode("taiyin_lunar_eclipse_result_tt", eclipse, "TT"),
        ...flags(options),
      ],
      "taiyin_local_lunar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_compute_local_lunar_eclipse_visibility_ut. */
  localLunarVisibilityAtUt1(
    eclipse: R.LunarEclipseResultUt1,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalLunarEclipseResultUt1> {
    return this.one<R.LocalLunarEclipseResultUt1>(
      7,
      [
        ...encode("taiyin_lunar_eclipse_result_ut", eclipse, "UT1"),
        ...flags(options),
      ],
      "taiyin_local_lunar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_search_next_local_lunar_eclipse_tt. */
  nextLocalLunarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalLunarEclipseResultTt> {
    return this.one<R.LocalLunarEclipseResultTt>(
      8,
      [
        ...jd(coordinate, "TT"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_local_lunar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_search_next_local_lunar_eclipse_ut. */
  nextLocalLunarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalLunarEclipseResultUt1> {
    return this.one<R.LocalLunarEclipseResultUt1>(
      9,
      [
        ...jd(coordinate, "UT1"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_local_lunar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_solve_solar_eclipse_at_tt. */
  solveSolarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseResultTt> {
    return this.one<R.SolarEclipseResultTt>(
      10,
      [...jd(coordinate, "TT"), ...flags(options)],
      "taiyin_solar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_solve_solar_eclipse_at_ut. */
  solveSolarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseResultUt1> {
    return this.one<R.SolarEclipseResultUt1>(
      11,
      [...jd(coordinate, "UT1"), ...flags(options)],
      "taiyin_solar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_search_next_solar_eclipse_tt. */
  nextSolarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseResultTt> {
    return this.one<R.SolarEclipseResultTt>(
      12,
      [
        ...jd(coordinate, "TT"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_solar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_search_next_solar_eclipse_ut. */
  nextSolarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseResultUt1> {
    return this.one<R.SolarEclipseResultUt1>(
      13,
      [
        ...jd(coordinate, "UT1"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_solar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_search_solar_eclipses_tt. */
  solarEclipsesAtTt(
    start: TtJulianDate,
    end: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<readonly R.SolarEclipseResultTt[]> {
    return this.many<R.SolarEclipseResultTt>(
      14,
      [
        ...jd(start, "TT"),
        ...jd(end, "TT"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
        integer(options.maxResults ?? 16, 1, 1000000, "maximum results"),
      ],
      "taiyin_solar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_search_solar_eclipses_ut. */
  solarEclipsesAtUt1(
    start: Ut1JulianDate,
    end: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<readonly R.SolarEclipseResultUt1[]> {
    return this.many<R.SolarEclipseResultUt1>(
      15,
      [
        ...jd(start, "UT1"),
        ...jd(end, "UT1"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
        integer(options.maxResults ?? 16, 1, 1000000, "maximum results"),
      ],
      "taiyin_solar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_solve_local_solar_eclipse_at_tt. */
  solveLocalSolarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalSolarEclipseResultTt> {
    return this.one<R.LocalSolarEclipseResultTt>(
      16,
      [...jd(coordinate, "TT"), ...flags(options)],
      "taiyin_local_solar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_solve_local_solar_eclipse_at_ut. */
  solveLocalSolarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalSolarEclipseResultUt1> {
    return this.one<R.LocalSolarEclipseResultUt1>(
      17,
      [...jd(coordinate, "UT1"), ...flags(options)],
      "taiyin_local_solar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_search_next_local_solar_eclipse_tt. */
  nextLocalSolarAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalSolarEclipseResultTt> {
    return this.one<R.LocalSolarEclipseResultTt>(
      18,
      [
        ...jd(coordinate, "TT"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_local_solar_eclipse_result_tt",
    );
  }
  /** C++ taiyin_search_next_local_solar_eclipse_ut. */
  nextLocalSolarAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.LocalSolarEclipseResultUt1> {
    return this.one<R.LocalSolarEclipseResultUt1>(
      19,
      [
        ...jd(coordinate, "UT1"),
        integer(options.kinds ?? 0, 0, 0xffffffff, "eclipse kinds"),
        ...flags(options),
      ],
      "taiyin_local_solar_eclipse_result_ut",
    );
  }
  /** C++ taiyin_compute_local_solar_circumstances_tt. */
  localSolarCircumstancesAtTt(
    coordinate: TtJulianDate,
  ): OperationResult<R.LocalSolarEclipseCircumstancesTt> {
    return this.one<R.LocalSolarEclipseCircumstancesTt>(
      20,
      [...jd(coordinate, "TT")],
      "taiyin_local_solar_eclipse_circumstances_tt",
    );
  }
  /** C++ taiyin_compute_local_solar_circumstances_ut. */
  localSolarCircumstancesAtUt1(
    coordinate: Ut1JulianDate,
  ): OperationResult<R.LocalSolarEclipseCircumstancesUt1> {
    return this.one<R.LocalSolarEclipseCircumstancesUt1>(
      21,
      [...jd(coordinate, "UT1")],
      "taiyin_local_solar_eclipse_circumstances_ut",
    );
  }
  /** C++ taiyin_compute_solar_besselian_elements_tt. */
  solarBesselianElementsAtTt(
    coordinate: TtJulianDate,
    timeOffsetHours = 0,
  ): OperationResult<R.SolarBesselianElements> {
    return this.one<R.SolarBesselianElements>(
      22,
      [...jd(coordinate, "TT"), finite(timeOffsetHours, "time offset")],
      "taiyin_solar_besselian_elements",
    );
  }
  /** C++ taiyin_compute_solar_besselian_polynomial_tt. */
  solarBesselianPolynomialAtTt(
    coordinate: TtJulianDate,
    options: { spanHours: number; sampleStepHours: number; degree?: number },
  ): OperationResult<R.SolarBesselianPolynomial> {
    return this.one<R.SolarBesselianPolynomial>(
      23,
      [
        ...jd(coordinate, "TT"),
        finite(options.spanHours, "span hours"),
        finite(options.sampleStepHours, "sample step hours"),
        integer(options.degree ?? 4, 1, 7, "degree"),
      ],
      "taiyin_solar_besselian_polynomial",
    );
  }
  /** C++ taiyin_evaluate_solar_besselian_polynomial. */
  evaluateSolarBesselianPolynomial(
    polynomial: R.SolarBesselianPolynomial,
    timeOffsetHours: number,
  ): OperationResult<R.SolarBesselianElements> {
    return this.one<R.SolarBesselianElements>(
      24,
      [
        ...encode("taiyin_solar_besselian_polynomial", polynomial),
        finite(timeOffsetHours, "time offset"),
      ],
      "taiyin_solar_besselian_elements",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_row_tt. */
  solarEclipseRouteRowAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseRouteRow> {
    return this.one<R.SolarEclipseRouteRow>(
      25,
      [...jd(coordinate, "TT"), ...flags(options)],
      "taiyin_solar_eclipse_route_row",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_row_ut. */
  solarEclipseRouteRowAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseRouteRow> {
    return this.one<R.SolarEclipseRouteRow>(
      26,
      [...jd(coordinate, "UT1"), ...flags(options)],
      "taiyin_solar_eclipse_route_row",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_where_tt. */
  solarEclipseWhereAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseWhere> {
    return this.one<R.SolarEclipseWhere>(
      27,
      [...jd(coordinate, "TT"), ...flags(options)],
      "taiyin_solar_eclipse_where",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_where_ut. */
  solarEclipseWhereAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<R.SolarEclipseWhere> {
    return this.one<R.SolarEclipseWhere>(
      28,
      [...jd(coordinate, "UT1"), ...flags(options)],
      "taiyin_solar_eclipse_where",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_tt. */
  solarEclipseRouteAtTt(
    start: TtJulianDate,
    end: TtJulianDate,
    options: EclipseOptions & { stepMinutes: number },
  ): OperationResult<readonly R.SolarEclipseRouteRow[]> {
    return this.many<R.SolarEclipseRouteRow>(
      29,
      [
        ...jd(start, "TT"),
        ...jd(end, "TT"),
        finite(options.stepMinutes, "step minutes"),
        ...flags(options),
        integer(options.maxRows ?? 256, 1, 1000000, "maximum rows"),
      ],
      "taiyin_solar_eclipse_route_row",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_ut. */
  solarEclipseRouteAtUt1(
    start: Ut1JulianDate,
    end: Ut1JulianDate,
    options: EclipseOptions & { stepMinutes: number },
  ): OperationResult<readonly R.SolarEclipseRouteRow[]> {
    return this.many<R.SolarEclipseRouteRow>(
      30,
      [
        ...jd(start, "UT1"),
        ...jd(end, "UT1"),
        finite(options.stepMinutes, "step minutes"),
        ...flags(options),
        integer(options.maxRows ?? 256, 1, 1000000, "maximum rows"),
      ],
      "taiyin_solar_eclipse_route_row",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_curves_tt. */
  solarEclipseRouteCurvesAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<readonly R.SolarEclipseRouteCurvePoint[]> {
    return this.many<R.SolarEclipseRouteCurvePoint>(
      31,
      [
        ...jd(coordinate, "TT"),
        ...flags(options),
        integer(
          options.routeSampleCount ?? 400,
          32,
          4096,
          "route sample count",
        ),
        0,
      ],
      "taiyin_solar_eclipse_route_curve_point",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_curves_ut. */
  solarEclipseRouteCurvesAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<readonly R.SolarEclipseRouteCurvePoint[]> {
    return this.many<R.SolarEclipseRouteCurvePoint>(
      32,
      [
        ...jd(coordinate, "UT1"),
        ...flags(options),
        integer(
          options.routeSampleCount ?? 400,
          32,
          4096,
          "route sample count",
        ),
        0,
      ],
      "taiyin_solar_eclipse_route_curve_point",
    );
  }
  /** C++ taiyin_compute_solar_eclipse_route_product_tt. */
  solarEclipseRouteProductAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<SolarEclipseRouteProduct> {
    return this.product(33, [
      ...jd(coordinate, "TT"),
      ...flags(options),
      integer(options.routeSampleCount ?? 400, 32, 4096, "route sample count"),
      0,
    ]);
  }
  /** C++ taiyin_compute_solar_eclipse_route_product_ut. */
  solarEclipseRouteProductAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<SolarEclipseRouteProduct> {
    return this.product(34, [
      ...jd(coordinate, "UT1"),
      ...flags(options),
      integer(options.routeSampleCount ?? 400, 32, 4096, "route sample count"),
      0,
    ]);
  }
  /** C++ taiyin_compute_solar_eclipse_route_map_product_tt. */
  solarEclipseRouteMapProductAtTt(
    coordinate: TtJulianDate,
    options: EclipseOptions = {},
  ): OperationResult<SolarEclipseRouteProduct> {
    return this.product(35, [
      ...jd(coordinate, "TT"),
      ...flags(options),
      integer(options.routeSampleCount ?? 400, 32, 4096, "route sample count"),
      0,
    ]);
  }
  /** C++ taiyin_compute_solar_eclipse_route_map_product_ut. */
  solarEclipseRouteMapProductAtUt1(
    coordinate: Ut1JulianDate,
    options: EclipseOptions = {},
  ): OperationResult<SolarEclipseRouteProduct> {
    return this.product(36, [
      ...jd(coordinate, "UT1"),
      ...flags(options),
      integer(options.routeSampleCount ?? 400, 32, 4096, "route sample count"),
      0,
    ]);
  }
  /** C++ taiyin_compute_local_solar_eclipse_boundary_tt. */
  localSolarEclipseBoundaryAtTt(
    coordinate: TtJulianDate,
    options: { longitudeDegrees: number; latitudeDegrees: number },
  ): OperationResult<R.LocalSolarEclipseBoundary> {
    return this.one<R.LocalSolarEclipseBoundary>(
      37,
      [
        ...jd(coordinate, "TT"),
        finite(options.longitudeDegrees, "longitude"),
        finite(options.latitudeDegrees, "latitude"),
      ],
      "taiyin_local_solar_eclipse_boundary",
    );
  }
  /** C++ taiyin_compute_local_solar_eclipse_boundary_ut. */
  localSolarEclipseBoundaryAtUt1(
    coordinate: Ut1JulianDate,
    options: { longitudeDegrees: number; latitudeDegrees: number },
  ): OperationResult<R.LocalSolarEclipseBoundary> {
    return this.one<R.LocalSolarEclipseBoundary>(
      38,
      [
        ...jd(coordinate, "UT1"),
        finite(options.longitudeDegrees, "longitude"),
        finite(options.latitudeDegrees, "latitude"),
      ],
      "taiyin_local_solar_eclipse_boundary",
    );
  }
}
