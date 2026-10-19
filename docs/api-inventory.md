# JS/TS interface inventory

Scope: the existing C ABI 11 / version-1 Wasm bridge, compared with the Python and Dart facades. No second astronomy implementation, native ABI change, package release or lite modification is required for the first group.

| Area                           | Missing at the start of this pass                                                                   | Approach                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Position                       | state with explicit Delta-T; batch TDB and explicit Delta-T UT1                                     | Existing position/batch bridge modes                         |
| Time/configuration             | automatic UTC→UT1 convenience; context reset                                                        | Existing time/configuration operations                       |
| BaZi arithmetic                | stem/branch/triple relations, Xiao-Yun, Renyuan-Siling, relation collection, built-in ID collection | Existing BaZi operations 4–6, 13–14, 17–20                   |
| BaZi application API           | mean/apparent clock, local/instant/solar/lunar date entry points                                    | Orchestration over core time, solar-time and calendar APIs   |
| Shen Sha customization         | immutable module catalogs, derived contexts, disabled IDs, synchronous predicates                   | Existing BaZi operations 22–28 and callback thunk            |
| Ziwei catalog                  | generation, reload, caller-supplied TOML bytes, shared snapshots                                    | Existing Ziwei operations 0–4                                |
| Ziwei date/flow API            | local/instant/solar/lunar convenience, UTC flow/navigation/reverse entry points                     | Existing Ziwei operations 18, 29–31 and shared orchestration |
| Ziwei rules/query conveniences | immutable JSON ruleset add/remove; star/palace/transform queries                                    | Existing snapshot construction and chart queries             |
| Eclipses                       | None: all 39 current bridge operations were wrapped                                                 | Keep regression coverage                                     |
| Calendar/solar-time            | Existing bridge operations already wrapped                                                          | Preserve flags and clock-policy separation                   |

## Second pass: additional native bridge exports

The previously missing families below now call existing C ABI routines through an opt-in astronomy extension. The original bridge and native ABI 11 remain compatible; no astronomical algorithms were reimplemented.

| Service                       | Implemented                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ctx.observed`                | Body single/batch UT1 and UTC, horizontal coordinates/rates/refraction, complete failed-batch diagnostics                         |
| `ctx.stars`                   | Single/batch TT, UT1, TDB and explicit Delta-T; single/batch observed UT1                                                         |
| `ctx.visibility`              | Moon/planet/Sun/star rise/set and transit, horizons, twilight, fast TT solar functions                                            |
| `ctx.events`                  | Longitude roots/crossings/stations, aspects, phases, minimum separations, elongation, global/local solar transits                 |
| `ctx.orbits`, `ctx.phenomena` | Osculating elements/reference points, apsis/node searches; phase/illumination/magnitude/parallax                                  |
| `ctx.occultations`            | Geocentric/local star/body searches, optional radius, local visibility and geographic where products                              |
| `ctx.heliacal`                | Body/star visibility and next-event searches, default or caller-supplied conditions                                               |
| `ctx.astrology`               | Houses/ARMC/house membership, ayanamsha/sidereal coordinates, lunar node/apogee models                                            |
| `ctx.configuration`           | Missing atmosphere/meteorology, topocentric setup, pole offsets, deflectors, refraction/heliacal/eclipse models, Shapiro switches |
| Runtime                       | Registered data sources, bigint counts/capabilities, source priority overrides, catalog/cache statistics and cache clearing       |
| Runtime custom models         | Position/exact-state targets, ayanamsha and house callbacks, owned registrations, fallback lifetime and exception/reentry guards  |

There are 107 generated native operations plus variable-length stellar/observed/source and callback adapters. Generated signatures are concrete and expose no pointers. [New astronomy guide](astronomy.md) ([中文](astronomy.zh-CN.md)) explains flags, units, defaults and lifecycle.

BaZi four-pillar reverse lookup additionally uses the new native
`taiyin_bazi_reverse_lookup_at_ut1` through `ctx.bazi().reverseLookupAtUt1`.
It returns maximal matching UT1 intervals, not exact birth instants; see
[the reverse-lookup guide](bazi-reverse.md).

## Still outside the current bridge/API

- Arbitrary C++-only model/provider plug-ins and low-level pointer/path-based maintainer APIs are not represented as JS callbacks. Supported custom C ABI target/ayanamsha/house models are covered above.
- Native filesystem discovery is intentionally replaced by the existing byte-loading API in browsers. Worker orchestration, network asset caching and packaging remain application/distribution work.

No empty methods or approximate substitute algorithms are advertised for these gaps.

## Alignment corrections discovered during this pass

- BaZi gender IDs follow the core and existing bindings: female `0`, male `1`. Ziwei is separately defined: male `0`, female `1`.
- Qi-Yun receives a physical UT1 instant. UTC→UT1 must respect the context's strict EOP / explicitly allowed estimate policy and propagate its flags.
- Solar chart clocks change the virtual chart time, not the physical instant used for solar-term boundaries.

## Implemented and checked

The earlier facade pass implemented the first table without changing the native API or ABI. The subsequent BaZi reverse-lookup addition intentionally adds a C++ search and a C ABI entry point. The public-facade scenarios exercise BaZi operations, Shen Sha catalog/callback operations, Ziwei reload/shared catalogs, UTC flow/navigation/reverse paths, and position batch/state modes.

The shared Node/browser extension scenario passes 100 assertions without external data. With the same 11 DE442 OPM2 files used by the native fixture, it passes 469 assertions including 35 additional native BaZi comparison rows. Browser execution also covers custom synchronous callbacks, callback exceptions and reentry rejection, catalog-close/snapshot lifetime, successful/failed TOML reload, and immutable custom option modules. Independent runtimes are additionally checked in Node for callback token isolation and cross-runtime catalog rejection. See [verification](verification.md) for the complete scope.

The second pass adds separate real-Wasm astronomy and custom-model suites plus an optional native C++ A/B probe. Search non-detections/invalid record combinations must return the same native failure, not fabricated successful events. Adaptive iteration/evaluation counts are not scientific equality criteria. Detailed executed results are in [verification](verification.md).

No package has been published. Distribution/browser-matrix checks and the explicit gaps above remain; this is not a claim that every C++ maintainer API has a public JS counterpart.
