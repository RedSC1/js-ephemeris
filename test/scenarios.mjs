// Runs unchanged in Node and a real browser. No FFI or mocked astronomy.
import * as E from "./all-packages.mjs";
export async function runScenarios(eph, { reference, sourceBytes } = {}) {
  let assertions = 0,
    nativeRows = 0,
    maxNativeDifference = 0;
  const completed = [];
  const check = (ok, message) => {
    assertions++;
    if (!ok) throw new Error(message);
  };
  const throws = (fn, Type) => {
    try {
      fn();
    } catch (e) {
      check(e instanceof Type, `Expected ${Type.name}, got ${e}`);
      return e;
    }
    throw new Error(`Expected ${Type.name}`);
  };
  const near = (a, b, tolerance = 1e-9) => {
    check(a.length === b.length, "numeric shape mismatch");
    for (let i = 0; i < a.length; i++) {
      const diff = Math.abs(a[i] - b[i]);
      maxNativeDifference = Math.max(maxNativeDifference, diff);
      check(diff <= tolerance, `numeric mismatch at ${i}: ${a[i]} != ${b[i]}`);
    }
  };
  const truth = (label) =>
    reference?.rows.filter((r) => r.label === label) ?? [];
  const ctx = eph.createContext();
  const tt = E.TtJulianDate.fromParts(2460409, 0.25);
  const ut = E.Ut1JulianDate.fromParts(2460409, 0.25);
  try {
    for (const row of truth("analytic")) {
      const v = ctx.position.atTt(row.body, tt, { flags: row.inputFlags });
      near(v.value.values, row.values);
      check(v.flags.mask === row.flags, "analytic flags");
      nativeRows++;
    }
    for (const body of [
      E.Body.sun,
      E.Body.moon,
      E.Body.marsBarycenter,
      E.Body.jupiterBarycenter,
    ])
      for (const flags of [
        0,
        E.PositionFlag.speed,
        E.PositionFlag.xyz | E.PositionFlag.truePosition,
      ]) {
        const p = ctx.position.atTt(body, tt, { flags });
        check(p.value.values.every(Number.isFinite), "finite position");
        check(ctx.lastDiagnostic.targetId === body, "diagnostic target");
      }
    const bodies = [E.Body.sun, E.Body.moon, E.Body.marsBarycenter];
    const batch = ctx.position.batchAtTt(bodies, tt);
    bodies.forEach((body, i) =>
      near(
        batch.value[i].values,
        ctx.position.atTt(body, tt).value.values,
        1e-12,
      ),
    );
    check(ctx.position.batchAtTt([], tt).value.length === 0, "empty batch");
    const bad = throws(
      () => ctx.position.batchAtTt([E.Body.sun, -123456789, E.Body.moon], tt),
      E.EphemerisRouteError,
    );
    check(bad.diagnostic.targetId === -123456789, "failed batch diagnostic");
    check(bad.diagnostics.length === 3, "complete batch diagnostics");
    const state = ctx.position.stateAtTt(E.Body.moon, tt).value;
    check(Number.isFinite(state.accelerationAuPerDay2.x), "state acceleration");
    throws(() => ctx.position.atTt(E.Body.sun, ut), TypeError);
    throws(() => ctx.position.atTt(2 ** 32 + 10, tt), RangeError);
    completed.push("position/state/batch/diagnostics");

    const date = new E.AstroDateTime(2024, 4, 8, 18, 0, 0, 123456789);
    const jd = ctx.time.julianDay(date, "UTC");
    const reversed = ctx.time.reverseJulianDay(jd.value).value;
    check(
      JSON.stringify(date) === JSON.stringify(reversed),
      "nanosecond calendar roundtrip",
    );
    for (const row of truth("time/julian")) {
      near([jd.value.dayNumber, jd.value.dayFraction], row.values, 1e-12);
      nativeRows++;
    }
    const precise = ctx.time.preciseScalesFromUtc(date, {
      taiMinusUtcSeconds: 37,
      dut1Seconds: 0.1,
    }).value;
    truth("time/precise").forEach((r, i) => {
      const v = [
        precise.utc,
        precise.tai,
        precise.tt,
        precise.ut1,
        precise.tdb,
      ][i];
      near([v.dayNumber, v.dayFraction], r.values, 1e-12);
      nativeRows++;
    });
    for (const model of [0, 1]) {
      const tdb = ctx.time.ttToTdb(precise.tt, { model }).value;
      check(
        Math.abs(
          ctx.time.tdbToTt(tdb, { model }).value.daysUntil(precise.tt) * 86400,
        ) < 1e-8,
        "TDB inverse",
      );
    }
    eph.clearEop();
    throws(() => ctx.time.scalesFromUtc(date), E.EarthOrientationDataError);
    throws(
      () => ctx.position.atUtc(E.Body.sun, date),
      E.EarthOrientationDataError,
    );
    ctx.time.setAllowUtcOutOfRangeEstimate(true);
    const estimate = ctx.time.scalesFromUtc(date);
    check(
      estimate.flags.contains(E.ResultFlag.timeScaleFallback),
      "explicit time fallback flag",
    );
    check(
      Math.abs(
        ctx.time.ut1ToUtc(estimate.value.value.ut1).value.daysUntil(jd.value) *
          86400,
      ) < 1e-7,
      "estimated UTC inverse",
    );
    ctx.time.setAllowUtcOutOfRangeEstimate(false);
    eph.loadBuiltinEop();
    const scales = ctx.time.scalesFromUtc(date).value.value;
    for (const r of [
      ctx.time.ttToUtc(scales.tt),
      ctx.time.taiToUtc(scales.tai),
      ctx.time.tdbToUtc(scales.tdb),
      ctx.time.ut1ToUtc(scales.ut1),
    ])
      check(
        Math.abs(r.value.daysUntil(jd.value) * 86400) < 1e-7,
        "strict inverse UTC",
      );
    const leap = ctx.time.scalesFromUtc(
      new E.AstroDateTime(2016, 12, 31, 23, 59, 60),
    );
    throws(
      () => ctx.time.taiToUtc(leap.value.value.tai),
      E.UtcLeapSecondRepresentationError,
    );
    check(
      Math.abs(
        ctx.time
          .ttToUt1(leap.value.value.tt)
          .value.daysUntil(leap.value.value.ut1) * 86400,
      ) < 1e-7,
      "leap-second TT to UT1",
    );
    completed.push("time/strict-EOP/explicit-estimate/inverses/leap-second");

    if (sourceBytes) {
      for (const [filename, bytes] of Object.entries(sourceBytes))
        eph.loadEphemerisBytes(bytes, { filename });
      throws(
        () =>
          eph.loadEphemerisBytes(sourceBytes["sun.opm2"], {
            filename: "sun.opm2",
          }),
        Error,
      );
      ctx.configuration.setRouteRule(E.RouteRule.opm2);
      for (const row of truth("opm2")) {
        const v = ctx.position.atTt(row.body, tt, { flags: row.inputFlags });
        near(v.value.values, row.values);
        check(v.flags.mask === row.flags, "OPM2 flags");
        nativeRows++;
      }
      ctx.configuration.setRouteRule(E.RouteRule.automatic);
    }
    for (const mode of [0, 1, 2]) {
      const cal = ctx.createChineseCalendar({ mode });
      const l = cal.fromSolar({ year: 2024, month: 2, day: 10 }).value;
      check(
        l.year === 2024 && l.month === 1 && l.day === 1,
        "Chinese New Year",
      );
      const s = cal.fromLunar(l).value;
      check(s.year === 2024 && s.month === 2 && s.day === 10, "lunar inverse");
      const y = cal.calcYear(E.Ut1JulianDate.fromDouble(2460348)).value;
      if (sourceBytes) {
        for (const r of truth(`calendar/${mode}/lunar`)) {
          near(
            [l.year, l.month, l.day, +l.isLeap, l.monthName, l.monthDays],
            r.values,
            0,
          );
          nativeRows++;
        }
        truth(`calendar/${mode}/month`).forEach((r, i) => {
          const m = y.months[i];
          near(
            [
              m.lunarYear,
              m.month,
              +m.isLeap,
              m.dayCount,
              m.monthName,
              m.monthBuildingBranch,
              m.firstCivilDayNumber,
              m.astronomicalNewMoonJulianDateUt1.dayNumber,
              m.astronomicalNewMoonJulianDateUt1.dayFraction,
            ],
            r.values,
          );
          nativeRows++;
        });
        truth(`calendar/${mode}/term`).forEach((r, i) => {
          const v = y.solarTerms[i].julianDateUt1;
          near([v.dayNumber, v.dayFraction], r.values);
          nativeRows++;
        });
        truth(`calendar/${mode}/moon`).forEach((r, i) => {
          const v = y.newMoons[i].julianDateUt1;
          near([v.dayNumber, v.dayFraction], r.values);
          nativeRows++;
        });
      }
      for (const ratHourMode of [0, 1, 2])
        check(
          cal.fourPillarsLocal(new E.AstroDateTime(2003, 3, 13, 23), {
            ratHourMode,
          }).value.hour >= 0,
          "rat-hour pillars",
        );
      const term = cal.getSpecificJieQi(2024, 0).value;
      for (const method of [
        "previousJieQi",
        "nextJieQi",
        "previousJie",
        "nextJie",
        "previousQi",
        "nextQi",
      ])
        check(
          cal[method](term.julianDateUt1).value.julianDateUt1.scale === "UT1",
          "term scale",
        );
      cal.close();
      throws(() => cal.fromSolar(s), E.ClosedContextError);
    }
    const a = ctx.createChineseCalendar(
      E.ChineseCalendarConfig.localAstronomicalUtcOffset(420),
    );
    const b = ctx.createChineseCalendar(
      E.ChineseCalendarConfig.localAstronomicalMeridian(105, {
        utcOffsetMinutes: 420,
      }),
    );
    check(
      JSON.stringify(a.fromSolar({ year: 2024, month: 2, day: 10 })) ===
        JSON.stringify(b.fromSolar({ year: 2024, month: 2, day: 10 })),
      "UTC+7 versus 105E",
    );
    const local = new E.AstroDateTime(2003, 3, 13, 14, 15);
    const clock = a.instantFromLocal(local).value;
    check(
      a.localFromInstant(clock).value.hour === 14,
      "calendar owns civil clock offset",
    );
    throws(() => a.instantFromLocal(new Date()), TypeError);
    a.close();
    b.close();
    check(
      ctx.chineseCalendar === ctx.chineseCalendar,
      "cached default calendar",
    );
    throws(
      () =>
        ctx.chineseCalendar.fromSolar({
          year: 2 ** 32 + 2024,
          month: 2,
          day: 10,
        }),
      RangeError,
    );
    completed.push("three calendar modes/day boundaries/terms/four pillars");

    const bz = ctx.bazi();
    const birth = bz.calculateLocal(local, { gender: 0 });
    check(
      birth.value.chart.yearPillar === birth.value.pillars.year,
      "BaZi pillars",
    );
    check(
      bz.fillDayun(local, birth.value.chart, birth.value.qiyun, 5).value
        .length === 5,
      "dayun",
    );
    check(bz.hiddenStems(2).value.length === 3, "hidden stems");
    check(bz.tenGod(0, 0).value >= 0, "ten god");
    check(
      bz.collectShenSha(birth.value.chart, birth.value.pillars.day).value
        .length > 0,
      "Shen Sha",
    );
    throws(() => ctx.chineseCalendar.close(), Error);
    bz.close();
    throws(() => bz.calcChart(birth.value.pillars), E.ClosedContextError);
    completed.push("BaZi/chart/QiYun/DaYun/TenGod/ShenSha");

    const z = ctx.ziwei();
    check(z.starCount === 159, "Ziwei star registry");
    check(z.findStar("ziwei").id === 0, "find ziwei");
    check(z.findStar("not-a-star") === null, "unknown star");
    const chart = z.createChartLocal(local, { gender: 0 }).value;
    check(chart.summary.anchors.length === 31, "natal anchors");
    for (const row of truth("ziwei/natal/anchors")) {
      near(chart.summary.anchors, row.values, 0);
      nativeRows++;
    }
    for (const row of truth("ziwei/natal/star")) {
      const p = chart.star(row.values[0]);
      near(
        [
          row.values[0],
          p.branch === 255 ? -1 : p.branch,
          p.palace === 255 ? -1 : p.palace,
          p.brightness,
          p.transformationMask,
          ...Array.from(
            { length: 12 },
            (_, bit) => (p.transformationMask >>> bit) & 1,
          ),
        ],
        row.values,
        0,
      );
      nativeRows++;
    }
    for (const mode of [0, 1, 2]) {
      const policy = { mode, longitudeRadians: (118.582 * Math.PI) / 180 };
      const ut = z.chartTimeToUt1(
        new E.AstroDateTime(2003, 3, 13, 23),
        policy,
      ).value;
      const back = z.chartTimeFromUt1(ut, policy).value;
      check(back.hour === 23, "clock inverse");
      for (const rat of [0, 1, 2])
        for (const direction of [-1, 1])
          check(
            z.stepFlowHourAtUt1(ut, {
              clock: policy,
              ratHourMode: rat,
              direction,
            }).value.instantUt1.scale === "UT1",
            "clock step",
          );
      chart.setFlowAtUt1(ut, { clock: policy });
      check(chart.flowLayerCount === 5, "five flow levels");
      chart.truncateFlow(E.ZiweiFlowLevel.month);
      check(chart.flowLayerCount === 2, "flow truncation");
    }
    const edit = chart.modify({ month: 3 }).value;
    check(edit.summary.input.month === 3, "chart edit");
    check(chart.summary.input.month === 2, "chart edit isolation");
    edit.close();
    const casting = z.castingFromIndex(0, { gender: 0 }).value;
    check(
      casting.summary.index === 0 && casting.stars.length === z.starCount,
      "casting index",
    );
    check(
      z.castingFromNumber("123456", { gender: 0 }).value.number === "123456",
      "casting number",
    );
    check(
      z.randomCastingChart({ gender: 0 }).value.stars.length === 159,
      "OS random casting",
    );
    check(
      casting.modify({ day: 30 }).value.summary.input.day === 30,
      "casting edit",
    );
    z.close();
    throws(() => chart.summary, E.ClosedContextError);
    completed.push(
      "Ziwei/natal/all-stars/solar-clocks/navigation/flows/edits/casting",
    );

    const clone = ctx.clone();
    clone.configuration.setRouteRule(E.RouteRule.semiAnalytic);
    const saved = clone.position.atTt(E.Body.sun, tt).value.values;
    clone.close();
    check(Number.isFinite(saved[0]), "owned result after close");
    throws(() => clone.position.atTt(E.Body.sun, tt), E.ClosedContextError);
    const foreign = eph.createContext();
    try {
      throws(
        () => ctx.bazi({ chineseCalendar: foreign.chineseCalendar }),
        TypeError,
      );
    } finally {
      foreign.close();
    }
    const borrowed = ctx.chineseCalendar;
    ctx.close();
    throws(
      () => borrowed.fromSolar({ year: 2024, month: 1, day: 1 }),
      E.ClosedContextError,
    );
    completed.push("ownership/clone/close/cross-context guards");
  } finally {
    ctx.close();
  }
  return { assertions, nativeRows, maxNativeDifference, completed };
}

