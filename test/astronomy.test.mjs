import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile, mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ephemeris } from "./all-packages.mjs";
import {
  Wire,
  loadModule,
} from "../packages/js-ephemeris/dist/internal/wasm.js";
import { runAstronomyScenarios, starText } from "./astronomy-scenarios.mjs";
import { runCustomModelScenarios } from "./custom-model-scenarios.mjs";
import { astronomyOperations } from "../packages/js-ephemeris/dist/internal/astronomy-operations.generated.js";
import { astronomySchemas } from "../packages/js-ephemeris/dist/internal/astronomy-records.generated.js";
const fields = (type, key = "") =>
  type === "taiyin_split_julian_date"
    ? [
        { type: "int64_t", key: key + ".dayNumber" },
        { type: "double", key: key + ".dayFraction" },
      ]
    : astronomySchemas[type]
      ? astronomySchemas[type].flatMap((f) =>
          Array.from({ length: f.shape.reduce((a, b) => a * b, 1) }, () =>
            fields(f.type, key + "." + f.key),
          ).flat(),
        )
      : [{ type, key }];
test("raw astronomy transport rejects unsafe int64 JD before narrowing", async () => {
  const wire = new Wire(await loadModule({}));
  wire.checked(wire.fixed("_taiyin_web_initialize", [], [1, 0, 0, 0]));
  const created = wire.checked(
    wire.fixed("_taiyin_web_context_create", [], [], 32, false),
  );
  const handle = created[1];
  try {
    for (const bad of [2 ** 63, -(2 ** 63), 2 ** 53, NaN, Infinity]) {
      const reply = wire.structured(
        "_taiyin_web_astronomy",
        [handle, 0],
        [301, bad, 0, 0, 0],
      );
      assert.equal(reply.status, -1);
    }
    assert.equal(
      wire.structured(
        "_taiyin_web_astronomy",
        [handle, 0],
        [301, 2460310, 0.5, 0, 0],
      ).status,
      0,
    );
  } finally {
    wire.invoke("_taiyin_context_destroy", handle);
  }
});
test("all astronomy operations through public JS, optional native A/B oracle", async () => {
  assert.equal(
    await readFile(
      new URL("./fixtures/astronomy-stars.tsf1", import.meta.url),
      "utf8",
    ),
    starText,
  );
  const eph = await Ephemeris.initialize();
  const records = [];
  const structured = Wire.prototype.structured,
    fixed = Wire.prototype.fixed;
  Wire.prototype.structured = function (name, prefix, input) {
    const value = structured.call(this, name, prefix, input);
    if (
      name === "_taiyin_web_astronomy" ||
      name === "_taiyin_web_astronomy_extra"
    )
      records.push({
        domain: name.endsWith("extra") ? 1 : 0,
        op: prefix[1],
        input: [...input],
        values: value.values,
      });
    return value;
  };
  Wire.prototype.fixed = function (name, prefix, input, ...other) {
    if (name === "_taiyin_web_configure" && prefix[1] === 9)
      records.push({ domain: 2, op: 0, input: [] });
    return fixed.call(this, name, prefix, input, ...other);
  };
  let report;
  try {
    report = runAstronomyScenarios(eph);
  } finally {
    Wire.prototype.structured = structured;
    Wire.prototype.fixed = fixed;
    eph.close();
  }
  console.log({
    assertions: report.assertions,
    success: report.success.length,
    nativeErrors: report.nativeErrors,
  });
  assert.equal(report.success.length + report.nativeErrors.length, 107);
  if (!process.env.TAIYIN_ASTRONOMY_NATIVE_PROBE) {
    console.log(
      "Native comparison not requested; real Wasm coverage completed.",
    );
    return;
  }
  const input =
    records
      .map(
        (r) =>
          `${r.domain} ${r.op} ${r.input.length} ${r.input.map((n) => String(n)).join(" ")}`,
      )
      .join("\n") + "\n";
  const cwd = await mkdtemp(join(tmpdir(), "taiyin-astronomy-oracle-"));
  let native;
  try {
    native = spawnSync(
      process.env.TAIYIN_ASTRONOMY_NATIVE_PROBE,
      [
        fileURLToPath(
          new URL("./fixtures/astronomy-stars.tsf1", import.meta.url),
        ),
      ],
      {
        input,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        cwd,
        env: { ...process.env, TAIYIN_DATA_ROOT: "" },
      },
    );
  } finally {
    await rmdir(cwd);
  }
  assert.equal(native.status, 0, `${native.error ?? ""}\n${native.stderr}`);
  const output = native.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number));
  const expected = records.filter((r) => r.domain !== 2);
  assert.equal(output.length, expected.length);
  let compared = 0,
    maxDifference = 0;
  for (let row = 0; row < output.length; row++) {
    const r = expected[row],
      raw = output[row];
    assert.equal(raw[0], raw.length - 1);
    const n = raw.slice(1),
      w = r.values;
    assert.equal(n[1], w[1], `status op ${r.domain}/${r.op}`);
    assert.equal(n[0], w[0], `flags op ${r.domain}/${r.op}`);
    if (n[1] !== 0 || (r.domain === 1 && r.op === 4)) continue;
    assert.equal(n.length, w.length, `width op ${r.domain}/${r.op}`);
    const spec = r.domain === 0 ? astronomyOperations[r.op] : undefined;
    let names = spec
      ? spec.outputs.flatMap((o) =>
          o.tuple
            ? Array.from({ length: o.tuple }, () => ({
                type: "double",
                key: o.name,
              }))
            : fields(o.type),
        )
      : [];
    if (spec?.capacity)
      names = Array.from({ length: n[2] }, () => names).flat();
    if (r.domain === 1) {
      if (r.op === 5) {
        names = [
          { type: "uint32_t", key: "capabilityLow" },
          { type: "uint32_t", key: "capabilityHigh" },
        ];
      } else {
        const count = n[2];
        names = [
          ...Array.from({ length: count * 32 }, () => ({
            type: "double",
            key: "diagnostic",
          })),
          ...Array.from({ length: count }, () =>
            r.op === 0
              ? Array.from({ length: 6 }, () => ({
                  type: "double",
                  key: "position",
                }))
              : fields("taiyin_observed_position"),
          ).flat(),
        ];
      }
    }
    // Header timing/evaluation diagnostics are not portable iteration oracles;
    // payloads are compared, with tight angular/distance and JD tolerances.
    for (let i = 32; i < n.length; i++) {
      const field = names[i - 32];
      assert.ok(field, `missing field metadata ${i}`);
      if (
        /(?:iteration|evaluation|sample|refine|scannedDay|sampledWindow|visibilityEvaluation)Count$|\.cacheHit$/.test(
          field.key,
        ) ||
        field.key === "diagnostic"
      )
        continue;
      if (Number.isNaN(n[i]) && Number.isNaN(w[i])) continue;
      if (n[i] === w[i]) continue;
      const d = Math.abs(n[i] - w[i]);
      maxDifference = Math.max(d, maxDifference);
      const tolerance =
        field.type === "double"
          ? field.key.endsWith("dayFraction")
            ? 5e-8
            : 2e-7 * Math.max(1, Math.abs(n[i]))
          : 0;
      assert.ok(
        d <= tolerance,
        `op ${r.domain}/${r.op} index ${i}: ${n[i]} != ${w[i]}`,
      );
    }
    compared++;
  }
  console.log({
    nativeCallsCompared: compared,
    maxMixedUnitDifference: maxDifference,
  });
});
test("custom native callbacks, ownership and errors", async () => {
  const eph = await Ephemeris.initialize();
  try {
    console.log(runCustomModelScenarios(eph));
  } finally {
    eph.close();
  }
});
test("custom registrations are isolated and closed by their runtime", async () => {
  const [a, b] = await Promise.all([
    Ephemeris.initialize(),
    Ephemeris.initialize(),
  ]);
  const ca = a.createContext(),
    cb = b.createContext();
  const { TtJulianDate } = await import("./all-packages.mjs");
  const tt = TtJulianDate.fromDouble(2460310.5);
  const ra = a.registerCustomTarget({
    targetId: -920001,
    evaluatePosition: () => [1, 0, 0, 0, 0, 0],
  });
  const rb = b.registerCustomTarget({
    targetId: -920001,
    evaluatePosition: () => [2, 0, 0, 0, 0, 0],
  });
  try {
    assert.equal(ca.position.atTt(-920001, tt).value.values[0], 1);
    assert.equal(cb.position.atTt(-920001, tt).value.values[0], 2);
    a.close();
    assert.equal(ra.isClosed, true);
    assert.equal(rb.isClosed, false);
    assert.equal(cb.position.atTt(-920001, tt).value.values[0], 2);
  } finally {
    a.close();
    b.close();
  }
  assert.equal(rb.isClosed, true);
});
