// Public calls only; shared unchanged between Node and the browser.
import * as E from "./all-packages.mjs";
export function runExtendedScenarios(eph, { reference } = {}) {
  let assertions = 0,
    nativeRows = 0,
    maxNativeDifference = 0;
  const check = (ok, message) => {
    assertions++;
    if (!ok) throw new Error(message);
  };
  const equal = (a, b, label) =>
    check(JSON.stringify(a) === JSON.stringify(b), label);
  const throws = (fn, Type = Error) => {
    try {
      fn();
    } catch (e) {
      check(e instanceof Type, `Expected ${Type.name}, got ${String(e)}`);
      return e;
    }
    throw new Error(`Expected ${Type.name}`);
  };
  const compare = (label, values, index = 0, tolerance = 1e-9) => {
    const row = reference?.rows.filter((r) => r.label === `bazi/${label}`)[
      index
    ];
    if (!row) return;
    check(row.values.length === values.length, `shape ${label}`);
    values.forEach((value, i) => {
      const d = Math.abs(value - row.values[i]);
      maxNativeDifference = Math.max(d, maxNativeDifference);
      check(
        d <= tolerance,
        `native ${label}[${i}]: ${value} != ${row.values[i]}`,
      );
    });
    nativeRows++;
  };
  const chartValues = (c) => [
    c.yearPillar,
    c.monthPillar,
    c.dayPillar,
    c.hourPillar,
    c.mingGong,
    c.shenGong,
    c.taiYuan,
    c.taiXi,
    ...c.hiddenStemCount,
    ...c.hiddenStems.flat(),
    ...c.visibleTenGods,
    ...c.hiddenTenGods.flat(),
    ...c.lifeStages,
    ...c.nayinIds,
  ];
  const jdValues = (jd) => [jd.dayNumber, jd.dayFraction];
  const ctx = eph.createContext();
  const local = new E.AstroDateTime(2003, 3, 13, 14, 15);
  const utc = ctx.chineseCalendar.instantFromLocal(local).value;
  const ut1 = ctx.time.utcToUt1(utc).value;
  const deltaT = ctx.time.estimatedDeltaTFromUt1(ut1);
  const tt = ctx.time.ut1ToTt(ut1, { deltaTSeconds: deltaT }).value;
  const tdb = ctx.time.ttToTdb(tt).value;
  try {
    check(eph.libraryCodename.length > 0, "library codename");
    const bodies = [E.Body.sun, E.Body.moon, E.Body.marsBarycenter];
    const batch = ctx.position.batchAtTdb(bodies, tdb, tt);
    bodies.forEach((body, i) =>
      equal(
        batch.value[i].values,
        ctx.position.atTdb(body, tdb, tt).value.values,
        "TDB batch",
      ),
    );
    const explicit = ctx.position.batchAtUt1WithDeltaT(bodies, ut1, deltaT);
    bodies.forEach((body, i) =>
      equal(
        explicit.value[i].values,
        ctx.position.atUt1WithDeltaT(body, ut1, deltaT).value.values,
        "explicit DeltaT batch",
      ),
    );
    equal(
      ctx.position.stateAtUt1WithDeltaT(E.Body.sun, ut1, deltaT).value,
      ctx.position.stateAtTt(E.Body.sun, tt).value,
      "explicit DeltaT state",
    );
    const bz = ctx.bazi();
    check(
      E.BaziGender.male === 1 && E.BaziGender.female === 0,
      "BaZi native gender IDs",
    );
    const male = bz.calculateLocal(local, { gender: E.BaziGender.male });
    const c = male.value.chart,
      q = male.value.qiyun;
    compare("chart", chartValues(c));
    compare(
      "qiyun",
      [
        q.direction,
        q.timeModel,
        q.referenceJieIndex,
        q.jieIntervalDays,
        q.startAgeYears,
        q.offsetYears,
        q.offsetMonths,
        q.offsetDays,
        q.offsetHours,
        q.offsetMinutes,
        q.offsetSeconds,
        ...jdValues(q.referenceJieJulianDateUt1),
        ...jdValues(q.startJulianDateUt1),
      ],
      0,
      1e-8,
    );
    equal(
      q,
      bz.calcQiyun(ut1, local, c, E.BaziGender.male).value,
      "QiYun uses UT1, not UTC",
    );
    throws(() => bz.calcQiyun(utc, local, c, E.BaziGender.male), TypeError);
    compare(
      "stemrelation",
      [bz.calcStemRelation(0, 5).value.combinedElementId],
      0,
      0,
    );
    compare(
      "branchrelation",
      [bz.calcBranchRelation(0, 1).value.combinedElementId],
      0,
      0,
    );
    compare(
      "triplerelation",
      [bz.calcBranchTripleRelation(8, 0, 4).value.combinedElementId],
      0,
      0,
    );
    check(bz.calcStemRelation(0, 5).value.flags !== 0, "stem relation flags");
    const xy = bz.fillXiaoyun(c, { direction: 1, requestedCount: 5 }).value;
    xy.forEach((x, i) => {
      equal(x.ganzhi, bz.calcXiaoyun(c, 1, x.age).value, "Xiaoyun list/single");
      compare("xiaoyun", [x.age, x.ganzhi], i, 0);
    });
    check(
      bz.fillXiaoyun(c, { direction: -1, requestedCount: 0 }).value.length ===
        0,
      "empty Xiaoyun",
    );
    throws(() => bz.fillXiaoyun(c, { direction: 0 }), RangeError);
    let segmentIndex = 0,
      silingIndex = 0;
    for (const tableModel of [0, 1]) {
      for (const s of bz.getRenyuanSilingSegments(3, tableModel).value)
        compare(
          "segments",
          [s.stemId, s.originKind, s.segmentIndex, s.startDay, s.endDay],
          segmentIndex++,
          0,
        );
      for (const timeModel of [0, 1]) {
        const r = bz.calcRenyuanSiling(ut1, c, { tableModel, timeModel }).value;
        compare(
          "siling",
          [
            r.tableModel,
            r.timeModel,
            r.monthBranchId,
            r.stemId,
            r.originKind,
            r.segmentIndex,
            r.previousJieIndex,
            r.daysSinceJie,
            r.segmentStartDay,
            r.segmentEndDay,
            ...jdValues(r.previousJieJulianDateUt1),
          ],
          silingIndex++,
          1e-8,
        );
      }
    }
    bz.collectChartRelations(c).value.forEach((r, i) =>
      compare(
        "relations",
        [r.kind, r.combinedElementId === 255 ? -1 : r.combinedElementId],
        i,
        0,
      ),
    );
    for (const [i, gender] of [
      -1,
      E.BaziGender.male,
      E.BaziGender.female,
    ].entries()) {
      const ids = bz.collectTargetShenSha(c, c.dayPillar, {
        targetKind: E.BaziShenShaTargetKind.day,
        gender,
      }).value;
      compare("shensha", ids, i, 0);
      equal(
        ids,
        bz
          .collectShenSha(c, c.dayPillar, {
            kind: E.BaziShenShaTargetKind.day,
            gender,
          })
          .value.map((s) => s.builtinId),
        "builtin IDs/string matches",
      );
    }
    const lon = (118.582 * Math.PI) / 180;
    for (const mode of [0, 1, 2]) {
      const options = {
        gender: E.BaziGender.female,
        clock: { mode, longitudeRadians: lon },
      };
      const b = bz.calculateLocal(local, options).value;
      compare(
        `clock/${mode}`,
        [
          ...chartValues(b.chart),
          b.chartTime.hour,
          b.chartTime.minute,
          b.chartTime.second + b.chartTime.nanosecond / 1e9,
        ],
        0,
        2e-6,
      );
      equal(
        b.chart,
        bz.calculateInstant(utc, options).value.chart,
        "BaZi local/instant",
      );
      equal(
        b.chart,
        bz.calculateInstant(new Date("2003-03-13T06:15:00Z"), options).value
          .chart,
        "BaZi Date instant",
      );
      check(
        b.instantUtc.daysUntil(utc) === 0,
        "solar clock retains physical instant",
      );
    }
    const opts = { hour: 14, minute: 15, gender: E.BaziGender.male };
    equal(c, bz.calculateSolarDay(local, opts).value.chart, "BaZi solar day");
    const lunar = ctx.chineseCalendar.fromSolar(local).value;
    equal(c, bz.calculateLunarDay(lunar, opts).value.chart, "BaZi lunar day");
    const roots = eph.createBaziShenShaCatalog();
    let seen;
    const custom = roots.addModule({
      label: "web-school",
      rules: [
        {
          id: "always",
          name: "自定义",
          test: (i) => {
            seen = i;
            return true;
          },
        },
      ],
    });
    const derived = custom.createContext();
    const disabled = custom.createContext({
      disabledIds: ["web-school:always"],
    });
    const removed = custom.removeModule("web-school");
    const clean = removed.createContext();
    const evaluate = (h) =>
      h.evaluate(c, c.dayPillar, {
        targetKind: E.BaziShenShaTargetKind.day,
        gender: E.BaziGender.male,
      }).value;
    throws(
      () => custom.addModule({ label: "web-school", rules: [] }),
      E.EphemerisError,
    );
    throws(() => roots.removeModule("default"), E.EphemerisError);
    roots.close();
    custom.close();
    removed.close();
    check(
      evaluate(derived).some(
        (s) =>
          s.id === "web-school:always" &&
          s.name === "自定义" &&
          s.builtinId === null,
      ),
      "callback retained after catalog close",
    );
    equal(
      seen.pillars,
      [c.yearPillar, c.monthPillar, c.dayPillar, c.hourPillar],
      "callback input pillars",
    );
    check(seen.gender === E.BaziGender.male, "callback gender");
    check(
      !evaluate(disabled).some((s) => s.id === "web-school:always"),
      "disabled rule",
    );
    check(
      !evaluate(clean).some((s) => s.id === "web-school:always"),
      "removed module",
    );
    derived.close();
    disabled.close();
    clean.close();
    throws(() => evaluate(derived), E.ClosedContextError);
    const root = eph.createBaziShenShaCatalog();
    let failure = null;
    const throwing = root.addModule({
      label: "throws",
      rules: [
        {
          id: "x",
          name: "x",
          test: () => {
            throw failure;
          },
        },
      ],
    });
    const failing = throwing.createContext();
    for (const error of [null, undefined, new Error("predicate identity")]) {
      failure = error;
      let caught = false;
      try {
        evaluate(failing);
      } catch (e) {
        caught = e === error;
      }
      check(caught, "exact thrown JS value preserved");
    }
    failing.close();
    throwing.close();
    const asyncCatalog = root.addModule({
      label: "async",
      rules: [{ id: "x", name: "x", test: async () => true }],
    });
    const asyncCtx = asyncCatalog.createContext();
    throws(() => evaluate(asyncCtx), TypeError);
    asyncCtx.close();
    asyncCatalog.close();
    let guard;
    let reentry = 0,
      closeGuard = 0,
      ownerGuard = 0;
    const guarded = root.addModule({
      label: "guarded",
      rules: [
        {
          id: "x",
          name: "x",
          test: () => {
            try {
              evaluate(guard);
            } catch {
              reentry++;
            }
            try {
              guard.close();
            } catch {
              closeGuard++;
            }
            try {
              eph.close();
            } catch {
              ownerGuard++;
            }
            return true;
          },
        },
      ],
    });
    guard = guarded.createContext();
    evaluate(guard);
    equal(
      [reentry, closeGuard, ownerGuard],
      [1, 1, 1],
      "callback reentry/lifecycle guards",
    );
    guard.close();
    guarded.close();
    root.close();

    const catalog = eph.createZiweiDataCatalog();
    const generation = catalog.generation;
    const z = ctx.ziwei({ catalog });
    const chart = z.calculateLocal(local, { gender: E.ZiweiGender.male }).value;
    catalog.reload();
    check(catalog.generation > generation, "catalog generation reload");
    check(z.generation === generation, "old Ziwei context keeps snapshot");
    const fresh = ctx.ziwei({ catalog });
    check(
      fresh.generation === catalog.generation,
      "new context sees reloaded snapshot",
    );
    throws(
      () =>
        catalog.reload({
          files: { "default.toml": new TextEncoder().encode("bad") },
        }),
      Error,
    );
    catalog.close();
    check(chart.starPosition(0) !== null, "chart survives catalog close");
    throws(() => catalog.reload(), E.ClosedContextError);
    equal(
      chart.summary,
      z.calculateInstant(utc, { gender: E.ZiweiGender.male }).value.summary,
      "Ziwei local/instant",
    );
    equal(
      chart.summary,
      z.calculateSolarDay(local, { ...opts, gender: E.ZiweiGender.male }).value
        .summary,
      "Ziwei solar",
    );
    equal(
      chart.summary,
      z.calculateLunarDay(lunar, { ...opts, gender: E.ZiweiGender.male }).value
        .summary,
      "Ziwei lunar",
    );
    for (const mode of [0, 1, 2]) {
      const options = {
        gender: E.ZiweiGender.male,
        clock: { mode, longitudeRadians: lon },
      };
      equal(
        z.calculateLocal(local, options).value.summary,
        z.calculateInstant(utc, options).value.summary,
        "Ziwei clock local/instant",
      );
    }
    equal(chart.anchors, chart.summary.anchors, "anchors view");
    const palace = chart.starPalace(0);
    check(chart.palaces[palace].starIds.includes(0), "star reverse lookup");
    equal(
      chart.transformMask(0),
      chart.star(0).transformationMask,
      "transform mask",
    );
    for (let mark = 0; mark < 12; mark++)
      check(
        chart.hasTransform(0, mark) ===
          !!(chart.transformMask(0) & (1 << mark)),
        "transform bit",
      );
    throws(() => chart.hasTransform(0, 32), RangeError);
    const flow = new E.AstroDateTime(2024, 4, 8, 18);
    const flowUtc = ctx.chineseCalendar.instantFromLocal(flow).value;
    equal(
      chart.setFlowLocal(flow),
      chart.setFlowInstant(flowUtc),
      "UTC/local flows",
    );
    check(chart.flowLayerCount === 5, "all flow layers");
    chart.truncateFlow(E.ZiweiFlowLevel.month);
    check(chart.flowLayerCount === 2, "truncate deeper flows");
    for (const mode of [E.RatHourMode.todayGan, E.RatHourMode.tomorrowGan]) {
      const virtualTime = new E.AstroDateTime(2003, 3, 13, 22);
      const instantUtc =
        ctx.chineseCalendar.instantFromLocal(virtualTime).value;
      const next = z.nextFlowHourTarget({
        instantUtc,
        virtualTime,
        ratHourMode: mode,
      }).value;
      check(
        next.virtualTime.hour === 23 && next.virtualTime.minute === 0,
        "split late Zi navigation 22→23",
      );
      const prev = z.previousFlowHourTarget({
        ...next,
        ratHourMode: mode,
      }).value;
      check(
        Math.abs(prev.instantUtc.daysUntil(instantUtc) * 86400) < 1e-7,
        "UTC navigation inverse",
      );
    }
    const nextDay = z.nextFlowDayTarget({
      instantUtc: utc,
      virtualTime: local,
    }).value;
    equal(
      z.previousFlowDayTarget(nextDay).value.virtualTime,
      local,
      "day navigation inverse",
    );
    const reverse = z.reverseLookupTier1({
      start: utc,
      end: utc.addSeconds(3600),
      gender: E.ZiweiGender.male,
      query: { ziweiBranch: chart.starPosition(0) },
    }).value;
    check(
      reverse.length > 0 && reverse.every((r) => r.instantUtc.scale === "UTC"),
      "UTC reverse lookup",
    );
    const module = {
      label: "web-school",
      starsJson: '[{"key":"ziwei","rule":{"type":"constant","value":5}}]',
    };
    const rules = new E.ZiweiRuleset().addModule(module);
    module.starsJson = "invalid";
    const customZ = ctx.ziwei({
      ruleset: rules,
      selection: { placement: { ziwei: "web-school" } },
    });
    check(
      customZ.calculateLocal(local, { gender: 0 }).value.starPosition(0) === 5,
      "immutable rule module snapshot",
    );
    check(
      rules.removeModule("web-school").modules.length === 0 &&
        rules.modules.length === 1,
      "ruleset immutable removal",
    );
    throws(() => rules.addModule({ label: "web-school" }), Error);
    throws(() => rules.removeModule("option1"), Error);
    throws(
      () => ctx.ziwei({ ruleset: rules, ruleModules: rules.modules }),
      TypeError,
    );
    const cast = z.castingFromNumber("123", { gender: 0 }).value;
    check(
      cast.starPosition(0) === cast.stars[0].branch,
      "casting reverse lookup",
    );
    cast.close();
    throws(() => cast.stars, E.ClosedContextError);
    customZ.close();
    fresh.close();
    z.close();
    bz.close();
    const profile = `format_version = 1
stars = "/taiyin/ziwei/rules/stars.toml"
placement_rules = "/taiyin/ziwei/rules/placement.toml"
brightness_rules = "/taiyin/ziwei/rules/brightness.toml"
sihua_rules = "/taiyin/ziwei/rules/sihua.toml"
master_rules = "/taiyin/ziwei/rules/masters.toml"
`;
    const bytes = new TextEncoder().encode(profile);
    const disk = eph.createZiweiDataCatalog({
      files: { "default.toml": bytes },
    });
    bytes.fill(0); // owned file bundle is copied, not borrowed from the caller
    const oldZ = ctx.ziwei({ catalog: disk });
    const oldGeneration = disk.generation;
    throws(
      () =>
        disk.reload({
          files: { "default.toml": new TextEncoder().encode("[broken") },
        }),
      E.EphemerisError,
    );
    check(
      disk.generation === oldGeneration,
      "failed reload preserves compiled generation",
    );
    disk.reload(); // also verifies failed write was rolled back on the filesystem
    disk.reload({
      files: {
        "default.toml": new TextEncoder().encode(
          profile + '\n[defaults]\nlongevity = "option2"\n',
        ),
      },
    });
    const newZ = ctx.ziwei({ catalog: disk });
    check(
      oldZ.generation === oldGeneration && newZ.generation === disk.generation,
      "custom catalog snapshot isolation",
    );
    disk.close();
    check(
      oldZ.starCount === 159 && newZ.starCount === 159,
      "custom catalog can close before snapshots",
    );
    oldZ.close();
    newZ.close();
    throws(
      () =>
        eph.createZiweiDataCatalog({
          files: { "../bad.toml": new TextEncoder().encode(profile) },
        }),
      TypeError,
    );
    eph.clearEop();
    throws(() => ctx.time.utcToUt1(utc), E.EarthOrientationDataError);
    const strictBz = ctx.bazi();
    throws(
      () => strictBz.calculateLocal(local, { gender: 1 }),
      E.EarthOrientationDataError,
    );
    ctx.time.setAllowUtcOutOfRangeEstimate(true);
    check(
      strictBz
        .calculateLocal(local, { gender: 1 })
        .flags.contains(E.ResultFlag.timeScaleFallback),
      "highlevel fallback flag",
    );
    strictBz.close();
    ctx.configuration.reset();
    check(
      ctx.time.configuredTdbModel === E.TdbModel.fastPeriodic,
      "reset default model",
    );
    throws(() => ctx.time.utcToUt1(utc), E.EarthOrientationDataError);
    eph.loadBuiltinEop();
  } finally {
    ctx.close();
  }
  return { assertions, nativeRows, maxNativeDifference };
}
