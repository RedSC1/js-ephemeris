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
```

If no browser is installed, `npx playwright-core install chromium` installs the
matching test browser. Playwright is a development dependency, not a runtime
dependency of the installed package.

## Build inputs and output

`wasm-build.json` records the public C++ tag, exact revision, archive SHA-256,
Emscripten version and environments. `build:package` downloads the archive
(network required on the first build), verifies it and extracts a fresh source
tree under ignored `build/package/`. It never chooses an adjacent checkout.
To use an already downloaded archive, with the same checksum validation:

```sh
npm run pack:local -- --core-archive /path/to/taiyin-v1.1.0.tar.gz
```

The output is `build/packages/js-ephemeris-<version>.tgz`. It contains the JS
facade, declarations, ESM loader, Wasm, public documentation, core/third-party
notices and Emscripten/runtime license files. It does not contain DE datasets,
star catalogs, native DLLs, source checkouts or development dependencies.

`build:package` verifies the Wasm's C ABI, bridge protocol and library version,
then records artifact hashes in `assets/build-info.json`. Ordinary `npm pack`
runs a `prepack` check: missing, changed or stale inputs require rebuilding.
JS output is cleaned and rebuilt so removed modules cannot linger in a tarball.
After changing a notice or the core pin, run `build:package` again.

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

The test removes its temporary project and writes
`build/package-test-result.json`. These are deployment/consistency tests, not
an independent astronomical-accuracy assessment. Current local coverage is
macOS ARM64, Node 25 and Chromium; a cross-platform/minimum-Node CI matrix is
still needed before claiming those environments have been verified.

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
