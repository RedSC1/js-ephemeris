# Verification record

## 1.1.0 release preparation — 2026-10-20

The current package is built from public core **v1.1.0**, immutable revision
`0c0ac41241624a45e74d2ab9d26da99038c8fa9c`, using Emscripten **6.0.12**,
Release, without fast-math. ABI 11 / base bridge 1 and generated astronomy
protocol checks are enforced before packaging. The package version is 1.1.0,
but `private: true` is retained and nothing has been published.

Local environment: macOS 27.0.1 ARM64. The actual installed tarball, not a
source-tree link, has been exercised with Node **22.23.3**. Chromium **155** and
Playwright WebKit **27.2** pass installed ESM, two module Workers and a classic
Worker; Vite **8.3.4** development and production builds also pass in these
engines, including a module Worker and a non-root `/release-smoke/` base path.
Node 25.9.0 was also tested during earlier packaging work.

On Node 22.23.3, the unit/packaging suite passes **30 tests**, declarations
compile, the real-Wasm integration and astronomy suites each pass **4 tests**,
and BaZi reverse lookup passes **171 assertions**. The installed consumer has
no runtime dependencies and works without install scripts or source-tree links.

Firefox **157** was attempted but exits before executing the test page with
`Could not find profile folder`. A second installed Firefox build and different
profile locations fail at the same startup stage. This matches the upstream
[macOS 27 Firefox app-data protection report](https://github.com/microsoft/playwright/issues/42768);
it is not a successful Firefox compatibility run. No privacy settings or
browser security protections were changed to bypass this blocker.

The system Safari WebDriver was also tried, but session creation reports that
Safari's **Allow remote automation** setting is disabled. Apple's Safari app
has therefore **not** been tested; WebKit coverage is reported separately.

CI is configured for Node 22/24 on Linux/macOS/Windows plus Chromium, Firefox,
WebKit and Vite on Linux/macOS, sharing a single verified Wasm build. This
configuration is not evidence that those remote jobs have already run.
The release is still gated on that matrix and the remaining checks below.

## Historical development verification — 2026-10-18

The following records describe the initial development build on macOS arm64,
Node.js 25.9 and Chromium, based on core branch commit `2dd0bc80` and then-local
adapter additions. They are historical numerical-oracle coverage, not the
provenance of the current package or a new independent accuracy measurement.

## Executed checks

| Check                                                                                                                                              | Result                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Strict TypeScript build / declarations and compile-only public consumer                                                                            | Passed                                    |
| Unit tests: split dates, Date/Unix milliseconds, scale mismatch, integer widths, uint64 flags, schema widths, absent contacts, transport copy/free | 9 passed                                  |
| Node: analytic fallback + time/calendar/BaZi/Ziwei/lifecycle scenario                                                                              | 3,163 assertions; 178 native oracle rows  |
| Node: same scenario after loading 11 actual DE442 OPM2 files                                                                                       | 4,061 assertions; 355 native oracle rows  |
| Browser: same public-facade scenario                                                                                                               | 3,163 assertions; 178 native oracle rows  |
| Eclipse wrapper coverage, Node and browser                                                                                                         | All 39 current bridge operations executed |
| Independent-runtime EOP isolation                                                                                                                  | Passed in Node                            |
| Additional public APIs, analytic fallback, Node and browser                                                                                        | 100 assertions                            |
| Additional APIs with DE442 OPM2 / independent native BaZi fixture                                                                                  | 469 assertions; 35 native oracle rows     |
| Shen Sha callback token isolation and cross-runtime Ziwei catalog rejection                                                                        | Passed in Node                            |

The second-pass astronomy scenario adds 200 assertions in Node and the browser, calling all 107 generated operations and the variable stellar/observed/source adapters. The shared custom-model scenario adds 24 assertions. Separate Node tests cover registration isolation and runtime-owned closure.

Native oracle rows were taken from the existing Dart/native C++ shared-backend reference scenario, not generated by this JS wrapper. They cover analytic positions, explicit time scales, Chinese-calendar terms/moons/month metadata when OPM2 is provided, Ziwei anchors and all 159 natal-star placements/brightness/transformation masks.

The largest absolute numeric difference in those mixed-unit rows was approximately `6.7e-16` without external OPM2 and `7.5e-14` with DE442 OPM2. **These are mixed-unit wrapper consistency checks, not angular error estimates, full scientific validation, or comparison with an independent ephemeris.** Eclipse tests execute every wrapped operation and exercise high flags, optional contacts and route output; they do not independently remeasure NASA/PMO accuracy.

The 11-file OPM2 run additionally forces OPM2-only routing for 12 position/flag combinations and compares them with native output, as well as checking duplicate-name rejection. It does not add those data files to this repository.

The extension fixture was separately selected from the Dart native backend reference file. Its 35 rows cover BaZi chart/Qi-Yun, female fixed/mean/apparent clocks, relation elements, Xiao-Yun, Renyuan-Siling tables/time models, chart-relation collection, and gender-sensitive built-in Shen Sha IDs. All 35 rows matched exactly in the local DE442 run. This checks argument order, gender IDs, physical UT1 use and record decoding, not a separate validation of traditional rules.

The shared extension scenario also tests TDB/explicit-Delta-T batch/state parity, UTC/local/solar/lunar convenience equivalence, strict EOP errors and explicit-estimate flags, synchronous custom predicates, catalog-derived callback retention, disabled/removable custom modules, exact thrown JS values, async-predicate rejection, evaluation/close/runtime reentry guards, TOML reload success and rollback, old/new compiled snapshots, UTC flow/navigation/reverse lookup, casting queries, and closed-handle rejection. These tests use the real C++ Wasm module, not mocked astronomy.

## Astronomy adapter A/B scope

The opt-in native `taiyin_astronomy_probe` compiles the same field-wise adapter against native C++ libraries. The test captures requests made through the public JS methods and replays them with matching semi-analytic initialization, observer, standard atmosphere and synthetic TSF1 test star. The synthetic star is a controlled test fixture, not a distributed scientific star catalog.

All 107 generated calls are exercised: 95 produce successful values in this scenario, and 12 deliberately test bounded no-event searches or incompatible follow-up event records. Status and execution flags must match the native result, including those failures. Successful cases cover all service families; the test also exercises every stellar/observed time/batch path, source metadata and callback lifetime.

Successful numeric payloads are compared with unit-aware handling: JD integer parts must match exactly; fractions use a `5e-8 day` (4.32 ms) iterative-search tolerance; other floating values use `2e-7 * max(1, abs(native))`; integer fields match exactly. Adaptive iteration/evaluation/sample/refinement counts and cache-hit facts are excluded from numeric equality, not from transport decoding. The largest observed mixed-unit payload difference was `1.49e-8`. **This is native/Wasm adapter consistency, not an independent ephemeris accuracy test or a claim that every search has millisecond absolute accuracy.** Broader positive occultation/body fixtures and an independent astronomical oracle remain useful before release.

The custom-model suite checks position-only derivative flags, exact state callbacks, duplicate IDs, explicit unregister, exact thrown JS values, Promise rejection, native house fallback dependencies, reentrant evaluation and owner/source/registration mutation guards.

## Development asset sizes

| Generated asset   |     Bytes | gzip level 9 bytes |
| ----------------- | --------: | -----------------: |
| `taiyin_web.wasm` | 5,791,529 |          3,499,678 |
| `taiyin_web.js`   |    90,762 |             20,633 |

These are local build artifacts, not promised release sizes. No DE data/star catalog is included. Compression results are transfer-size measurements; they do not describe Wasm memory usage. The current module starts with the C++ build's 64 MiB linear memory and can grow within its configured wasm32 limit.

## Remaining verification

- Remote CI matrix, Apple Safari, Firefox startup on this macOS host, and production CSP configurations.
- Worker performance under real application workloads; installed Worker packaging is covered.
- Dedicated JS benchmarks; no performance parity claim is made here.
- Broader byte-format fixtures and malformed/resource-replacement failure tests.
- Remaining facade APIs listed in [API coverage](api.md).
- Source pinning, compiler-runtime notices, npm naming and installed distribution layout are now covered by the packaging tests.

No npm publication has been performed.

## BaZi reverse lookup (unreleased)

`npm run test:bazi-reverse` executes 165 real-Wasm assertions. The identical
scenario is included in the local browser page and has passed there too.
It checks three chart clocks × three rat-hour schools, returned intervals
against the forward pillar engine, unified Zi across midnight, partial
range clipping, empty results, invalid bounds and lifecycle errors.

The accompanying C++ tests also check exact 00/01/11/22/23-hour boundaries,
physical Lichun versus apparent-solar chart clocks, historical assigned Jie
boundaries (year 23), no-match results and atomic failure. C ABI tests exercise
count-only, fill and short-buffer calls. Both monolithic and modular native
builds have been checked. Python uses the same C++ source, with concurrent
searches on independent contexts and the existing time/error regressions.

These are binding/forward–reverse consistency tests, not an independent
astronomical-accuracy oracle or a claim to reconstruct an exact birth time.
No package/tag/publication was created.

## PR #1 regression coverage

- Generated astronomy and body/star observed entry points reject unsafe numeric,
  fractional, negative, non-finite and overflowing uint64 masks before native
  calls. Safe numbers and full-width bigint values retain all bits; explicit
  `flags` still override `positionFlags`/`options`.
- Position batches aggregate every row's flags for all five time entry points,
  including bit 31 and empty batches. A real Wasm test mixes an exact Sun route
  with a Saturn barycenter approximation in both target orders.
- Real target, ayanamsha and house callbacks cannot change their active context's
  configuration/time policy, including generated setters. Read-only conversions,
  independent-context setters and later ordinary setters remain usable. This
  shared scenario runs in both Node and the browser example.
- Runtime source metadata and capabilities reject missing/stale astronomy
  protocol versions before entering the metadata bridge or decoding records.
