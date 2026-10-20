# Building and testing an npm tarball

These commands build local artifacts only. They do not publish to npm; the
package remains `private: true`. [中文](packaging.zh-CN.md)

## Prerequisites

- Node.js 22+, npm, CMake and tar.
- Emscripten **6.0.12**, installed and activated with `emsdk`.
- Chromium or Chrome for the browser tests. `CHROME_BIN` can select an
  executable; otherwise the test uses a Playwright Chromium install or Chrome.

```sh
npm ci
# Activate the pinned SDK before running build commands.
source /path/to/emsdk/emsdk_env.sh
npm run pack:local
npm run test:package
# Full browser-engine and Vite dev/production checks:
npm exec -- playwright-core install chromium firefox webkit
npm run test:package -- --browsers chromium,firefox,webkit --vite
# Node-only CI jobs do not require a browser installation:
npm run test:package -- --browsers none
# Test an existing candidate verbatim (CI uses the build job's tarball):
npm run test:package -- --archive build/packages/js-ephemeris-1.1.0.tgz --browsers chromium,firefox,webkit --vite
```

If no browser is installed, `npx playwright-core install chromium` installs the
matching test browser. Playwright is a development dependency, not a runtime
dependency of the installed package.

## Build inputs and output

`wasm-build.json` records the public C++ tag, exact revision, archive SHA-256,
Emscripten version and environments. `build:package` downloads the archive
(network required on the first build), verifies it and extracts a fresh source
tree under ignored `build/package/`. The archive URL must contain the declared
immutable revision, not a movable tag. Missing or checksum-mismatched cached
archives are downloaded again; an explicitly supplied archive fails closed on
a checksum mismatch. It never chooses an adjacent checkout.
To use an already downloaded archive, with the same checksum validation:

```sh
npm run pack:local -- --core-archive /path/to/taiyin-v1.1.0.tar.gz
```

The output is three archives under `build/packages/`: `js-ephemeris-<version>.tgz`, `js-bazi-<version>.tgz` and `js-ziwei-<version>.tgz`. It contains the JS
facade, declarations, ESM loader, Wasm, public documentation, core/third-party
notices and Emscripten/runtime license files. It does not contain DE datasets,
star catalogs, native DLLs, source checkouts or development dependencies.

`build:package` verifies the Wasm's C ABI, bridge protocol and library version,
then records artifact hashes in `assets/build-info.json`. Ordinary `npm pack`
runs a `prepack` check: missing, changed or stale inputs require rebuilding.
JS output is cleaned and rebuilt so removed modules cannot linger in a tarball.
After changing a notice or the core pin, run `build:package` again.
Each build recreates the source and CMake build directories, so cached compilers
and newer object files cannot survive a pin change. Generated SDK notices are
also recreated; only the six declared notice files are eligible for packaging.

For editing the C++ core, `build:wasm -- /path/to/core` remains a development
entry point. Those outputs do not replace the verified package-build step.

## What the installation test checks

`test:package` runs `npm pack`, installs the `.tgz` in an isolated temporary
project using **offline mode and disabled install scripts**, then checks:

- Bare `import ... from "js-ephemeris"` and installed TypeScript declarations.
- Node and two independent `worker_threads` consumers.
- Browser ESM, two module Workers and one classic Worker in real Chromium.
- Matching numeric results, planetary positions, calendars, eclipses, BaZi,
  embedded Ziwei rules, strict EOP errors, explicit estimate flags and closure.
- Required package entries, no source-tree symlink, and no build-machine path
  embedded in the package. The HTTP test server serves only installed files
  and test fixtures on a loopback address, never the development repository.

Browser and server shutdown are independent cleanup steps: a shutdown failure
does not skip removal of the temporary project. The test writes
`build/package-test-result.json`. These are deployment/consistency tests, not
an independent astronomical-accuracy assessment. Current local coverage is
recorded in [verification notes](verification.md), including startup blockers.
The report lists only browsers actually tested; requested unavailable browsers
fail the command, rather than being silently skipped. Old reports are removed
before each run. WebKit is Playwright's engine build, not Apple's Safari app.

The compatibility CI builds Wasm once on Linux and downloads that artifact in
Node 22/24 jobs on Linux/macOS/Windows and browser/Vite jobs on Linux/macOS.
Every test job also downloads the exact `npm-tarball` artifact and passes it
via `--archive`; no replacement archive is packed in those jobs. Its SHA-256
is recorded in each report, and installed artifact hashes/provenance are checked.
It runs for code changes in pull requests/main and can be dispatched manually.
Documentation-only changes do not rebuild Wasm. No job has publish credentials,
write permissions or an npm publication step.
Vite dev and preview servers are closed through their lifecycle APIs so plugin
cleanup hooks and signal listeners are released, not only their HTTP sockets.

## Loading installed assets

Node and browser Workers use the same asynchronous initializer:

```js
import { Ephemeris } from "js-ephemeris";
const eph = await Ephemeris.initialize();
```

With unbundled browser modules, retain the package's `dist/` and `assets/`
relative layout. When a frontend build copies assets elsewhere, deploy
`taiyin_web.mjs` and `taiyin_web.wasm` together and set `wasmModuleUri` to the
trusted `.mjs` URL. The loader and Wasm have public package subpath exports;
`moduleFactory` is also available for build-tool-managed imports. There is no
implicit CDN or ephemeris download, and no automatic bundler plugin.

## Vite applications

The tested setup keeps the generated loader outside Vite's module graph and
copies it with its Wasm companion into `public/ephemeris/`. Use the installed
package, not this repository's `dist/`, for the application import.
For example, put this in a project-root `copy-ephemeris.mjs` build step:

```js
import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const assets = dirname(
  fileURLToPath(import.meta.resolve("js-ephemeris/assets/taiyin_web.mjs")),
);
const output = resolve("public/ephemeris");
mkdirSync(output, { recursive: true });
for (const name of ["taiyin_web.mjs", "taiyin_web.wasm", "licenses"])
  cpSync(resolve(assets, name), resolve(output, name), { recursive: true });
for (const name of [
  "LICENSE",
  "NOTICE",
  "CORE-NOTICE",
  "THIRD_PARTY_NOTICES.txt",
])
  cpSync(resolve(assets, "..", name), resolve(output, name));
```

Run it before `vite` or `vite build`, then initialize on the client:

```js
import { Ephemeris } from "js-ephemeris";
const eph = await Ephemeris.initialize({
  wasmModuleUri: new URL(
    `${import.meta.env.BASE_URL}ephemeris/taiyin_web.mjs`,
    location.href,
  ),
});
```

Use `build.target: "es2022"` for top-level await and `worker.format: "es"`
when bundling module Workers. The installation suite tests the same initializer
in the main page and a module Worker with both Vite's development server and
its built production preview under `/release-smoke/`, not only the origin root.
This is client-side deployment coverage; it does not claim SSR integration or
automatic asset discovery after arbitrary bundling.

## Split-package installation checks

When `--archive` names the core archive, the same directory must contain the matching
`js-bazi` and `js-ziwei` archives. CI candidates are installed from their original bytes,
never repacked. Tests first use core alone, then each extension independently and all three together.
Extensions have only a core peer dependency and contain no Wasm, loader or duplicate core implementation.
Browser main-thread tests use an import map; unbundled Workers test core only.
Node Workers and Vite Workers exercise all three packages.
