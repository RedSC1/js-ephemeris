import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
  utimesSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import {
  requiredPackageInputs,
  verifyPackageInputs,
  verifyInstalledPackageInputs,
} from "../scripts/verify-package.mjs";
import {
  root,
  json,
  npm,
  sha256,
  validateCorePin,
} from "../scripts/package-utils.mjs";
import {
  prepareCoreArchive,
  prepareCoreBuild,
  refreshSdkNotices,
} from "../scripts/package-build-inputs.mjs";
import { sdkNotices } from "../scripts/verify-package.mjs";
import {
  cleanupInstalledTest,
  closeViteServers,
} from "../scripts/package-test-cleanup.mjs";

function corePin(bytes = "archive", revision = "a".repeat(40)) {
  const repository = "https://github.com/example/core";
  return {
    repository,
    tag: "v1.1.0",
    revision,
    archiveUrl: `${repository}/archive/${revision}.tar.gz`,
    archiveSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "js-ephemeris-prepack-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(dirname(resolve(root, file)), { recursive: true });
    writeFileSync(resolve(root, file), value);
  };
  const pin = { core: corePin(), emscripten: "6.0.12" };
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

test("installed candidates validate against the build without source-tree files", (t) => {
  const f = fixture(t);
  rmSync(resolve(f.root, "src"), { recursive: true, force: true });
  rmSync(resolve(f.root, "wasm-build.json"));
  assert.equal(
    verifyInstalledPackageInputs(f.root, f.info).packageVersion,
    "1.1.0-dev.0",
  );
  f.write("assets/taiyin_web.wasm", "altered candidate");
  assert.throws(
    () => verifyInstalledPackageInputs(f.root, f.info),
    /Missing or mismatched/,
  );
});

test("installed candidates reject wrong identities and source provenance", (t) => {
  const f = fixture(t);
  const expected = structuredClone(f.info);
  f.write(
    "package.json",
    JSON.stringify({ name: expected.packageName, version: "0.0.2" }),
  );
  assert.throws(
    () => verifyInstalledPackageInputs(f.root, expected),
    /candidate does not match/,
  );
  f.write(
    "package.json",
    JSON.stringify({
      name: expected.packageName,
      version: expected.packageVersion,
    }),
  );
  f.info.pin.core.revision = "b".repeat(40);
  f.save();
  assert.throws(
    () => verifyInstalledPackageInputs(f.root, expected),
    /candidate does not match/,
  );
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

test("core archives must be bound to their declared immutable revision", () => {
  const core = corePin();
  assert.doesNotThrow(() => validateCorePin(core));
  for (const invalid of [
    {
      ...core,
      archiveUrl: `${core.repository}/archive/refs/tags/v1.1.0.tar.gz`,
    },
    { ...core, revision: "b".repeat(40) },
    { ...core, archiveSha256: "not-a-checksum" },
  ])
    assert.throws(
      () => validateCorePin(invalid),
      /pinned repository\/revision/,
    );
});

test("prepack also rejects a revision inconsistent with its archive URL", (t) => {
  const f = fixture(t);
  f.info.pin.core.revision = "b".repeat(40);
  f.write("wasm-build.json", JSON.stringify(f.info.pin));
  f.save();
  assert.throws(
    () => verifyPackageInputs(f.root),
    /pinned repository\/revision/,
  );
});

test("pin changes and corrupt caches fetch new verified archives; matching caches stay offline", async (t) => {
  const f = fixture(t);
  const archive = resolve(f.root, "core.tar.gz");
  const oldCore = corePin("old");
  const core = corePin("new", "b".repeat(40));
  let downloads = 0;
  const download = async (url) => {
    downloads++;
    assert.equal(url, core.archiveUrl);
    return new Response("new");
  };
  f.write("core.tar.gz", "old");
  await prepareCoreArchive({
    core: oldCore,
    archive,
    fetchArchive: () => assert.fail("Matching cache must not fetch"),
  });
  for (const previous of ["old", "corrupt"]) {
    f.write("core.tar.gz", previous);
    await prepareCoreArchive({ core, archive, fetchArchive: download });
    assert.equal(readFileSync(archive, "utf8"), "new");
  }
  rmSync(archive);
  await prepareCoreArchive({ core, archive, fetchArchive: download });
  assert.equal(downloads, 3);
  assert.equal(sha256(archive), core.archiveSha256);
});

test("failed downloads never replace the previous archive", async (t) => {
  const f = fixture(t);
  const archive = resolve(f.root, "core.tar.gz");
  f.write("core.tar.gz", "old");
  for (const [response, expected] of [
    [new Response("wrong"), /SHA-256 mismatch/],
    [new Response("unavailable", { status: 503 }), /HTTP 503/],
  ]) {
    await assert.rejects(
      prepareCoreArchive({
        core: corePin("new"),
        archive,
        fetchArchive: async () => response,
      }),
      expected,
    );
    assert.equal(readFileSync(archive, "utf8"), "old");
  }
});

test("explicit archives stay offline and checksum failures do not fall back to downloads", async (t) => {
  const f = fixture(t);
  const archive = resolve(f.root, "core.tar.gz");
  const providedArchive = resolve(f.root, "provided.tar.gz");
  const options = {
    core: corePin("new"),
    archive,
    providedArchive,
    fetchArchive: () => assert.fail("Explicit archive must not fetch"),
  };
  f.write("provided.tar.gz", "wrong");
  await assert.rejects(prepareCoreArchive(options), /SHA-256 mismatch/);
  assert.equal(existsSync(archive), false);
  f.write("provided.tar.gz", "new");
  await prepareCoreArchive(options);
  assert.equal(readFileSync(archive, "utf8"), "new");
  await prepareCoreArchive({ ...options, providedArchive: archive });
  assert.equal(sha256(archive), options.core.archiveSha256);
});

test("repeated builds remove cached compilers, newer objects and edited source, but retain the archive", (t) => {
  const f = fixture(t);
  f.write("core.tar.gz", "verified");
  f.write("unrelated.txt", "keep");
  for (let buildNumber = 0; buildNumber < 2; buildNumber++) {
    f.write("core/source.cpp", "edited");
    f.write("wasm/CMakeCache.txt", "old compiler");
    f.write("wasm/object.o", "old object");
    const future = new Date(Date.now() + 86400000);
    utimesSync(resolve(f.root, "wasm/object.o"), future, future);
    const { source, build } = prepareCoreBuild(f.root);
    assert.deepEqual(readdirSync(source), []);
    assert.deepEqual(readdirSync(build), []);
    assert.equal(
      readFileSync(resolve(f.root, "core.tar.gz"), "utf8"),
      "verified",
    );
    assert.equal(
      readFileSync(resolve(f.root, "unrelated.txt"), "utf8"),
      "keep",
    );
  }
});

test("SDK notices are recreated without stale or accidentally copied files", (t) => {
  const f = fixture(t);
  const sdk = resolve(f.root, "sdk");
  const assets = resolve(f.root, "assets");
  for (const [name, file] of Object.entries(sdkNotices))
    f.write(`sdk/${file}`, name);
  f.write("assets/licenses/obsolete.txt", "stale");
  refreshSdkNotices(sdk, assets);
  assert.deepEqual(
    readdirSync(resolve(assets, "licenses")).sort(),
    Object.keys(sdkNotices).sort(),
  );
  for (const name of Object.keys(sdkNotices))
    assert.equal(readFileSync(resolve(assets, "licenses", name), "utf8"), name);
});

test("npm files whitelist excludes unexpected SDK-directory entries even without rebuilding", (t) => {
  const f = fixture(t);
  const pkg = json(resolve(root, "packages/js-ephemeris/package.json"));
  f.write(
    "package.json",
    JSON.stringify({ name: pkg.name, version: pkg.version, files: pkg.files }),
  );
  f.write("assets/licenses/accidental.txt", "do not package");
  const [packed] = JSON.parse(
    npm(["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: f.root,
      encoding: "utf8",
      stdio: "pipe",
    }),
  );
  assert.deepEqual(
    packed.files
      .map(({ path }) => path)
      .filter((file) => file.startsWith("assets/licenses/"))
      .sort(),
    Object.keys(sdkNotices)
      .map((name) => `assets/licenses/${name}`)
      .sort(),
  );
});

test("browser close failure still stops a real server and removes the temporary project", async (t) => {
  const f = fixture(t);
  const server = createServer();
  t.after(() => server.close());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  await assert.rejects(
    cleanupInstalledTest({
      browser: {
        close: async () => {
          throw new Error("browser transport failed");
        },
      },
      server,
      app: f.root,
    }),
    /browser transport failed/,
  );
  assert.equal(server.listening, false);
  assert.equal(existsSync(f.root), false);
});

test("server close rejection or synchronous failure still removes the temporary project", async (t) => {
  for (const close of [
    (callback) => callback(new Error("server close failed")),
    () => {
      throw new Error("server close failed");
    },
  ]) {
    const f = fixture(t);
    await assert.rejects(
      cleanupInstalledTest({ server: { close }, app: f.root }),
      /server close failed/,
    );
    assert.equal(existsSync(f.root), false);
  }
});

test("Vite preview lifecycle cleanup still runs when dev-server close rejects", async () => {
  let closed = false;
  await assert.rejects(
    closeViteServers(
      {
        close: async () => {
          throw new Error("dev close failed");
        },
      },
      {
        close: async () => {
          closed = true;
        },
      },
    ),
    /dev close failed/,
  );
  assert.equal(closed, true);
});

test("Vite preview lifecycle executes plugin hooks and removes its signal listener", async (t) => {
  const f = fixture(t);
  const { preview } = await import("vite");
  const signals = process.listeners("SIGTERM");
  let hookCalled = false;
  f.write("dist/index.html", "<!doctype html><title>Preview cleanup</title>");
  const server = await preview({
    root: f.root,
    configFile: false,
    preview: { host: "127.0.0.1", port: 0 },
    plugins: [
      {
        name: "check-preview-close",
        closePreviewServer() {
          hookCalled = true;
        },
      },
    ],
  });
  t.after(() => server.close());
  await closeViteServers(undefined, server);
  assert.equal(hookCalled, true);
  assert.equal(server.httpServer.listening, false);
  assert.deepEqual(process.listeners("SIGTERM"), signals);
});
