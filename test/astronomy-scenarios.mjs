import * as E from "../dist/index.js";
import { astronomyOperations } from "../dist/internal/astronomy-operations.generated.js";
export const starText = `TSF1
version=1
star_count=1
star.0.id=test-star
star.0.name=Test star
star.0.ra_deg=158.79249699787576
star.0.dec_deg=12.75481385923688
star.0.reference_epoch=2000
star.0.pm_ra_mas_yr=0
star.0.pm_dec_mas_yr=0
star.0.parallax_mas=1000
star.0.radial_velocity_km_s=2
star.0.magnitude=1
`;
const label = (a) =>
  /^jd(?:_|$)|_jd(?:_|$)/.test(a.name)
    ? /reference_epoch/.test(a.name)
      ? "referenceEpoch"
      : /start/.test(a.name)
        ? "start"
        : /end/.test(a.name)
          ? "end"
          : /estimate/.test(a.name)
            ? "estimate"
            : a.name === "jd_tt"
              ? "tt"
              : a.name === "jd_utc"
                ? "utc"
                : a.name === "jd_ut1" || a.name === "jd_ut"
                  ? "ut1"
                  : "coordinate"
    : a.name.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
/** Exercise every generated public method and each variable-size entry point. */
export function runAstronomyScenarios(eph) {
  let assertions = 0;
  const check = (v, m) => {
    assertions++;
    if (!v) throw Error(m);
  };
  const ctx = eph.createContext();
  const base = E.Ut1JulianDate.fromDouble(2460310.5);
  const observer = { longitudeDeg: 118.582, latitudeDeg: 37.449, heightM: 80 };
  const location = {
    longitudeDegrees: observer.longitudeDeg,
    latitudeDegrees: observer.latitudeDeg,
    heightMeters: 80,
  };
  ctx.configuration.setObserverLocation(location);
  ctx.configuration.setStandardAtmosphere();
  ctx.configuration.setMeteorologicalRangeKm({ rangeKm: 40 });
  eph.loadStarAliasesBytes(new TextEncoder().encode(starText), {
    filename: "astronomy-stars.tsf1",
  });
  const houses = ctx.astrology.housesAtUt1(base).value;
  const stats = { success: [], nativeErrors: [] };
  let occultation;
  try {
    occultation = ctx.occultations.nextGeocentricStarAtUt1(
      "test-star",
      base.addDays(-2),
      { options: E.OccultationOption.oneCandidate },
    ).value;
  } catch {}
  // A deliberately non-detection-shaped record can still be passed back to
  // native visibility/where for its documented error, without inventing events.
  occultation ??= {
    kind: 1,
    typeFlags: 0,
    julianDateUt1: base,
    beginJulianDateUt1: null,
    endJulianDateUt1: null,
    firstContactJulianDateUt1: null,
    secondContactJulianDateUt1: null,
    thirdContactJulianDateUt1: null,
    fourthContactJulianDateUt1: null,
    separationRad: 0.1,
    moonRadiusRad: 0.004,
    targetRadiusRad: 0,
    marginRad: 0.096,
    phenomena: {
      angularDistanceRad: 0.1,
      diameterRatio: 0,
      magnitude: 0,
      obscuration: 0,
      occultedFraction: 0,
    },
    candidateJulianDateUt1: base,
    nextSearchJulianDateUt1: base.addDays(30),
    candidateCount: 1,
    iterationCount: 0,
    evaluationCount: 0,
  };
  let transit;
  try {
    transit = ctx.events.nextSolarTransitAtUt1(
      199,
      E.Ut1JulianDate.fromDouble(2457500.5),
    ).value;
  } catch {}
  const values = (a, s) => {
    const n = a.name;
    if (a.type === "taiyin_split_julian_date") {
      if (n === "reference_epoch_jd") return undefined;
      let jd = s.group === "occultations" ? base.addDays(-2) : base;
      if (n.includes("end"))
        jd = base.addDays(s.group === "visibility" ? 1 : 40);
      if (n.includes("estimate")) jd = base.addDays(10);
      return new E.JulianDate(
        jd.dayNumber,
        jd.dayFraction,
        n.includes("utc") ? "UTC" : n.endsWith("_tt") ? "TT" : "UT1",
      );
    }
    if (n === "flags" || n === "visibility_flags")
      return s.group === "occultations" && s.method.startsWith("next")
        ? E.OccultationOption.oneCandidate
        : s.group === "configuration"
          ? 1n
          : 0n;
    if (n === "body_id")
      return s.group === "orbits" ||
        s.group === "phenomena" ||
        (s.group === "events" &&
          !s.method.includes("Transit") &&
          !s.method.includes("Elongation"))
        ? 301
        : s.group === "events"
          ? 199
          : 299;
    if (n === "body_a_id") return 10;
    if (n === "body_b_id") return 301;
    if (n === "star_key") return "test-star";
    if (n === "occultation") return occultation;
    if (n === "global_transit") return transit;
    if (n === "houses") return houses;
    if (n === "max_search_days") return 2;
    if (n === "aspect_separations_rad") return [0, Math.PI];
    if (n === "max_results") return 32;
    if (n === "max_step_days") return 1;
    if (n === "conditions") return undefined;
    if (n === "reference_frame_id") return E.ApparentFrame.j2000Ecliptic;
    if (n === "ayanamsha_id") return E.Ayanamsha.lahiri;
    if (n === "house_system_id") return E.HouseSystem.placidus;
    if (n === "event_kind")
      return s.group === "visibility" && s.method.includes("Transit") ? 3 : 1;
    if (n === "limb_kind" || n === "twilight_kind") return 1;
    if (n === "location") return observer;
    if (n === "atmosphere")
      return {
        pressureMbar: 1013.25,
        temperatureCelsius: 15,
        relativeHumidityPercent: 50,
        wavelengthMicrometer: 0.55,
      };
    if (n === "observer_offset")
      return {
        positionAu: { x: 0, y: 0, z: 0 },
        velocityAuPerDay: { x: 0, y: 0, z: 0 },
        accelerationAuPerDay2: { x: 0, y: 0, z: 0 },
      };
    if (n === "deflectors")
      return [
        { bodyId: 10, schwarzschildRadiusAu: 1.97412574336e-8, limit: 1e-6 },
      ];
    if (n === "solar_deflector_index") return 0;
    if (n === "path_or_basename") return "test.opm2";
    if (n === "priority") return -100;
    if (n === "model_id") return 0;
    if (n === "pressure_mbar") return 1013.25;
    if (n === "temperature_celsius") return 15;
    if (n === "range_km") return 40;
    if (n === "longitude_deg") return observer.longitudeDeg;
    if (n === "latitude_deg") return observer.latitudeDeg;
    if (n === "height_m") return 80;
    if (n === "observer_latitude_rad") return (37.449 * Math.PI) / 180;
    if (n === "true_obliquity_rad") return 0.409;
    if (n === "target_radius_km") return 6000;
    return 0;
  };
  try {
    // Mutating setup calls run last, in the same order for Wasm and native oracle.
    const sorted = [...astronomyOperations].sort(
      (a, b) =>
        (a.group === "configuration" || a.group === "sources") -
          (b.group === "configuration" || b.group === "sources") || a.id - b.id,
    );
    for (const s of sorted) {
      const args = s.pos.map((name) =>
        values(
          s.inputs.find((a) => a.name === name),
          s,
        ),
      );
      const options = {};
      for (const a of s.inputs)
        if (!s.pos.includes(a.name)) options[label(a)] = values(a, s);
      if (s.inputs.some((a) => !s.pos.includes(a.name))) args.push(options);
      const api =
        s.group === "configuration"
          ? ctx.configuration
          : s.group === "sources"
            ? eph.sources
            : ctx[s.group];
      try {
        const r = api[s.method](...args);
        check(
          r !== undefined || s.group === "configuration" || s.ret === "void",
          `${s.name} result`,
        );
        if (r?.flags)
          check(r.flags instanceof E.ResultFlags, "per-call result flags");
        stats.success.push(s.method);
      } catch (error) {
        check(
          error instanceof E.EphemerisError,
          `${s.name}: JS/transport failure ${error.stack}`,
        );
        stats.nativeErrors.push({ method: s.method, status: error.status });
      }
    }
    check(
      stats.success.length >= 70,
      "Expected most operations to calculate successfully",
    );
    ctx.configuration.reset();
    ctx.configuration.setObserverLocation(location);
    ctx.configuration.setStandardAtmosphere();
    // Restore the same setup for each newly instantiated oracle context too.
    const star = ctx.stars.atUt1("test-star", base, {
      flags: [E.PositionFlag.speed],
    }).value;
    check(star.values.every(Number.isFinite), "stellar position");
    const batch = ctx.stars.batchAtUt1(["test-star", "test-star"], base, {
      flags: [E.PositionFlag.speed],
    }).value;
    check(
      JSON.stringify(batch[0]) === JSON.stringify(star),
      "stellar batch/single parity",
    );
    const tt = E.TtJulianDate.fromDouble(base.toDouble());
    const tdb = ctx.time.ttToTdb(tt).value;
    for (const r of [
      ctx.stars.atTt("test-star", tt),
      ctx.stars.atTdb("test-star", tdb, tt),
      ctx.stars.atUt1WithDeltaT("test-star", base, 69),
      ctx.stars.batchAtTt(["test-star"], tt),
      ctx.stars.batchAtTdb(["test-star"], tdb, tt),
      ctx.stars.batchAtUt1WithDeltaT(["test-star"], base, 69),
    ])
      check(r.flags instanceof E.ResultFlags, "stellar time modes");
    const o = {
      options: E.ObservedOption.horizontal,
      positionFlags: [E.PositionFlag.topocentric],
    };
    for (const r of [
      ctx.observed.atUt1(10, base, o),
      ctx.observed.batchAtUt1([10, 301], base, o),
      ctx.observed.atUtc(10, new Date("2024-01-01T00:00:00Z"), o),
      ctx.observed.batchAtUtc([10, 301], new Date("2024-01-01T00:00:00Z"), o),
      ctx.stars.observedAtUt1("test-star", base, o),
      ctx.stars.observedBatchAtUt1(["test-star", "test-star"], base, o),
    ])
      check(r.flags instanceof E.ResultFlags, "observed modes");
    let caught;
    try {
      ctx.stars.batchAtUt1(["test-star", "missing-star"], base);
    } catch (e) {
      caught = e;
    }
    check(
      caught instanceof E.EphemerisError && caught.diagnostics.length === 2,
      "stellar partial failure diagnostics",
    );
    let bad;
    try {
      ctx.observed.atUt1(10, base, { positionFlags: [E.PositionFlag.xyz] });
    } catch (e) {
      bad = e;
    }
    check(
      bad instanceof E.UnsupportedOperationError,
      "observed representation rejection",
    );
    const sources = eph.registeredDataSources();
    check(
      typeof eph.capabilities === "bigint" && eph.capabilities > 0n,
      "capability uint64 mask",
    );
    check(
      sources.length > 0 &&
        sources.every((s) => typeof s.itemCount === "bigint"),
      "source uint64 metadata",
    );
    check(
      ctx.stars.batchAtUt1([], base).value.length === 0,
      "empty stellar batch",
    );
    ctx.close();
    let closed;
    try {
      ctx.stars.atUt1("test-star", base);
    } catch (e) {
      closed = e;
    }
    check(closed instanceof E.ClosedContextError, "closed stellar context");
  } finally {
    ctx.close();
  }
  return { assertions, ...stats };
}
