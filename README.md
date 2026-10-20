# js-ephemeris — JavaScript / TypeScript

[中文说明](README.zh-CN.md)

**js-ephemeris** is an astronomical ephemeris library for JavaScript and
TypeScript, running in browsers and Node.js through the
[Taiyin C++ core](https://github.com/RedSC1/taiyin-ephemeris) compiled to WebAssembly.

- Sun, Moon, planetary and fixed-star positions, observed coordinates, and astronomical event searches.
- Solar and lunar eclipses, time-scale conversions, and local solar time.
- Chinese lunar calendars, solar terms, four pillars, BaZi and Ziwei calculations.
- TypeScript declarations, caller-owned contexts, and external ephemeris data loading.

The calculations share the core used by the Python and Dart bindings. Browser
and Node.js applications use the same API.

**Development preview:** `1.1.0-dev.0` is not published to npm;
`private: true` prevents accidental publication. The Wasm backend does not yet
cover every native API; see the [interface inventory](docs/api-inventory.md).

## Build locally

Install Node.js 22+ and activate Emscripten **6.0.12**. Build an installable
tarball from the pinned, hash-verified public core and test it in clean consumers:

```sh
npm ci
npm run pack:local
npm run test:package
```

The build supports `web,worker,node`. The `.tgz` is written under `build/packages/`;
generated binaries and build directories are ignored, not committed. No npm
publication occurs. See [packaging and installation tests](docs/packaging.md)
for offline archives, browser setup, deployment and verification scope.
For C++ development, `npm run build:wasm -- /path/to/core` followed by
`npm run build` still builds against an explicit local checkout.

## Quick start

```js
import { Ephemeris, Body, Ut1JulianDate } from "./dist/index.js";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const ut1 = Ut1JulianDate.fromDouble(2460310.5);

const { value: mars, flags } = ctx.position.atUt1(Body.marsBarycenter, ut1);
console.log(mars.coordinates, flags.mask);
console.log(ctx.eclipses.nextSolarAtUt1(ut1).value);
console.log(
  ctx.chineseCalendar.fromSolar({ year: 2024, month: 2, day: 10 }).value,
);
```

Initialization is asynchronous; calculations are synchronous. Close `ctx`/`eph` when finished, preferably in `finally`. Closing a runtime closes its child contexts and charts. Returned numeric records own their data and remain usable after closure.

The default runtime includes the core's semi-analytic fallback, built-in EOP resources, and default Ziwei rule tables. **DE442/DE441 OPM2 files and star catalogs are not bundled or downloaded automatically.** `Body.marsBarycenter` is the system barycenter; `Body.mars` is the physical planet center and can require satellite/COB data.

## Browser use and data

Serve this repository over HTTP and run `npm run example:browser` for the local integration page. In an application, deploy the generated loader and `.wasm` together:

```js
const eph = await Ephemeris.initialize({
  wasmModuleUri: new URL("/assets/taiyin_web.mjs", location.href),
});
const response = await fetch("/data/sun.opm2");
if (!response.ok) throw new Error(`HTTP ${response.status}`);
eph.loadEphemerisBytes(new Uint8Array(await response.arrayBuffer()), {
  filename: "sun.opm2",
});
```

Load the complete required target/center chain, not just the Sun. Normal core routing chooses among registered sources. The byte loader also supports BSP/SPK, TKC1, and TKE1. EOP, TLL1, TSC1 and TSF1 have dedicated loaders. No public pointer or manual Wasm memory management is required. See [data loading](docs/data-loading.md).

The loader URL is **executable code** and must be trusted. It is not a data URL. Bundlers and Workers can pass an Emscripten `moduleFactory`; see [architecture](docs/architecture.md). Browser deployments need a CSP that permits the loader and WebAssembly compilation.

## Time, calendars, and charts

`Date` input represents a UTC **instant**; local civil input uses `AstroDateTime` plus the selected calendar's fixed offset. Creating a typed Julian date labels coordinates; it never silently converts time scales.

```js
import {
  AstroDateTime,
  ChineseCalendarConfig,
  BaziGender,
  ZiweiGender,
} from "./dist/index.js";

const ctx = eph.createContext({
  chineseCalendarConfig: ChineseCalendarConfig.localAstronomicalUtcOffset(420),
});
const local = new AstroDateTime(2003, 3, 13, 14, 15);
console.log(ctx.chineseCalendar.fourPillarsLocal(local).value);

const bazi = ctx.bazi();
console.log(bazi.calculateLocal(local, { gender: BaziGender.male }).value);

const ziwei = ctx.ziwei();
const chart = ziwei.createChartLocal(local, { gender: ZiweiGender.male }).value;
console.log(chart.summary);
```

UTC/EOP conversion is strict by default. `atUt1()` itself does not require EOP. To explicitly permit out-of-range estimates:

```js
ctx.time.setAllowUtcOutOfRangeEstimate(true);
const { value, flags } = ctx.time.scalesFromUtc(
  new Date("2024-04-08T18:00:00Z"),
);
console.log(value.value.ut1, value.diagnostic, flags.mask);
```

Calendar structure, the clock offset, and a chart's mean/apparent solar-clock policy are distinct. Fixed offsets are not IANA time zones: resolve DST and ambiguous local times in the application. See [API guide and coverage](docs/api.md).

BaZi supports relations, Xiao-Yun, Renyuan-Siling and custom Shen Sha catalogs; Ziwei has shared/reloadable TOML catalogs, immutable JSON option modules, UTC/UT1 flow navigation and reverse lookup, and local/instant/solar/lunar entry points. Solar chart clocks do not replace the physical instant used for solar-term boundaries. Use the separate gender enums: BaZi male is `1`, while Ziwei male is `0`.

Astronomy services include observed alt/az, rise/set/transit, stellar apparent/observed positions, general event searches, orbital elements/phenomena, heliacal visibility, occultations, house/sidereal/lunar-point extensions, source priorities/metadata and custom target/ayanamsha/house callbacks. These use the C++ core algorithms. See the [astronomy guide](docs/astronomy.md) and [interface inventory](docs/api-inventory.md) for coverage and native restrictions.

## Results, errors, and concurrency

- Computational operations return `{ value, flags }`, following Dart's named result rather than Python's tuple syntax. Configuration/metadata methods can return plain values or `void`.
- Fatal C++ statuses throw typed `EphemerisError` subclasses with `status`, `statusName`, `resultFlags` and available diagnostics. Missing eclipse contact times are `null`.
- `ctx.lastDiagnostic` is a convenience for operations exposing an ephemeris diagnostic, not a substitute for the current call's return flags/errors. Time-scale results carry their own diagnostic.
- High-bit eclipse options use `bigint`, e.g. `EclipseOption.includeContacts`; never use JavaScript's 32-bit `1 << 33`.
- One Wasm instance is synchronous and single-threaded. `Promise.all()` does not make CPU calculations parallel. Use independent runtimes in Workers for parallel work; do not share live contexts/charts across workers.

## Tests

```sh
npm test
npm run test:types
npm run test:integration
npm run test:astronomy
npm run test:package
# Optional: compare real OPM2 loading with more native calendar oracle rows.
TAIYIN_TEST_DATA_ROOT=/path/to/de442-full npm run test:integration
npm run example:browser
```

Node and a real browser have exercised position/state/batch, strict and estimated time conversions, leap seconds, three calendar modes, BaZi/custom predicates, Ziwei solar clocks/flows/casting/catalog reload, ownership guards, and **all 39 eclipse bridge operations**. See [verification notes](docs/verification.md) for scope and limitations. Native agreement tests verify wrapper consistency, not independent astronomical accuracy.

## License

Original Wasm binding code is MPL-2.0. The shared Taiyin core and its third-party
components retain their applicable notices. See [LICENSE](LICENSE),
[NOTICE](NOTICE), and the [core project](https://github.com/RedSC1/taiyin-ephemeris).

## Earlier releases

The pure-JavaScript 0.0.x implementation remains in the
[repository history](https://github.com/RedSC1/js-ephemeris/tree/7093d13cfefa9a4634169ca0e845ab1e3ba9cdbe)
under its original Apache-2.0 license. Its API differs from the current Wasm
binding; existing applications need to adapt their calls when upgrading.
