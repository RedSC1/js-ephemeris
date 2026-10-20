// Shared unchanged by Node and the browser; uses only public facade calls.
import * as E from "./all-packages.mjs";
export function runBaziReverseScenarios(eph) {
  let assertions = 0;
  const check = (v, text) => {
    ++assertions;
    if (!v) throw new Error(text);
  };
  const ctx = eph.createContext();
  const bz = ctx.bazi();
  const jd = (date) => ctx.time.julianDay(date, "UT1").value;
  const asUtc = (v) => new E.JulianDate(v.dayNumber, v.dayFraction, "UTC");
  const virtual = (instant, mode, longitude) => {
    if (mode === 0)
      return ctx.time.reverseJulianDay(instant.addSeconds(28800)).value;
    let local = new E.JulianDate(
      instant.dayNumber,
      instant.dayFraction + longitude / (2 * Math.PI),
      "LOCAL_MEAN",
    );
    if (mode === 2)
      local = ctx.solarTime.localMeanToApparent(local, longitude).value;
    return ctx.time.reverseJulianDay(local).value;
  };
  try {
    // Native calendar fixtures: written year and historical/ganzhi year
    // differ across the pre-Taichu winter-year transition.
    for (const [year, month, day, written, historical] of [
      [-104, 1, 3, -105, -104],
      [-103, 1, 20, -104, -103],
    ]) {
      const local = new E.AstroDateTime(year, month, day, 12);
      const lunar = ctx.chineseCalendar.fromSolar({ year, month, day }).value;
      check(
        lunar.year === written && lunar.historicalYear === historical,
        "historical lunar year preserved",
      );
      const instant = jd(local).addSeconds(-28800);
      const fromInstant = ctx.chineseCalendar.fromInstantUt1(instant).value;
      check(
        fromInstant.historicalYear === historical,
        "instant historical year preserved",
      );
      const months = ctx.chineseCalendar.calcYear(instant).value.months;
      const physical = months.find(
        (m) =>
          m.firstCivilDayNumber ===
          Math.floor(jd(local).toDouble() + 0.5) - lunar.day + 1,
      );
      check(
        physical?.lunarYear === written &&
          physical.historicalYear === historical,
        "month historical year preserved",
      );
    }
    for (const mode of [0, 1, 2])
      for (const ratHourMode of [0, 1, 2])
        for (const hour of [0, 11, 23]) {
          const instant = jd(
            new E.AstroDateTime(2003, 3, 13, hour, 30),
          ).addSeconds(-28800);
          const longitude = (118.582 * Math.PI) / 180;
          const p = ctx.chineseCalendar.fourPillars({
            instantUtc: asUtc(instant),
            virtualTime: virtual(instant, mode, longitude),
            ratHourMode,
          }).value;
          const out = bz.reverseLookupAtUt1(
            p,
            instant.addDays(-1),
            instant.addDays(1),
            { ratHourMode, clock: { mode, longitudeRadians: longitude } },
          );
          check(
            out.value.some(
              (c) =>
                c.startJdUt1.compareTo(instant) <= 0 &&
                c.endJdUt1.compareTo(instant) > 0,
            ),
            "contains forward instant",
          );
          for (const c of out.value) {
            check(
              c.startJdUt1.scale === "UT1" && c.endJdUt1.scale === "UT1",
              "UT1 labels",
            );
            for (const f of [0.01, 0.5, 0.99]) {
              const probe = c.startJdUt1.addDays(
                c.startJdUt1.daysUntil(c.endJdUt1) * f,
              );
              const actual = ctx.chineseCalendar.fourPillars({
                instantUtc: asUtc(probe),
                virtualTime: virtual(probe, mode, longitude),
                ratHourMode,
              }).value;
              check(
                JSON.stringify(p) === JSON.stringify(actual),
                "interval forward verification",
              );
            }
          }
        }
    const instant = jd(new E.AstroDateTime(2003, 3, 13, 23, 30)).addSeconds(
      -28800,
    );
    const p = ctx.chineseCalendar.fourPillars({
      instantUtc: asUtc(instant),
      virtualTime: new E.AstroDateTime(2003, 3, 13, 23, 30),
    }).value;
    const matches = bz.reverseLookupAtUt1(
      p,
      instant.addDays(-1),
      instant.addDays(1),
    ).value;
    check(
      matches.length === 1 &&
        matches[0].startVirtualTime.hour === 23 &&
        matches[0].endVirtualTime.hour === 1,
      "unified Zi merged",
    );
    const clipped = bz.reverseLookupAtUt1(
      p,
      instant,
      instant.addSeconds(100),
    ).value;
    check(
      clipped.length === 1 && clipped[0].startJdUt1.compareTo(instant) === 0,
      "clip start",
    );
    check(
      bz.reverseLookupAtUt1(p, instant, instant).value.length === 0,
      "empty range",
    );
    for (const call of [
      () => bz.reverseLookupAtUt1(p, instant.addDays(1), instant),
      () =>
        bz.reverseLookupAtUt1({ ...p, hour: 255 }, instant, instant.addDays(1)),
    ]) {
      let threw = false;
      try {
        call();
      } catch {
        threw = true;
      }
      check(threw, "reject invalid reverse input");
    }
    bz.close();
    let closed = false;
    try {
      bz.reverseLookupAtUt1(p, instant, instant);
    } catch {
      closed = true;
    }
    check(closed, "closed BaZi context");
    return { assertions };
  } finally {
    ctx.close();
  }
}
