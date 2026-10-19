// Generated native calls only. See scripts/generate-astronomy.mjs.
import { AstronomyTransport } from "./internal/astronomy-transport.js";
import type { JulianDate, AstroDateTime, TimeScale } from "./date.js";
import {
  positionMask,
  type OperationResult,
  type PositionFlags,
} from "./models.js";
import type * as R from "./internal/astronomy-records.generated.js";
import type { ContextHost } from "./internal/wasm.js";
export class PhenomenaApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_calc_body_phenomena_tt. */
  atTt(
    bodyId: number,
    tt: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyPhenomena> {
    const r = this.transport.call<R.BodyPhenomena>(0, {
      body_id: bodyId,
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_body_phenomena_ut. */
  atUt1(
    bodyId: number,
    ut1: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyPhenomena> {
    const r = this.transport.call<R.BodyPhenomena>(14, {
      body_id: bodyId,
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
}
export class OrbitalApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_calc_body_osculating_orbit_tt. */
  osculatingAtTt(
    bodyId: number,
    tt: JulianDate<"TT">,
    options: {
      referenceFrameId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyOsculatingOrbit> {
    const r = this.transport.call<R.BodyOsculatingOrbit>(1, {
      body_id: bodyId,
      jd_tt: tt,
      reference_frame_id: options.referenceFrameId ?? 4,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_body_orbit_reference_points_tt. */
  referencePointsAtTt(
    bodyId: number,
    tt: JulianDate<"TT">,
    options: {
      referenceFrameId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyOrbitReferencePoints> {
    const r = this.transport.call<R.BodyOrbitReferencePoints>(2, {
      body_id: bodyId,
      jd_tt: tt,
      reference_frame_id: options.referenceFrameId ?? 4,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_body_apsis_tt. */
  searchApsisFromTt(
    bodyId: number,
    kind: number,
    start: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyApsisSearchResult> {
    const r = this.transport.call<R.BodyApsisSearchResult>(3, {
      body_id: bodyId,
      kind: kind,
      jd_start_tt: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_body_plane_node_tt. */
  searchPlaneNodeFromTt(
    bodyId: number,
    kind: number,
    start: JulianDate<"TT">,
    options: {
      referenceFrameId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyNodeSearchResult> {
    const r = this.transport.call<R.BodyNodeSearchResult>(4, {
      body_id: bodyId,
      kind: kind,
      jd_start_tt: start,
      reference_frame_id: options.referenceFrameId ?? 4,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_body_osculating_orbit_ut. */
  osculatingAtUt1(
    bodyId: number,
    ut1: JulianDate<"UT1">,
    options: {
      referenceFrameId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyOsculatingOrbit> {
    const r = this.transport.call<R.BodyOsculatingOrbit>(15, {
      body_id: bodyId,
      jd_ut: ut1,
      reference_frame_id: options.referenceFrameId ?? 4,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_body_orbit_reference_points_ut. */
  referencePointsAtUt1(
    bodyId: number,
    ut1: JulianDate<"UT1">,
    options: {
      referenceFrameId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyOrbitReferencePoints> {
    const r = this.transport.call<R.BodyOrbitReferencePoints>(16, {
      body_id: bodyId,
      jd_ut: ut1,
      reference_frame_id: options.referenceFrameId ?? 4,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_body_apsis_ut. */
  searchApsisFromUt1(
    bodyId: number,
    kind: number,
    start: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyApsisSearchResult> {
    const r = this.transport.call<R.BodyApsisSearchResult>(17, {
      body_id: bodyId,
      kind: kind,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_body_plane_node_ut. */
  searchPlaneNodeFromUt1(
    bodyId: number,
    kind: number,
    start: JulianDate<"UT1">,
    options: {
      referenceFrameId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyNodeSearchResult> {
    const r = this.transport.call<R.BodyNodeSearchResult>(18, {
      body_id: bodyId,
      kind: kind,
      jd_start_ut: start,
      reference_frame_id: options.referenceFrameId ?? 4,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
}
export class EventsApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_search_solar_longitude_tt. */
  solarLongitudeAtTt(
    targetLongitudeRad: number,
    estimate: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<JulianDate<"TT">> {
    const r = this.transport.call<JulianDate<"TT">>(5, {
      target_longitude_rad: targetLongitudeRad,
      estimate_jd_tt: estimate,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_moon_longitude_tt. */
  moonLongitudeAtTt(
    targetLongitudeRad: number,
    estimate: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<JulianDate<"TT">> {
    const r = this.transport.call<JulianDate<"TT">>(6, {
      target_longitude_rad: targetLongitudeRad,
      estimate_jd_tt: estimate,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_body_longitude_crossings_tt. */
  longitudeCrossingsAtTt(
    bodyId: number,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      targetLongitudeRad: number;
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<readonly JulianDate<"TT">[]> {
    const r = this.transport.call<readonly JulianDate<"TT">[]>(7, {
      body_id: bodyId,
      target_longitude_rad: options.targetLongitudeRad,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_body_longitude_stations_tt. */
  longitudeStationsAtTt(
    bodyId: number,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<
    readonly {
      readonly coordinate: JulianDate<"TT">;
      readonly longitudeRad: number;
    }[]
  > {
    const r = this.transport.call<
      readonly {
        readonly coordinate: JulianDate<"TT">;
        readonly longitudeRad: number;
      }[]
    >(8, {
      body_id: bodyId,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_body_aspect_crossings_tt. */
  aspectCrossingsAtTt(
    bodyAId: number,
    bodyBId: number,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      aspectRad: number;
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<readonly JulianDate<"TT">[]> {
    const r = this.transport.call<readonly JulianDate<"TT">[]>(9, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
      aspect_rad: options.aspectRad,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_body_exact_aspects_tt. */
  exactAspectsAtTt(
    bodyAId: number,
    bodyBId: number,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      aspectSeparationsRad: readonly number[];
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<
    readonly {
      readonly coordinate: JulianDate<"TT">;
      readonly targetAspectRad: number;
    }[]
  > {
    const r = this.transport.call<
      readonly {
        readonly coordinate: JulianDate<"TT">;
        readonly targetAspectRad: number;
      }[]
    >(10, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
      aspect_separations_rad: options.aspectSeparationsRad,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_lunar_phase_crossings_tt. */
  lunarPhaseCrossingsAtTt(
    phaseRad: number,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<readonly JulianDate<"TT">[]> {
    const r = this.transport.call<readonly JulianDate<"TT">[]>(11, {
      phase_rad: phaseRad,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_minimum_angular_separation_tt. */
  minimumAngularSeparationAtTt(
    bodyAId: number,
    bodyBId: number,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      maxStepDays?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.AngularSeparationResult> {
    const r = this.transport.call<R.AngularSeparationResult>(12, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_minimum_body_star_angular_separation_tt. */
  minimumBodyStarAngularSeparationAtTt(
    bodyId: number,
    starKey: string,
    start: JulianDate<"TT">,
    end: JulianDate<"TT">,
    options: {
      maxStepDays?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyStarAngularSeparationResult> {
    const r = this.transport.call<R.BodyStarAngularSeparationResult>(13, {
      body_id: bodyId,
      star_key: starKey,
      start_jd_tt: start,
      end_jd_tt: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_solar_longitude_ut. */
  solarLongitudeAtUt1(
    targetLongitudeRad: number,
    estimate: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<JulianDate<"UT1">> {
    const r = this.transport.call<JulianDate<"UT1">>(19, {
      target_longitude_rad: targetLongitudeRad,
      estimate_jd_ut: estimate,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_moon_longitude_ut. */
  moonLongitudeAtUt1(
    targetLongitudeRad: number,
    estimate: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<JulianDate<"UT1">> {
    const r = this.transport.call<JulianDate<"UT1">>(20, {
      target_longitude_rad: targetLongitudeRad,
      estimate_jd_ut: estimate,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_body_longitude_crossings_ut. */
  longitudeCrossingsAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      targetLongitudeRad: number;
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<readonly JulianDate<"UT1">[]> {
    const r = this.transport.call<readonly JulianDate<"UT1">[]>(21, {
      body_id: bodyId,
      target_longitude_rad: options.targetLongitudeRad,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_body_longitude_stations_ut. */
  longitudeStationsAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<
    readonly {
      readonly coordinate: JulianDate<"UT1">;
      readonly longitudeRad: number;
    }[]
  > {
    const r = this.transport.call<
      readonly {
        readonly coordinate: JulianDate<"UT1">;
        readonly longitudeRad: number;
      }[]
    >(22, {
      body_id: bodyId,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_body_aspect_crossings_ut. */
  aspectCrossingsAtUt1(
    bodyAId: number,
    bodyBId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      aspectRad: number;
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<readonly JulianDate<"UT1">[]> {
    const r = this.transport.call<readonly JulianDate<"UT1">[]>(23, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
      aspect_rad: options.aspectRad,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_body_exact_aspects_ut. */
  exactAspectsAtUt1(
    bodyAId: number,
    bodyBId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      aspectSeparationsRad: readonly number[];
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<
    readonly {
      readonly coordinate: JulianDate<"UT1">;
      readonly targetAspectRad: number;
    }[]
  > {
    const r = this.transport.call<
      readonly {
        readonly coordinate: JulianDate<"UT1">;
        readonly targetAspectRad: number;
      }[]
    >(24, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
      aspect_separations_rad: options.aspectSeparationsRad,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_lunar_phase_crossings_ut. */
  lunarPhaseCrossingsAtUt1(
    phaseRad: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      maxStepDays?: number;
      maxResults?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<readonly JulianDate<"UT1">[]> {
    const r = this.transport.call<readonly JulianDate<"UT1">[]>(25, {
      phase_rad: phaseRad,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      max_results: options.maxResults ?? 128,
    });
    return r;
  }
  /** C++ taiyin_search_minimum_angular_separation_ut. */
  minimumAngularSeparationAtUt1(
    bodyAId: number,
    bodyBId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      maxStepDays?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.AngularSeparationResult> {
    const r = this.transport.call<R.AngularSeparationResult>(26, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_minimum_body_star_angular_separation_ut. */
  minimumBodyStarAngularSeparationAtUt1(
    bodyId: number,
    starKey: string,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      maxStepDays?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.BodyStarAngularSeparationResult> {
    const r = this.transport.call<R.BodyStarAngularSeparationResult>(27, {
      body_id: bodyId,
      star_key: starKey,
      start_jd_ut: start,
      end_jd_ut: end,
      max_step_days: options.maxStepDays ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_recommended_longitude_search_step_days. */
  recommendedLongitudeSearchStepDays(bodyId: number): number {
    const r = this.transport.call<number>(43, { body_id: bodyId });
    return r.value;
  }
  /** C++ taiyin_recommended_aspect_search_step_days. */
  recommendedAspectSearchStepDays(bodyAId: number, bodyBId: number): number {
    const r = this.transport.call<number>(44, {
      body_a_id: bodyAId,
      body_b_id: bodyBId,
    });
    return r.value;
  }
  /** C++ taiyin_search_greatest_elongation_ut. */
  greatestElongationAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.GreatestElongationResult> {
    const r = this.transport.call<R.GreatestElongationResult>(45, {
      body_id: bodyId,
      start_jd_ut: start,
      end_jd_ut: end,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_solar_transit_ut. */
  nextSolarTransitAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.SolarTransitResult> {
    const r = this.transport.call<R.SolarTransitResult>(46, {
      body_id: bodyId,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_local_solar_transit_ut. */
  localSolarTransitAtUt1(
    globalTransit: R.SolarTransitResult,
    options: {
      longitudeDeg: number;
      latitudeDeg: number;
      heightM: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.LocalSolarTransitResult> {
    const r = this.transport.call<R.LocalSolarTransitResult>(47, {
      global_transit: globalTransit,
      longitude_deg: options.longitudeDeg,
      latitude_deg: options.latitudeDeg,
      height_m: options.heightM,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_local_solar_transit_ut. */
  nextLocalSolarTransitAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      longitudeDeg: number;
      latitudeDeg: number;
      heightM: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.LocalSolarTransitResult> {
    const r = this.transport.call<R.LocalSolarTransitResult>(48, {
      body_id: bodyId,
      jd_start_ut: start,
      longitude_deg: options.longitudeDeg,
      latitude_deg: options.latitudeDeg,
      height_m: options.heightM,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
}
export class VisibilityApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_search_moon_rise_set_ut. */
  moonRiseSetAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      limbKind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(28, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      limb_kind: options.limbKind ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_moon_rise_set_at_horizon_ut. */
  moonRiseSetAtHorizonAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      limbKind?: number;
      horizonAltitudeRad: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(29, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      limb_kind: options.limbKind ?? 1,
      horizon_altitude_rad: options.horizonAltitudeRad,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_moon_transit_ut. */
  moonTransitAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: { eventKind?: number } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(30, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 3,
    });
    return r;
  }
  /** C++ taiyin_search_planet_rise_set_ut. */
  planetRiseSetAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      limbKind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(31, {
      body_id: bodyId,
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      limb_kind: options.limbKind ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_planet_rise_set_at_horizon_ut. */
  planetRiseSetAtHorizonAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      limbKind?: number;
      horizonAltitudeRad: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(32, {
      body_id: bodyId,
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      limb_kind: options.limbKind ?? 1,
      horizon_altitude_rad: options.horizonAltitudeRad,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_planet_transit_ut. */
  planetTransitAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(33, {
      body_id: bodyId,
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 3,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_solar_rise_set_ut. */
  solarRiseSetAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      limbKind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(34, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      limb_kind: options.limbKind ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_solar_rise_set_at_horizon_ut. */
  solarRiseSetAtHorizonAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      limbKind?: number;
      horizonAltitudeRad: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(35, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      limb_kind: options.limbKind ?? 1,
      horizon_altitude_rad: options.horizonAltitudeRad,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_solar_transit_ut. */
  solarTransitAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: { eventKind?: number } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(36, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 3,
    });
    return r;
  }
  /** C++ taiyin_search_star_rise_set_ut. */
  starRiseSetAtUt1(
    starKey: string,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(37, {
      star_key: starKey,
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_star_rise_set_at_horizon_ut. */
  starRiseSetAtHorizonAtUt1(
    starKey: string,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      horizonAltitudeRad: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(38, {
      star_key: starKey,
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      horizon_altitude_rad: options.horizonAltitudeRad,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_star_transit_ut. */
  starTransitAtUt1(
    starKey: string,
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: { eventKind?: number } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(39, {
      star_key: starKey,
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 3,
    });
    return r;
  }
  /** C++ taiyin_search_solar_twilight_ut. */
  solarTwilightAtUt1(
    start: JulianDate<"UT1">,
    end: JulianDate<"UT1">,
    options: { eventKind?: number; twilightKind?: number } = {},
  ): OperationResult<R.VisibilityEventResult> {
    const r = this.transport.call<R.VisibilityEventResult>(40, {
      start_jd_ut: start,
      end_jd_ut: end,
      event_kind: options.eventKind ?? 1,
      twilight_kind: options.twilightKind ?? 1,
    });
    return r;
  }
  /** C++ taiyin_compute_solar_rise_set_fast_tt. */
  solarRiseSetFastAtTt(
    coordinate: JulianDate<"TT">,
    options: {
      longitudeDeg: number;
      latitudeDeg: number;
      heightM: number;
      limbKind?: number;
      horizonAltitudeRad: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.SolarRiseSetFastResult> {
    const r = this.transport.call<R.SolarRiseSetFastResult>(41, {
      center_jd_tt: coordinate,
      longitude_deg: options.longitudeDeg,
      latitude_deg: options.latitudeDeg,
      height_m: options.heightM,
      limb_kind: options.limbKind ?? 1,
      horizon_altitude_rad: options.horizonAltitudeRad,
      visibility_flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_solar_transit_fast_tt. */
  solarTransitFastAtTt(
    coordinate: JulianDate<"TT">,
    options: { longitudeDeg: number; latitudeDeg: number; heightM: number },
  ): OperationResult<R.SolarTransitFastResult> {
    const r = this.transport.call<R.SolarTransitFastResult>(42, {
      center_jd_tt: coordinate,
      longitude_deg: options.longitudeDeg,
      latitude_deg: options.latitudeDeg,
      height_m: options.heightM,
    });
    return r;
  }
}
export class HeliacalApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_calc_body_heliacal_visibility_ut. */
  bodyAtUt1(
    bodyId: number,
    ut1: JulianDate<"UT1">,
    options: {
      conditions?: Partial<R.HeliacalVisibilityConditions>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.HeliacalVisibilityResult> {
    const r = this.transport.call<R.HeliacalVisibilityResult>(49, {
      body_id: bodyId,
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      conditions: options.conditions,
    });
    return r;
  }
  /** C++ taiyin_search_next_body_heliacal_visibility_ut. */
  nextBodyEventAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      maxSearchDays: number;
      conditions?: Partial<R.HeliacalVisibilityConditions>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.HeliacalVisibilitySearchResult> {
    const r = this.transport.call<R.HeliacalVisibilitySearchResult>(50, {
      body_id: bodyId,
      jd_start_ut: start,
      event_kind: options.eventKind ?? 1,
      max_search_days: options.maxSearchDays,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      conditions: options.conditions,
    });
    return r;
  }
  /** C++ taiyin_calc_star_heliacal_visibility_ut. */
  starAtUt1(
    starKey: string,
    ut1: JulianDate<"UT1">,
    options: {
      conditions?: Partial<R.HeliacalVisibilityConditions>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.HeliacalVisibilityResult> {
    const r = this.transport.call<R.HeliacalVisibilityResult>(57, {
      star_key: starKey,
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      conditions: options.conditions,
    });
    return r;
  }
  /** C++ taiyin_search_next_star_heliacal_visibility_ut. */
  nextStarEventAtUt1(
    starKey: string,
    start: JulianDate<"UT1">,
    options: {
      eventKind?: number;
      maxSearchDays: number;
      conditions?: Partial<R.HeliacalVisibilityConditions>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.HeliacalVisibilitySearchResult> {
    const r = this.transport.call<R.HeliacalVisibilitySearchResult>(58, {
      star_key: starKey,
      jd_start_ut: start,
      event_kind: options.eventKind ?? 1,
      max_search_days: options.maxSearchDays,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      conditions: options.conditions,
    });
    return r;
  }
}
export class OccultationsApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_search_next_geocentric_lunar_body_occultation_ut. */
  nextGeocentricBodyAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationResult> {
    const r = this.transport.call<R.LunarOccultationResult>(51, {
      body_id: bodyId,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_geocentric_lunar_body_occultation_with_radius_ut. */
  nextGeocentricBodyWithRadiusAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      targetRadiusKm: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.LunarOccultationResult> {
    const r = this.transport.call<R.LunarOccultationResult>(52, {
      body_id: bodyId,
      target_radius_km: options.targetRadiusKm,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_local_lunar_body_occultation_ut. */
  nextLocalBodyAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationResult> {
    const r = this.transport.call<R.LunarOccultationResult>(53, {
      body_id: bodyId,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_local_lunar_body_occultation_with_radius_ut. */
  nextLocalBodyWithRadiusAtUt1(
    bodyId: number,
    start: JulianDate<"UT1">,
    options: {
      targetRadiusKm: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.LunarOccultationResult> {
    const r = this.transport.call<R.LunarOccultationResult>(54, {
      body_id: bodyId,
      target_radius_km: options.targetRadiusKm,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_lunar_body_occultation_local_visibility_ut. */
  localBodyVisibilityAtUt1(
    bodyId: number,
    occultation: R.LunarOccultationResult,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationLocalVisibility> {
    const r = this.transport.call<R.LunarOccultationLocalVisibility>(55, {
      body_id: bodyId,
      occultation: occultation,
      visibility_flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_lunar_body_occultation_where_ut. */
  bodyWhereAtUt1(
    bodyId: number,
    occultation: R.LunarOccultationResult,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationWhereResult> {
    const r = this.transport.call<R.LunarOccultationWhereResult>(56, {
      body_id: bodyId,
      occultation: occultation,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_geocentric_lunar_star_occultation_ut. */
  nextGeocentricStarAtUt1(
    starKey: string,
    start: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationResult> {
    const r = this.transport.call<R.LunarOccultationResult>(59, {
      star_key: starKey,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_search_next_local_lunar_star_occultation_ut. */
  nextLocalStarAtUt1(
    starKey: string,
    start: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationResult> {
    const r = this.transport.call<R.LunarOccultationResult>(60, {
      star_key: starKey,
      jd_start_ut: start,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_lunar_star_occultation_local_visibility_ut. */
  localStarVisibilityAtUt1(
    starKey: string,
    occultation: R.LunarOccultationResult,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationLocalVisibility> {
    const r = this.transport.call<R.LunarOccultationLocalVisibility>(61, {
      star_key: starKey,
      occultation: occultation,
      visibility_flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_lunar_star_occultation_where_ut. */
  starWhereAtUt1(
    starKey: string,
    occultation: R.LunarOccultationResult,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarOccultationWhereResult> {
    const r = this.transport.call<R.LunarOccultationWhereResult>(62, {
      star_key: starKey,
      occultation: occultation,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_compute_lunar_body_occultation_where_with_radius_ut. */
  bodyWhereWithRadiusAtUt1(
    bodyId: number,
    occultation: R.LunarOccultationResult,
    options: {
      targetRadiusKm: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    },
  ): OperationResult<R.LunarOccultationWhereResult> {
    const r = this.transport.call<R.LunarOccultationWhereResult>(63, {
      body_id: bodyId,
      target_radius_km: options.targetRadiusKm,
      occultation: occultation,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
}
export class AstrologyApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_calc_ayanamsha_tt. */
  ayanamshaAtTt(
    tt: JulianDate<"TT">,
    options: {
      ayanamshaId?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<number> {
    const r = this.transport.call<number>(64, {
      ayanamsha_id: options.ayanamshaId ?? 1,
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_sidereal_position_tt. */
  siderealPositionAtTt(
    bodyId: number,
    tt: JulianDate<"TT">,
    options: {
      ayanamshaId?: number;
      referenceEpoch?: JulianDate<TimeScale>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.SiderealPosition> {
    const r = this.transport.call<R.SiderealPosition>(65, {
      ayanamsha_id: options.ayanamshaId ?? 1,
      body_id: bodyId,
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      reference_epoch_jd: options.referenceEpoch,
    });
    return r;
  }
  /** C++ taiyin_calc_sidereal_coordinates_tt. */
  siderealCoordinatesAtTt(
    bodyId: number,
    tt: JulianDate<"TT">,
    options: {
      ayanamshaId?: number;
      referenceEpoch?: JulianDate<TimeScale>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.SiderealCoordinates> {
    const r = this.transport.call<R.SiderealCoordinates>(66, {
      ayanamsha_id: options.ayanamshaId ?? 1,
      body_id: bodyId,
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      reference_epoch_jd: options.referenceEpoch,
    });
    return r;
  }
  /** C++ taiyin_calc_houses_tt. */
  housesAtTt(
    tt: JulianDate<"TT">,
    options: { houseSystemId?: number } = {},
  ): OperationResult<R.HouseResult> {
    const r = this.transport.call<R.HouseResult>(67, {
      jd_tt: tt,
      house_system_id: options.houseSystemId ?? 3,
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_true_node_tt. */
  lunarTrueNodeAtTt(
    tt: JulianDate<"TT">,
    options: {
      kind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarNodePosition> {
    const r = this.transport.call<R.LunarNodePosition>(68, {
      jd_tt: tt,
      kind: options.kind ?? 0,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_mean_node_tt. */
  lunarMeanNodeAtTt(
    tt: JulianDate<"TT">,
    options: {
      kind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarNodePosition> {
    const r = this.transport.call<R.LunarNodePosition>(69, {
      jd_tt: tt,
      kind: options.kind ?? 0,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_mean_apogee_tt. */
  lunarMeanApogeeAtTt(
    tt: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarApsisPosition> {
    const r = this.transport.call<R.LunarApsisPosition>(70, {
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_osculating_apogee_tt. */
  lunarOsculatingApogeeAtTt(
    tt: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarApsisPosition> {
    const r = this.transport.call<R.LunarApsisPosition>(71, {
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_fitted_apogee_tt. */
  lunarFittedApogeeAtTt(
    tt: JulianDate<"TT">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarApsisPosition> {
    const r = this.transport.call<R.LunarApsisPosition>(72, {
      jd_tt: tt,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_sidereal_position_ut. */
  siderealPositionAtUt1(
    bodyId: number,
    ut1: JulianDate<"UT1">,
    options: {
      ayanamshaId?: number;
      referenceEpoch?: JulianDate<TimeScale>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.SiderealPosition> {
    const r = this.transport.call<R.SiderealPosition>(73, {
      ayanamsha_id: options.ayanamshaId ?? 1,
      body_id: bodyId,
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      reference_epoch_jd: options.referenceEpoch,
    });
    return r;
  }
  /** C++ taiyin_calc_sidereal_coordinates_ut. */
  siderealCoordinatesAtUt1(
    bodyId: number,
    ut1: JulianDate<"UT1">,
    options: {
      ayanamshaId?: number;
      referenceEpoch?: JulianDate<TimeScale>;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.SiderealCoordinates> {
    const r = this.transport.call<R.SiderealCoordinates>(74, {
      ayanamsha_id: options.ayanamshaId ?? 1,
      body_id: bodyId,
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
      reference_epoch_jd: options.referenceEpoch,
    });
    return r;
  }
  /** C++ taiyin_calc_houses_ut. */
  housesAtUt1(
    ut1: JulianDate<"UT1">,
    options: { houseSystemId?: number } = {},
  ): OperationResult<R.HouseResult> {
    const r = this.transport.call<R.HouseResult>(75, {
      jd_ut: ut1,
      house_system_id: options.houseSystemId ?? 3,
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_true_node_ut. */
  lunarTrueNodeAtUt1(
    ut1: JulianDate<"UT1">,
    options: {
      kind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarNodePosition> {
    const r = this.transport.call<R.LunarNodePosition>(76, {
      jd_ut: ut1,
      kind: options.kind ?? 0,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_mean_node_ut. */
  lunarMeanNodeAtUt1(
    ut1: JulianDate<"UT1">,
    options: {
      kind?: number;
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarNodePosition> {
    const r = this.transport.call<R.LunarNodePosition>(77, {
      jd_ut: ut1,
      kind: options.kind ?? 0,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_mean_apogee_ut. */
  lunarMeanApogeeAtUt1(
    ut1: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarApsisPosition> {
    const r = this.transport.call<R.LunarApsisPosition>(78, {
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_osculating_apogee_ut. */
  lunarOsculatingApogeeAtUt1(
    ut1: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarApsisPosition> {
    const r = this.transport.call<R.LunarApsisPosition>(79, {
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_lunar_fitted_apogee_ut. */
  lunarFittedApogeeAtUt1(
    ut1: JulianDate<"UT1">,
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): OperationResult<R.LunarApsisPosition> {
    const r = this.transport.call<R.LunarApsisPosition>(80, {
      jd_ut: ut1,
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return r;
  }
  /** C++ taiyin_calc_houses_from_armc. */
  housesFromArmc(options: {
    armcRad: number;
    observerLatitudeRad: number;
    trueObliquityRad: number;
    houseSystemId?: number;
  }): OperationResult<R.HouseResult> {
    const r = this.transport.call<R.HouseResult>(81, {
      armc_rad: options.armcRad,
      observer_latitude_rad: options.observerLatitudeRad,
      true_obliquity_rad: options.trueObliquityRad,
      house_system_id: options.houseSystemId ?? 3,
    });
    return r;
  }
  /** C++ taiyin_calc_house_position_from_longitude. */
  housePositionOf(
    houses: R.HouseResult,
    eclipticLongitudeRad: number,
  ): OperationResult<R.HousePositionResult> {
    const r = this.transport.call<R.HousePositionResult>(82, {
      houses: houses,
      ecliptic_longitude_rad: eclipticLongitudeRad,
    });
    return r;
  }
  /** C++ taiyin_has_house_system_model. */
  hasHouseSystemModel(modelId: number): boolean {
    const r = this.transport.call<number>(83, { model_id: modelId });
    return !!r.value;
  }
  /** C++ taiyin_has_ayanamsha_model. */
  hasAyanamshaModel(modelId: number): boolean {
    const r = this.transport.call<number>(84, { model_id: modelId });
    return !!r.value;
  }
}
export class AdditionalContextConfiguration {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_context_set_atmosphere. */
  setAtmosphere(options: { atmosphere: R.Atmosphere }): void {
    const r = this.transport.call<void>(85, { atmosphere: options.atmosphere });
    return;
  }
  /** C++ taiyin_context_set_atmosphere_pressure_temperature. */
  setAtmospherePressureTemperature(options: {
    pressureMbar: number;
    temperatureCelsius: number;
  }): void {
    const r = this.transport.call<void>(86, {
      pressure_mbar: options.pressureMbar,
      temperature_celsius: options.temperatureCelsius,
    });
    return;
  }
  /** C++ taiyin_context_set_standard_atmosphere. */
  setStandardAtmosphere(): void {
    const r = this.transport.call<void>(87, {});
    return;
  }
  /** C++ taiyin_context_set_atmosphere_policy. */
  setAtmospherePolicy(
    options: {
      positionFlags?: PositionFlags;
      options?: bigint | number;
      flags?: bigint | number;
    } = {},
  ): void {
    const r = this.transport.call<void>(88, {
      flags:
        options.flags ??
        BigInt(positionMask(options.positionFlags)) |
          BigInt(options.options ?? 0),
    });
    return;
  }
  /** C++ taiyin_context_set_meteorological_range_km. */
  setMeteorologicalRangeKm(options: { rangeKm: number }): void {
    const r = this.transport.call<void>(89, { range_km: options.rangeKm });
    return;
  }
  /** C++ taiyin_context_set_topocentric_observer_offset. */
  setTopocentricObserverOffset(options: {
    observerOffset: R.NativeCartesianState;
  }): void {
    const r = this.transport.call<void>(90, {
      observer_offset: options.observerOffset,
    });
    return;
  }
  /** C++ taiyin_context_set_simple_topocentric_observer. */
  setSimpleTopocentricObserver(options: {
    location: R.ObserverLocation;
    ut1: JulianDate<"UT1">;
    tt: JulianDate<"TT">;
  }): void {
    const r = this.transport.call<void>(91, {
      location: options.location,
      jd_ut1: options.ut1,
      jd_tt: options.tt,
    });
    return;
  }
  /** C++ taiyin_context_set_precise_topocentric_observer. */
  setPreciseTopocentricObserver(options: {
    location: R.ObserverLocation;
    utc: JulianDate<"UTC">;
    tt: JulianDate<"TT">;
  }): void {
    const r = this.transport.call<void>(92, {
      location: options.location,
      jd_utc: options.utc,
      jd_tt: options.tt,
    });
    return;
  }
  /** C++ taiyin_context_set_celestial_pole_offset. */
  setCelestialPoleOffset(options: {
    dxRad: number;
    dyRad: number;
    dxRateRadPerDay: number;
    dyRateRadPerDay: number;
  }): void {
    const r = this.transport.call<void>(93, {
      dx_rad: options.dxRad,
      dy_rad: options.dyRad,
      dx_rate_rad_per_day: options.dxRateRadPerDay,
      dy_rate_rad_per_day: options.dyRateRadPerDay,
    });
    return;
  }
  /** C++ taiyin_context_set_refraction_model. */
  setRefractionModel(options: { refractionModelId: number }): void {
    const r = this.transport.call<void>(94, {
      refraction_model_id: options.refractionModelId,
    });
    return;
  }
  /** C++ taiyin_context_set_heliacal_visibility_model. */
  setHeliacalVisibilityModel(options: { modelId: number }): void {
    const r = this.transport.call<void>(95, { model_id: options.modelId });
    return;
  }
  /** C++ taiyin_context_set_deflectors. */
  setDeflectors(options: {
    deflectors: readonly R.ApparentDeflector[];
    solarDeflectorIndex: number;
  }): void {
    const r = this.transport.call<void>(96, {
      deflectors: options.deflectors,
      solar_deflector_index: options.solarDeflectorIndex,
    });
    return;
  }
  /** C++ taiyin_context_set_eclipse_models. */
  setEclipseModels(options: {
    shadowModelId: number;
    moonRadiusModelId: number;
  }): void {
    const r = this.transport.call<void>(97, {
      shadow_model_id: options.shadowModelId,
      moon_radius_model_id: options.moonRadiusModelId,
    });
    return;
  }
  /** C++ taiyin_context_enable_shapiro_delay. */
  enableShapiroDelay(shapiroDelayModelId: number): void {
    const r = this.transport.call<void>(98, {
      shapiro_delay_model_id: shapiroDelayModelId,
    });
    return;
  }
  /** C++ taiyin_context_disable_shapiro_delay. */
  disableShapiroDelay(): void {
    const r = this.transport.call<void>(99, {});
    return;
  }
}
export class SourceManagementApi {
  private readonly transport: AstronomyTransport;
  constructor(host: ContextHost) {
    this.transport = new AstronomyTransport(host);
  }
  /** C++ taiyin_runtime_set_ephemeris_source_priority. */
  setEphemerisSourcePriority(
    pathOrBasename: string,
    priority: number,
  ): OperationResult<void> {
    const r = this.transport.call<void>(100, {
      path_or_basename: pathOrBasename,
      priority: priority,
    });
    return r;
  }
  /** C++ taiyin_runtime_clear_ephemeris_source_priority. */
  clearEphemerisSourcePriority(pathOrBasename: string): OperationResult<void> {
    const r = this.transport.call<void>(101, {
      path_or_basename: pathOrBasename,
    });
    return r;
  }
  /** C++ taiyin_runtime_clear_all_ephemeris_source_priorities. */
  clearAllEphemerisSourcePriorities(): void {
    const r = this.transport.call<void>(102, {});
    return;
  }
  /** C++ taiyin_runtime_clear_ephemeris_cache. */
  clearEphemerisCache(): void {
    const r = this.transport.call<void>(103, {});
    return;
  }
  /** C++ taiyin_runtime_catalog_size. */
  catalogSize(): number {
    const r = this.transport.call<number>(104, {});
    return r.value;
  }
  /** C++ taiyin_runtime_cache_entry_count. */
  cacheEntryCount(): number {
    const r = this.transport.call<number>(105, {});
    return r.value;
  }
  /** C++ taiyin_register_builtin_astrology_targets. */
  registerBuiltinAstrologyTargets(): OperationResult<void> {
    const r = this.transport.call<void>(106, {});
    return r;
  }
}
