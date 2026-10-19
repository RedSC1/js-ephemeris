import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import {
  requiredPackageInputs,
  verifyPackageInputs,
} from "../scripts/verify-package.mjs";
import { sha256 } from "../scripts/package-utils.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "js-ephemeris-prepack-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(dirname(resolve(root, file)), { recursive: true });
    writeFileSync(resolve(root, file), value);
  };
  const pin = { core: { tag: "v1.1.0" }, emscripten: "6.0.12" };
  write(
    "package.json",
    JSON.stringify({ name: "js-ephemeris", version: "1.1.0-dev.0" }),
  );
  write("wasm-build.json", JSON.stringify(pin));
  write(
    "src/internal/astronomy-operations.generated.ts",
    "export const astronomyProtocolId = 123;",
  );
  for (const file of requiredPackageInputs) write(file, `fixture: ${file}`);
  const info = {
    format: 1,
    packageName: "js-ephemeris",
    packageVersion: "1.1.0-dev.0",
    pin,
    astronomyProtocolId: 123,
    files: Object.fromEntries(
      requiredPackageInputs.map((file) => [
        file,
        { sha256: sha256(resolve(root, file)) },
      ]),
    ),
  };
  const save = () => write("assets/build-info.json", JSON.stringify(info));
  save();
  return { root, write, info, save };
}
test("prepack accepts a complete matching manifest", (t) => {
  const f = fixture(t);
  assert.equal(verifyPackageInputs(f.root).astronomyProtocolId, 123);
});
test("prepack rejects missing verification metadata", (t) => {
  const f = fixture(t);
  rmSync(resolve(f.root, "assets/build-info.json"));
  assert.throws(() => verifyPackageInputs(f.root), /build:package/);
});
for (const file of [
  "assets/taiyin_web.mjs",
  "assets/taiyin_web.wasm",
  "assets/licenses/EMSCRIPTEN-LICENSE.txt",
  "CORE-NOTICE",
]) {
  test(`prepack rejects missing or altered ${file}`, (t) => {
    const f = fixture(t);
    rmSync(resolve(f.root, file));
    assert.throws(() => verifyPackageInputs(f.root), /Missing or mismatched/);
    f.write(file, "tampered");
    assert.throws(() => verifyPackageInputs(f.root), /Missing or mismatched/);
  });
}
test("prepack rejects stale package, source pin and generated protocol", (t) => {
  const f = fixture(t);
  f.info.packageVersion = "0.0.2";
  f.save();
  assert.throws(() => verifyPackageInputs(f.root), /Stale/);
  f.info.packageVersion = "1.1.0-dev.0";
  f.info.pin.emscripten = "0.0.0";
  f.save();
  assert.throws(() => verifyPackageInputs(f.root), /Stale/);
  f.info.pin.emscripten = "6.0.12";
  f.save();
  f.write(
    "src/internal/astronomy-operations.generated.ts",
    "export const astronomyProtocolId = 124;",
  );
  assert.throws(() => verifyPackageInputs(f.root), /Stale/);
});
test("prepack rejects unsafe extra manifest paths", (t) => {
  const f = fixture(t);
  f.info.files["../outside"] = { sha256: "0".repeat(64) };
  f.save();
  assert.throws(
    () => verifyPackageInputs(f.root),
    /Invalid build metadata path/,
  );
});
