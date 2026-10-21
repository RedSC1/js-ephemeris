# Changelog

## 1.1.1 — 2026-10-21

- Correct the English and Chinese npm READMEs: remove stale pre-publication wording and update installation examples.
- Synchronize all three package versions and extension peer dependencies at 1.1.1.
- Documentation and package metadata only; calculation APIs and the pinned Taiyin C++ 1.1.0 core are unchanged.

## 1.1.0 — 2026-10-20

- Split the npm distribution into `js-ephemeris`, `js-bazi` and `js-ziwei`, matching the Dart package boundaries. Optional imports augment the existing context; extensions share one core/Wasm and do not duplicate binaries.
- Verify core-only, each extension separately, and combined offline installs, including installed TypeScript consumers and lifecycle checks.
- Prepare public npm metadata for all three packages, with explicit registry/access, monorepo source directories and matching core peer dependencies. The tooling workspace remains private and CI does not publish.
- JavaScript/TypeScript bindings to the Taiyin C++ 1.1.0 WebAssembly core,
  shared by Node.js, browsers and Workers. Initialization is asynchronous;
  calculations are synchronous and return named `{ value, flags }` results.
- Planetary and fixed-star positions, observed coordinates, time scales,
  solar/lunar eclipses, astronomical searches and astrology extensions.
- Chinese calendars, solar terms, four pillars, BaZi and Ziwei, including
  chart clocks, reverse lookup, custom catalogs and rule options.
- Caller-owned runtimes and contexts, typed errors, explicit UTC/EOP estimate
  policy, and `Uint8Array` loading for external ephemerides and other resources.
- Verified npm packaging pinned to an immutable public C++ revision and
  Emscripten 6.0.12, with artifact hashes and bundled third-party/runtime notices.
- Installed-package tests for Node, browser engines, independent Workers and
  Vite development/production builds. A compatibility CI workflow builds Wasm
  once and reuses its artifacts across test jobs; it never publishes packages.

Original binding code is MPL-2.0; third-party materials retain their notices.
Precise DE datasets and fixed-star catalogs are not bundled or downloaded.

### Upgrade from 0.0.x

The earlier pure-JavaScript API is not compatible with the WebAssembly API.
Adapt imports and calculations using the current README and API guides.
The earlier releases retain their original Apache-2.0 license in Git history.
