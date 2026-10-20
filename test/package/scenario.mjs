// Shared by clean installed-package consumers, not by source-tree imports.
export async function exercisePackage(E, initializationOptions = {}) {
  const check = (value, message) => {
    if (!value) throw new Error(message);
  };
  const eph = await E.Ephemeris.initialize(initializationOptions);
  const ctx = eph.createContext();
  try {
    check(
      eph.libraryVersion.length > 0 && eph.cAbiVersion === 11,
      "core version",
    );
    const ut1 = E.Ut1JulianDate.fromDouble(2460310.5);
    const position = ctx.position.atUt1(E.Body.marsBarycenter, ut1);
    check(position.value.values.every(Number.isFinite), "planet position");
    const lunar = ctx.chineseCalendar.fromSolar({
      year: 2024,
      month: 2,
      day: 10,
    }).value;
    check(
      lunar.year === 2024 && lunar.month === 1 && lunar.day === 1,
      "lunar date",
    );
    const local = new E.AstroDateTime(2003, 3, 13, 14, 15);
    // Unbundled Workers have no import-map support. They exercise core only;
    // Vite Workers and Node Workers additionally exercise both optional packages.
    const bazi = E.BaziGender
      ? ctx.bazi().calculateLocal(local, { gender: E.BaziGender.male }).value
      : null;
    const chart = E.ZiweiGender
      ? ctx.ziwei().createChartLocal(local, { gender: E.ZiweiGender.male })
          .value
      : null;
    if (chart)
      check(chart.summary.anchors.length === 31, "embedded Ziwei rules");
    const eclipse = ctx.eclipses.nextSolarAtUt1(ut1).value;
    check(
      eclipse.kind !== 0 && eclipse.maximumJulianDateUt1 !== null,
      "solar eclipse",
    );
    const output = {
      libraryVersion: eph.libraryVersion,
      position: [...position.value.values],
      positionFlags: position.flags.mask,
      lunar: [lunar.year, lunar.month, lunar.day, +lunar.isLeap],
      pillars: bazi ? Object.values(bazi.pillars) : null,
      anchors: chart ? [...chart.summary.anchors] : null,
      eclipseKind: eclipse.kind,
      eclipseMaximum: eclipse.maximumJulianDateUt1.toDouble(),
    };
    eph.clearEop();
    let strictError;
    try {
      ctx.time.scalesFromUtc(new Date("2024-01-01T00:00:00Z"));
    } catch (error) {
      strictError = error;
    }
    check(
      strictError instanceof E.EarthOrientationDataError,
      "strict missing-EOP exception",
    );
    ctx.time.setAllowUtcOutOfRangeEstimate(true);
    check(
      !ctx.time.scalesFromUtc(new Date("2024-01-01T00:00:00Z")).flags.isEmpty,
      "explicit estimate flags",
    );
    output.strictStatus = strictError.status;
    // A fresh runtime in this same consumer does not share mutable EOP state.
    const independent = await E.Ephemeris.initialize(initializationOptions);
    try {
      check(independent.hasEop, "independent runtime EOP");
    } finally {
      independent.close();
    }
    return output;
  } finally {
    eph.close();
    let rejected = false;
    try {
      ctx.position.atUt1(E.Body.sun, E.Ut1JulianDate.fromDouble(2460310.5));
    } catch (error) {
      rejected = error instanceof E.ClosedContextError;
    }
    check(rejected, "closed context");
  }
}
