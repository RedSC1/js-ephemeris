import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, extname, sep } from "node:path";
import { chromium } from "playwright-core";
import { root, npm, run, json } from "./package-utils.mjs";
import { cleanupInstalledTest } from "./package-test-cleanup.mjs";
import {
  requiredPackageInputs,
  verifyPackageInputs,
} from "./verify-package.mjs";

verifyPackageInputs();
const destination = resolve(root, "build/packages");
mkdirSync(destination, { recursive: true });
const [packed] = JSON.parse(
  npm(["pack", "--json", "--silent", "--pack-destination", destination], {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 8 * 1024 * 1024,
  }),
);
const files = packed.files.map(({ path }) => path);
for (const required of [
  ...requiredPackageInputs,
  "assets/build-info.json",
  "dist/index.js",
  "dist/index.d.ts",
])
  assert.ok(files.includes(required), `Missing tarball entry: ${required}`);
assert.deepEqual(
  files.filter((file) => file.startsWith("assets/licenses/")).sort(),
  requiredPackageInputs
    .filter((file) => file.startsWith("assets/licenses/"))
    .sort(),
  "Only the declared SDK notices may be packaged",
);
assert.ok(
  !files.some(
    (file) =>
      /^(src|scripts|test|build|node_modules|private)\//.test(file) ||
      /\.(opm2|bsp|spk|tkc1|tsc1)$/.test(file) ||
      file === ".npmrc" ||
      file === ".env",
  ),
);
const app = mkdtempSync(join(tmpdir(), "js-ephemeris-installed-"));
let browser, server;
try {
  writeFileSync(
    resolve(app, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  copyFileSync(
    resolve(destination, packed.filename),
    resolve(app, "input.tgz"),
  );
  // Offline and scripts disabled: the installed artifact must be self-contained.
  npm(
    [
      "install",
      "./input.tgz",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
    ],
    { cwd: app },
  );
  const installed = resolve(app, "node_modules/js-ephemeris");
  assert.ok(
    lstatSync(installed).isDirectory() &&
      !lstatSync(installed).isSymbolicLink(),
  );
  assert.ok(
    !existsSync(resolve(installed, "src")) &&
      !existsSync(resolve(installed, "node_modules")),
  );
  for (const file of files) {
    const contents = readFileSync(resolve(installed, file));
    assert.ok(
      !contents.includes(Buffer.from(root.replace(/\/$/, ""))),
      `Build-machine path leaked in ${file}`,
    );
  }
  const smoke = resolve(app, "smoke");
  mkdirSync(smoke);
  for (const file of [
    "scenario.mjs",
    "node.mjs",
    "node-worker.mjs",
    "browser.html",
    "browser-worker.mjs",
    "browser-classic-worker.js",
    "types.ts",
  ])
    copyFileSync(resolve(root, "test/package", file), resolve(smoke, file));
  const reports = JSON.parse(
    run(process.execPath, [resolve(smoke, "node.mjs")], {
      cwd: app,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 180000,
    }),
  );
  run(
    process.execPath,
    [
      resolve(root, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--skipLibCheck",
      resolve(smoke, "types.ts"),
    ],
    { cwd: app },
  );
  const contentTypes = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".html": "text/html",
    ".json": "application/json",
    ".wasm": "application/wasm",
  };
  server = createServer((req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://127.0.0.1").pathname,
      );
      const base = path.startsWith("/pkg/")
        ? installed
        : path.startsWith("/smoke/")
          ? smoke
          : null;
      if (!base) throw new Error("Not served");
      const file = realpathSync(
        resolve(base, "." + path.slice(path.indexOf("/", 1))),
      );
      if (!file.startsWith(realpathSync(base) + sep))
        throw new Error("Outside root");
      res.writeHead(200, {
        "content-type":
          contentTypes[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  browser = await chromium.launch(
    process.env.CHROME_BIN
      ? { executablePath: process.env.CHROME_BIN }
      : existsSync(chromium.executablePath())
        ? {}
        : { channel: "chrome" },
  );
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/smoke/browser.html`,
  );
  await page.waitForFunction(() => globalThis.packageTestResult, undefined, {
    timeout: 180000,
  });
  const web = await page.evaluate(() => globalThis.packageTestResult);
  assert.equal(web.status, "PASS", web.error);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(web.browser, reports.node);
  assert.equal(web.workers.length, 3);
  web.workers.forEach((report) => assert.deepEqual(report, reports.node));
  const report = {
    status: "PASS",
    package: `${packed.name}@${packed.version}`,
    archive: packed.filename,
    compressedBytes: packed.size,
    unpackedBytes: packed.unpackedSize,
    nodeVersion: process.version,
    browserVersion: browser.version(),
    node: "PASS",
    nodeWorkers: reports.nodeWorkers,
    browser: "PASS",
    browserModuleWorkers: 2,
    browserClassicWorkers: 1,
    installedTypes: "PASS",
    core: json(resolve(installed, "assets/build-info.json")).pin.core.tag,
  };
  writeFileSync(
    resolve(root, "build/package-test-result.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await cleanupInstalledTest({ browser, server, app });
}
