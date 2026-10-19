import test from "node:test";
import { Ephemeris } from "../dist/index.js";
import { runBaziReverseScenarios } from "./bazi-reverse-scenarios.mjs";
test("C++ BaZi reverse intervals: clocks, all rat modes, clipping and lifecycle", async () => {
  const eph = await Ephemeris.initialize({ loadBuiltinEop: false });
  try {
    console.log(runBaziReverseScenarios(eph));
  } finally {
    eph.close();
  }
});