export function exerciseEclipses(ctx) {
  const done = [];
  const e = ctx.eclipses;
  ctx.configuration.setObserverLocation({
    longitudeDegrees: -106.4,
    latitudeDegrees: 23.2,
  });
  const tt = E.TtJulianDate.fromDouble(2460409.263),
    ut = E.Ut1JulianDate.fromDouble(2460409.262),
    ltt = E.TtJulianDate.fromDouble(2460926.26),
    lut = E.Ut1JulianDate.fromDouble(2460926.25);
  const o = { options: E.EclipseOption.includeContacts };
  const add = (name, fn) => {
    const v = fn();
    if (!v || !v.flags || v.value === undefined)
      throw new Error(`${name} did not return OperationResult`);
    done.push(name);
    return v.value;
  };
  const lt = add("solveLunarAtTt", () => e.solveLunarAtTt(ltt, o)),
    lu = add("solveLunarAtUt1", () => e.solveLunarAtUt1(lut, o));
  for (const [name, jd] of [
    ["nextLunarAtTt", ltt],
    ["nextLunarAtUt1", lut],
    ["nextSolarAtTt", tt.addDays(-1)],
    ["nextSolarAtUt1", ut.addDays(-1)],
    ["solveSolarAtTt", tt],
    ["solveSolarAtUt1", ut],
    ["solveLocalSolarAtTt", tt],
    ["solveLocalSolarAtUt1", ut],
    ["nextLocalSolarAtTt", tt.addDays(-1)],
    ["nextLocalSolarAtUt1", ut.addDays(-1)],
    ["nextLocalLunarAtTt", ltt.addDays(-1)],
    ["nextLocalLunarAtUt1", lut.addDays(-1)],
  ])
    add(name, () => e[name](jd, o));
  for (const [name, jd] of [
    ["lunarEclipsesAtTt", ltt],
    ["lunarEclipsesAtUt1", lut],
    ["solarEclipsesAtTt", tt],
    ["solarEclipsesAtUt1", ut],
  ])
    add(name, () =>
      e[name](jd.addDays(-1), jd.addDays(1), { ...o, maxResults: 4 }),
    );
  add("localLunarVisibilityAtTt", () => e.localLunarVisibilityAtTt(lt));
  add("localLunarVisibilityAtUt1", () => e.localLunarVisibilityAtUt1(lu));
  add("localSolarCircumstancesAtTt", () => e.localSolarCircumstancesAtTt(tt));
  add("localSolarCircumstancesAtUt1", () => e.localSolarCircumstancesAtUt1(ut));
  add("solarBesselianElementsAtTt", () => e.solarBesselianElementsAtTt(tt));
  const poly = add("solarBesselianPolynomialAtTt", () =>
    e.solarBesselianPolynomialAtTt(tt, {
      spanHours: 4,
      sampleStepHours: 0.5,
      degree: 4,
    }),
  );
  add("evaluateSolarBesselianPolynomial", () =>
    e.evaluateSolarBesselianPolynomial(poly, 0),
  );
  for (const suffix of ["Tt", "Ut1"]) {
    const jd = suffix === "Tt" ? tt : ut;
    for (const stem of ["solarEclipseRouteRow", "solarEclipseWhere"])
      add(stem + "At" + suffix, () => e[stem + "At" + suffix](jd));
    add("solarEclipseRouteAt" + suffix, () =>
      e["solarEclipseRouteAt" + suffix](jd, jd.addDays(0.01), {
        stepMinutes: 10,
      }),
    );
    for (const stem of [
      "solarEclipseRouteCurves",
      "solarEclipseRouteProduct",
      "solarEclipseRouteMapProduct",
    ])
      add(stem + "At" + suffix, () =>
        e[stem + "At" + suffix](jd, { routeSampleCount: 32 }),
      );
    add("localSolarEclipseBoundaryAt" + suffix, () =>
      e["localSolarEclipseBoundaryAt" + suffix](jd, {
        longitudeDegrees: -106.4,
        latitudeDegrees: 23.2,
      }),
    );
  }
  if (done.length !== 39)
    throw new Error(`Only ${done.length} eclipse operations ran`);
  return done;
}
