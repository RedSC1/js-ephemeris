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
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, extname, sep, basename } from "node:path";
import { chromium, firefox, webkit } from "playwright-core";
import {
  build as viteBuild,
  createServer as viteServer,
  preview as vitePreview,
} from "vite";
import { root, npm, run, json, sha256 } from "./package-utils.mjs";
import {
  cleanupInstalledTest,
  closeViteServers,
} from "./package-test-cleanup.mjs";
import {
  requiredPackageInputs,
  verifyPackageInputs,
  verifyInstalledPackageInputs,
} from "./verify-package.mjs";

const args = process.argv.slice(2);
const reportPath = resolve(root, "build/package-test-result.json");
// A failed run must not leave a previous successful report looking current.
rmSync(reportPath, { force: true });
let browserNames = ["chromium"];
let testVite = false;
let suppliedArchive;
for (let index = 0; index < args.length; index++) {
  if (args[index] === "--vite") testVite = true;
  else if (args[index] === "--browsers" && args[index + 1]) {
    const value = args[++index];
    browserNames = value === "none" ? [] : value.split(",");
  } else if (args[index] === "--archive" && args[index + 1]) {
    suppliedArchive = resolve(args[++index]);
  } else
    throw new Error(
      "Usage: npm run test:package -- [--archive candidate.tgz] [--browsers chromium,firefox,webkit|none] [--vite]",
    );
}
const browserTypes = { chromium, firefox, webkit };
if (
  browserNames.some((name) => !Object.hasOwn(browserTypes, name)) ||
  new Set(browserNames).size !== browserNames.length ||
  (testVite && !browserNames.length)
)
  throw new Error(
    "Choose distinct supported browsers; --vite requires a browser",
  );

async function checkPage(browser, url, expected, workerCount) {
  console.log(`[package-test] Checking ${url}`);
  const page = await browser.newPage();
  try {
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(url);
    await page.waitForFunction(() => globalThis.packageTestResult, undefined, {
      timeout: 180000,
    });
    const result = await page.evaluate(() => globalThis.packageTestResult);
    assert.equal(result.status, "PASS", `${url}: ${result.error}`);
    assert.deepEqual(errors, []);
    assert.deepEqual(result.browser, expected);
    assert.equal(result.workers.length, workerCount);
    result.workers.forEach((worker) => assert.deepEqual(worker, expected));
  } finally {
    await page.close();
  }
}

const expectedBuild = verifyPackageInputs();
const destination = resolve(root, "build/packages");
mkdirSync(destination, { recursive: true });
const [packed] = JSON.parse(
  npm(
    suppliedArchive
      ? [
          "pack",
          suppliedArchive,
          "--dry-run",
          "--ignore-scripts",
          "--json",
          "--silent",
        ]
      : ["pack", "--json", "--silent", "--pack-destination", destination],
    {
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 8 * 1024 * 1024,
    },
  ),
);
// In supplied mode npm's dry-run is only an inventory read. Install these
// original bytes, never a newly generated archive from this test job.
const archive = suppliedArchive ?? resolve(destination, packed.filename);
const archiveSha256 = sha256(archive);
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
  copyFileSync(archive, resolve(app, "input.tgz"));
  assert.equal(sha256(resolve(app, "input.tgz")), archiveSha256);
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
  verifyInstalledPackageInputs(installed, expectedBuild);
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
  let dev, production;
  const browserReports = [];
  try {
    if (testVite) {
      const viteRoot = resolve(app, "vite");
      mkdirSync(resolve(viteRoot, "public/ephemeris"), { recursive: true });
      for (const file of ["index.html", "main.mjs", "worker.mjs"])
        copyFileSync(
          resolve(root, "test/package/vite", file),
          resolve(viteRoot, file),
        );
      copyFileSync(
        resolve(smoke, "scenario.mjs"),
        resolve(viteRoot, "scenario.mjs"),
      );
      for (const file of ["taiyin_web.mjs", "taiyin_web.wasm"])
        copyFileSync(
          resolve(installed, "assets", file),
          resolve(viteRoot, "public/ephemeris", file),
        );
      const config = {
        root: viteRoot,
        configFile: false,
        base: "/release-smoke/",
        build: { target: "es2022" },
        worker: { format: "es" },
        server: { host: "127.0.0.1", port: 0 },
        preview: { host: "127.0.0.1", port: 0 },
      };
      dev = await viteServer(config);
      await dev.listen();
      await viteBuild(config);
      production = await vitePreview(config);
    }
    for (const name of browserNames) {
      console.log(
        `[package-test] ${name}: installed modules${testVite ? ", Vite dev and production" : ""}`,
      );
      browser = await browserTypes[name].launch({
        timeout: 60000,
        ...(name !== "chromium"
          ? {}
          : process.env.CHROME_BIN
            ? { executablePath: process.env.CHROME_BIN }
            : existsSync(chromium.executablePath())
              ? {}
              : { channel: "chrome" }),
      });
      await checkPage(
        browser,
        `http://127.0.0.1:${server.address().port}/smoke/browser.html`,
        reports.node,
        3,
      );
      if (testVite) {
        for (const http of [dev.httpServer, production.httpServer])
          await checkPage(
            browser,
            `http://127.0.0.1:${http.address().port}/release-smoke/`,
            reports.node,
            1,
          );
      }
      browserReports.push({
        name,
        version: browser.version(),
        installedModules: "PASS",
        moduleWorkers: 2,
        classicWorkers: 1,
        ...(testVite
          ? {
              viteDev: "PASS",
              viteProduction: "PASS",
              viteModuleWorker: "PASS",
            }
          : {}),
      });
      await browser.close();
      browser = undefined;
    }
  } finally {
    await closeViteServers(dev, production);
  }
  const report = {
    status: "PASS",
    package: `${packed.name}@${packed.version}`,
    archive: basename(archive),
    archiveSha256,
    suppliedArchive: suppliedArchive !== undefined,
    compressedBytes: statSync(archive).size,
    unpackedBytes: packed.unpackedSize,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    node: "PASS",
    nodeWorkers: reports.nodeWorkers,
    browsers: browserReports,
    ...(testVite
      ? {
          viteVersion: json(resolve(root, "node_modules/vite/package.json"))
            .version,
        }
      : {}),
    installedTypes: "PASS",
    core: json(resolve(installed, "assets/build-info.json")).pin.core.tag,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await cleanupInstalledTest({ browser, server, app });
}
