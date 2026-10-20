import * as E from "./all-packages.mjs";
export function runCustomModelScenarios(eph) {
  let assertions = 0;
  const check = (v, m) => {
    assertions++;
    if (!v) throw Error(m);
  };
  const throws = (fn, Type = Error) => {
    try {
      fn();
    } catch (e) {
      check(e instanceof Type, `Expected ${Type.name}, got ${String(e)}`);
      return e;
    }
    throw Error(`Expected ${Type.name}`);
  };
  const ctx = eph.createContext();
  const other = eph.createContext();
  const tt = E.TtJulianDate.fromDouble(2460310.5);
  const ut = E.Ut1JulianDate.fromDouble(2460310.5);
  ctx.configuration.setObserverLocation({
    longitudeDegrees: 118.582,
    latitudeDegrees: 37.449,
  });
  const checkContextMutationGuards = () => {
    for (const set of [
      () => ctx.configuration.setRouteRule(E.RouteRule.semiAnalytic),
      () => ctx.configuration.clearObserverLocation(),
      () => ctx.configuration.setModels({ tdbModel: E.TdbModel.sofaFull }),
      () => ctx.configuration.setApparentConfig({ flags: 0 }),
      () => ctx.configuration.reset(),
      () => ctx.configuration.setTdbModel(E.TdbModel.sofaFull),
      () => ctx.configuration.setAllowUtcOutOfRangeEstimate(true),
      () => ctx.configuration.setStandardAtmosphere(),
      () => ctx.configuration.disableShapiroDelay(),
      () => ctx.time.setTdbModel(E.TdbModel.sofaFull),
      () => ctx.time.setAllowUtcOutOfRangeEstimate(true),
      () => ctx.time.syncModel(E.TdbModel.sofaFull),
    ])
      check(
        /active calculation/.test(String(throws(set))),
        "context mutation blocked during native callback",
      );
    check(
      ctx.time.configuredTdbModel === E.TdbModel.fastPeriodic,
      "rejected mutation preserves JS model",
    );
    check(
      ctx.time.ttToTdb(tt).value.scale === "TDB",
      "read-only nested conversion still works",
    );
    // The guard is context-local, not a global ban on other users/contexts.
    other.configuration.setStandardAtmosphere();
    other.time.setTdbModel(E.TdbModel.sofaFull);
    check(
      other.time.configuredTdbModel === E.TdbModel.sofaFull,
      "inactive context can change independently",
    );
    other.time.setTdbModel(E.TdbModel.fastPeriodic);
  };
  try {
    let seen;
    const target = eph.registerCustomTarget({
      targetId: -900001,
      evaluatePosition: (request) => {
        seen = request;
        return [1, 2, 3, 0, 0, 0];
      },
    });
    const p = ctx.position.atTt(-900001, tt).value;
    check(
      p.values[0] === 1 && seen.tt.scale === "TT" && seen.tdb.scale === "TDB",
      "custom target",
    );
    const state = ctx.position.stateAtTt(-900001, tt);
    check(
      state.flags.contains(E.ResultFlag.numericalDerivative),
      "position-only derivative fallback flag",
    );
    throws(() =>
      eph.registerCustomTarget({
        targetId: -900001,
        evaluatePosition: () => [0, 0, 0, 0, 0, 0],
      }),
    );
    target.close();
    target.close();
    check(target.isClosed, "target closed");
    throws(() => ctx.position.atTt(-900001, tt), E.EphemerisError);
    const exact = eph.registerCustomTarget({
      targetId: -900002,
      evaluatePosition: () => [4, 5, 6, 0, 0, 0],
      evaluateState: () => ({
        positionAu: { x: 4, y: 5, z: 6 },
        velocityAuPerDay: { x: 1, y: 2, z: 3 },
        accelerationAuPerDay2: { x: 0, y: 0, z: 0 },
      }),
    });
    const exactState = ctx.position.stateAtTt(-900002, tt);
    check(
      exactState.value.velocityAuPerDay.y === 2 &&
        !exactState.flags.contains(E.ResultFlag.numericalDerivative),
      "exact custom state",
    );
    exact.close();
    let failure = null;
    const throwing = eph.registerCustomTarget({
      targetId: -900003,
      evaluatePosition: () => {
        throw failure;
      },
    });
    for (const value of [null, undefined, new Error("target identity")]) {
      failure = value;
      let caught = false;
      try {
        ctx.position.atTt(-900003, tt);
      } catch (e) {
        caught = e === value;
      }
      check(caught, "callback thrown value preserved");
    }
    throwing.close();
    const async = eph.registerCustomTarget({
      targetId: -900004,
      evaluatePosition: async () => [0, 0, 0, 0, 0, 0],
    });
    throws(() => ctx.position.atTt(-900004, tt), TypeError);
    async.close();
    let guarded;
    let blocked = 0;
    guarded = eph.registerCustomTarget({
      targetId: -900005,
      evaluatePosition: () => {
        checkContextMutationGuards();
        for (const fn of [
          () => guarded.close(),
          () => ctx.close(),
          () => eph.close(),
          () => eph.setEphemerisSourcePriority("x.opm2", 1),
          () => eph.registerBuiltinAstrologyTargets(),
          () =>
            eph.registerCustomAyanamshaModel({
              modelId: 11000,
              evaluate: () => 0,
            }),
        ])
          try {
            fn();
          } catch {
            blocked++;
          }
        return [1, 0, 0, 0, 0, 0];
      },
    });
    ctx.position.atTt(-900005, tt);
    check(blocked === 6, "callback mutation/owner closure guards");
    guarded.close();
    const ay = eph.registerCustomAyanamshaModel({
      modelId: 11001,
      evaluate: (input) => {
        checkContextMutationGuards();
        check(typeof input.flags === "bigint", "callback flags uint64");
        return 0.123;
      },
    });
    check(
      Math.abs(
        ctx.astrology.ayanamshaAtTt(tt, { ayanamshaId: 11001, flags: 256n })
          .value - 0.123,
      ) < 1e-14,
      "custom mean ayanamsha",
    );
    check(ctx.astrology.hasAyanamshaModel(11001), "custom ayanamsha exists");
    ay.close();
    check(!ctx.astrology.hasAyanamshaModel(11001), "ayanamsha removed");
    const houses = eph.registerCustomHouseSystemModel({
      modelId: 11002,
      evaluate: (input) => {
        checkContextMutationGuards();
        return Array.from(
          { length: 12 },
          (_, i) => (input.ascendantRad + (i * Math.PI) / 6) % (2 * Math.PI),
        );
      },
    });
    check(
      ctx.astrology.housesAtUt1(ut, { houseSystemId: 11002 }).value
        .resolvedSystemId === 11002,
      "custom houses",
    );
    const fallback = eph.registerCustomHouseSystemModel({
      modelId: 11003,
      fallbackModelId: 11002,
      evaluate: () => null,
    });
    const f = ctx.astrology.housesAtUt1(ut, { houseSystemId: 11003 }).value;
    check(f.resolvedSystemId === 11002, "custom house fallback");
    throws(() => houses.close(), E.UnsupportedOperationError);
    check(!houses.isClosed, "fallback dependency retains registration");
    fallback.close();
    houses.close();
    const error = new Error("house identity");
    const badHouse = eph.registerCustomHouseSystemModel({
      modelId: 11004,
      evaluate: () => {
        throw error;
      },
    });
    check(
      throws(() => ctx.astrology.housesAtUt1(ut, { houseSystemId: 11004 })) ===
        error,
      "house callback errors not hidden by fallback",
    );
    badHouse.close();
    const badAy = eph.registerCustomAyanamshaModel({
      modelId: 11005,
      evaluate: () => NaN,
    });
    throws(
      () => ctx.astrology.ayanamshaAtTt(tt, { ayanamshaId: 11005 }),
      RangeError,
    );
    badAy.close();
    const recursive = eph.registerCustomAyanamshaModel({
      modelId: 11006,
      evaluate: () =>
        ctx.astrology.ayanamshaAtTt(tt, { ayanamshaId: 11006 }).value,
    });
    check(
      /Recursive/.test(
        String(
          throws(() => ctx.astrology.ayanamshaAtTt(tt, { ayanamshaId: 11006 })),
        ),
      ),
      "recursive model rejected",
    );
    recursive.close();
    // Mutations succeed after calculations return, including JS model sync.
    ctx.configuration.setModels({ tdbModel: E.TdbModel.sofaFull });
    check(
      ctx.time.configuredTdbModel === E.TdbModel.sofaFull,
      "configuration usable after callback",
    );
    ctx.time.setTdbModel(E.TdbModel.fastPeriodic);
    ctx.time.setAllowUtcOutOfRangeEstimate(true);
    ctx.configuration.setAllowUtcOutOfRangeEstimate(false);
    ctx.configuration.setStandardAtmosphere();
  } finally {
    other.close();
    ctx.close();
  }
  return { assertions };
}
