import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Ephemeris } from "../dist/index.js";
import { AstroDateTime } from "../dist/index.js";
import { Body, PositionFlag, ResultFlag, TtJulianDate } from "../dist/index.js";
import { runScenarios, exerciseEclipses } from "./scenarios.mjs";
import { runExtendedScenarios } from "./extended-scenarios.mjs";
const reference = JSON.parse(
  await readFile(
    new URL("./fixtures/native-reference.json", import.meta.url),
    "utf8",
  ),
);
reference.rows.push(
  ...JSON.parse(
    await readFile(
      new URL("./fixtures/opm2-reference.json", import.meta.url),
      "utf8",
    ),
  ),
);
test("real mixed-route position batches retain approximation flags from later targets", async () => {
  const eph = await Ephemeris.initialize({ loadBuiltinEop: false });
  const ctx = eph.createContext();
  try {
    const tt = TtJulianDate.fromDouble(2460310.5);
    const options = { flags: [PositionFlag.allowBarycenterApproximation] };
    const exact = ctx.position.atTt(Body.sun, tt, options);
    const approximate = ctx.position.atTt(Body.saturn, tt, options);
    assert.equal(
      exact.flags.contains(ResultFlag.barycenterApproximation),
      false,
    );
    assert.equal(
      approximate.flags.contains(ResultFlag.barycenterApproximation),
      true,
    );
    for (const targets of [
      [Body.sun, Body.saturn],
      [Body.saturn, Body.sun],
      [Body.sun, Body.sun, Body.saturn],
    ]) {
      const batch = ctx.position.batchAtTt(targets, tt, options);
      assert.equal(batch.flags.mask, exact.flags.union(approximate.flags).mask);
      assert.equal(batch.value.length, targets.length);
    }
  } finally {
    eph.close();
  }
});
test("real Wasm public facade, ownership, time policy and native numerical fixtures", async () => {
  const eph = await Ephemeris.initialize({ loadBuiltinEop: false });
  try {
    let sourceBytes;
    const root = process.env.TAIYIN_TEST_DATA_ROOT;
    if (root) {
      sourceBytes = {};
      for (const name of [
        "sun",
        "moon",
        "emb",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
        "uranus",
        "neptune",
        "pluto",
      ])
        sourceBytes[`${name}.opm2`] = new Uint8Array(
          await readFile(resolve(root, `${name}.opm2`)),
        );
    }
    const report = await runScenarios(eph, {
      reference,
      ...(sourceBytes ? { sourceBytes } : {}),
    });
    console.log(report);
    assert.ok(report.nativeRows >= 178);
    const extendedReference = sourceBytes
      ? JSON.parse(
          await readFile(
            new URL("./fixtures/bazi-native-reference.json", import.meta.url),
            "utf8",
          ),
        )
      : undefined;
    const extended = runExtendedScenarios(eph, {
      reference: extendedReference,
    });
    console.log("Extended:", extended);
  } finally {
    eph.close();
  }
});
test("all 39 eclipse operations execute through the same real C++ Wasm bridge", async () => {
  const eph = await Ephemeris.initialize();
  const ctx = eph.createContext();
  try {
    const methods = exerciseEclipses(ctx);
    assert.equal(new Set(methods).size, 39);
    console.log("Eclipse methods:", methods.length);
  } finally {
    eph.close();
  }
});
test("separately initialized runtimes do not share mutable EOP state", async () => {
  const [a, b] = await Promise.all([
    Ephemeris.initialize(),
    Ephemeris.initialize(),
  ]);
  try {
    a.clearEop();
    assert.equal(a.hasEop, false);
    assert.equal(b.hasEop, true);
    const ca = a.createContext({ allowUtcOutOfRangeEstimate: true });
    const cb = b.createContext();
    const catalog = a.createZiweiDataCatalog();
    assert.throws(() => cb.ziwei({ catalog }), /same Ephemeris/);
    const local = new AstroDateTime(2003, 3, 13, 14, 15);
    const chart = cb.bazi().calculateLocal(local, { gender: 1 }).value.chart;
    let callsA = 0,
      callsB = 0;
    const make = (runtime, callback) =>
      runtime
        .createBaziShenShaCatalog()
        .addModule({
          label: "same-label",
          rules: [{ id: "same-id", name: "x", test: callback }],
        })
        .createContext();
    const sha = make(a, () => {
      callsA++;
      return true;
    });
    const shb = make(b, () => {
      callsB++;
      return false;
    });
    const evaluate = (h) =>
      h
        .evaluate(chart, chart.dayPillar)
        .value.some((m) => m.id === "same-label:same-id");
    assert.equal(evaluate(sha), true);
    assert.equal(evaluate(shb), false);
    assert.deepEqual([callsA, callsB], [1, 1]);
    a.close();
    assert.equal(catalog.isClosed, true);
    assert.equal(sha.isClosed, true);
    assert.throws(() => ca.clone(), /closed/);
    assert.equal(evaluate(shb), false);
  } finally {
    a.close();
    b.close();
  }
});
