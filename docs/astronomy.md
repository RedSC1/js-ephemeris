# Astronomy services over the shared Wasm core

[中文](astronomy.zh-CN.md) · [API inventory](api-inventory.md)

The additional services call the existing C ABI. The extension changes only the opt-in Wasm adapter, not native ABI 11 or the astronomical algorithms. Method names largely follow Dart, with ordinary JS option objects and `{value, flags}` computational results. Consult the generated `.d.ts` signatures for exact fields. Angles named `Rad` are radians; observer fields named `Deg` are degrees.

## Observation, rise/set and stars

```js
import {
  Ephemeris,
  Body,
  Ut1JulianDate,
  PositionFlag,
  ObservedOption,
  VisibilityEventKind,
} from "js-ephemeris";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const start = Ut1JulianDate.fromDouble(2460310.5);
ctx.configuration.setObserverLocation({
  longitudeDegrees: 118.582,
  latitudeDegrees: 37.449,
  heightMeters: 80,
});
ctx.configuration.setStandardAtmosphere();
const sun = ctx.observed.atUt1(Body.sun, start, {
  positionFlags: [PositionFlag.topocentric],
  options: ObservedOption.horizontal,
});
const sunrise = ctx.visibility.solarRiseSetAtUt1(start, start.addDays(1), {
  eventKind: VisibilityEventKind.rise,
});
console.log(sun.value.horizontal.altitudeRad, sunrise.value.julianDateUt1);
```

`ctx.observed` provides single/batch UT1 and UTC calculations. Observed flags deliberately do not accept XYZ, EQUATORIAL, RADIANS or NONUT: the core returns an unsupported-operation error, not another representation disguised as altitude/azimuth. Body batches have the native ten-body limit. A failed batch throws and retains the per-target diagnostics; it is not returned as a successful partial batch.

`ctx.visibility` covers Moon/planet/Sun/star rise/set and transit, explicit horizons, solar twilight and fast TT solar rise/set/transit. Rise/set defaults to rise and upper limb; transit defaults to upper transit. The result's `altitudeState` distinguishes crossing, always-above/below, tangent and not-found states; a successful status is not a promise of an ordinary sunrise. Non-applicable JD fields remain `null`.

Load a TSC1 or TSF1 catalog before using `ctx.stars`. No built-in star positions are fabricated:

```js
eph.loadStarCatalogBytes(catalogBytes);
const star = ctx.stars.atUt1("your-catalog-key", start, {
  flags: [PositionFlag.speed],
});
const observedStar = ctx.stars.observedAtUt1("your-catalog-key", start, {
  positionFlags: [PositionFlag.topocentric],
  options: ObservedOption.horizontal,
});
```

Stars provide single/batch TT, UT1, explicit-Delta-T UT1, and TDB with a corresponding TT. Stellar observed positions are UT1 entry points. Earth-only observer restrictions are inherited from the native 1.0 API. For heliacal calculations, use `ctx.heliacal.bodyAtUt1/starAtUt1/nextBodyEventAtUt1/nextStarEventAtUt1`. Configure humidity or meteorological range as required by the selected native model, for example `ctx.configuration.setMeteorologicalRangeKm({rangeKm:40})`; standard pressure/temperature alone may not be sufficient. Optional conditions can override measured extinction or sky brightness without replacing the native model.

## Events, phenomena, orbits and occultations

```js
const phases = ctx.events.lunarPhaseCrossingsAtUt1(
  0,
  start,
  start.addDays(40),
  { maxStepDays: 1, maxResults: 8 },
);
const orbit = ctx.orbits.osculatingAtUt1(Body.marsBarycenter, start);
const phase = ctx.phenomena.atUt1(Body.moon, start);
console.log(
  phases.value,
  orbit.value.semiMajorAxisAu,
  phase.value.illuminatedFraction,
);
```

- `ctx.events`: solar/lunar longitude roots, longitude/aspect crossings, stations, exact-aspect sets, lunar phases, greatest elongation, minimum body/body or body/star separation, global/local planetary solar transits.
- `ctx.orbits`: osculating elements and reference points, pericenter/apocenter and ascending/descending plane-node searches, at TT or UT1. The default reference frame is mean J2000 ecliptic.
- `ctx.phenomena`: phase angle, illumination, elongation, diameter, magnitude and horizontal parallax.
- `ctx.occultations`: geocentric/local lunar star/body searches, optional target radius, local visibility and geographic `where` products. Only feed compatible native occultation records into the follow-up methods. A bounded or one-candidate search can legitimately return a native not-found error; it must not be replaced with a fake event.

Use typed TT/UT1 coordinates consistently. `options` accepts high-bit `EventOption`, `OrbitalOption`, `HeliacalOption`, `OccultationOption` or `SiderealOption` bigint masks. `positionFlags` contains low position flags where the native service accepts them. `flags` is an alternative complete native mask; when supplied, it takes precedence over `positionFlags` and `options`. Visibility's low flags are its own `VisibilityOption` values, not ordinary position flags except in the planet-transit API. Do not construct high-bit options with `1 << 32`.

## Houses, sidereal coordinates and lunar points

```js
import { HouseSystem, Ayanamsha } from "js-ephemeris";
const houses = ctx.astrology.housesAtUt1(start, {
  houseSystemId: HouseSystem.placidus,
});
const sidereal = ctx.astrology.siderealPositionAtUt1(Body.sun, start, {
  ayanamshaId: Ayanamsha.lahiri,
});
const node = ctx.astrology.lunarMeanNodeAtUt1(start);
```

`ctx.astrology` also exposes houses from ARMC, house membership, generic sidereal coordinates, true/mean nodes and mean/osculating/fitted apogees. House-result flags are distinct from the outer execution flags. Custom ayanamsha evaluation still passes through the native nutation/reference policy; its callback value is not necessarily the final adjusted ayanamsha unless the matching native options request that convention.

## Runtime sources and custom models

```js
for (const source of eph.registeredDataSources()) {
  console.log(source.source, source.format, source.itemCount); // bigint count
}
eph.setEphemerisSourcePriority("sun.opm2", -100);
eph.clearEphemerisSourcePriority("sun.opm2");
console.log(eph.capabilities); // bigint mask
```

Priority mutation delegates to the C++ provider policies; it does not let OPM2-only routing jump to SPK. These operations are setup-time changes and are rejected during an active callback/calculation. `eph.sources` also provides cache clearing, catalog size and cache-entry counts.

```js
const registration = eph.registerCustomAyanamshaModel({
  modelId: 11000,
  evaluate: ({ tt, flags }) => 0.123, // radians, synchronous
});
// Use model 11000 through ctx.astrology; close when finished.
registration.close();
```

`registerCustomHouseSystemModel` accepts twelve cusp longitudes or `null` to request its configured native fallback. `registerCustomTarget` accepts a negative target ID, a six-number position evaluator and optionally an exact Cartesian state evaluator. Position values must follow the requested native flags; do not return RA/Dec when XYZ was requested. Without an exact state evaluator, the core may use numerical derivatives and reports the corresponding execution flag.

Registrations are runtime-owned and retain callbacks until successfully unregistered. Closing a house model still used as another model's fallback fails and preserves it. Callback exceptions are rethrown as their original JS value; they are not hidden by a successful fallback. Promises are invalid. Registration/priority mutation, recursive evaluation of the same callback and owner closure during evaluation are rejected. No C pointer or borrowed native context is exposed to JS.

## Build and verification

After editing the C ABI/adapter manifest, regenerate and build both parts:

```sh
node scripts/generate-astronomy.mjs /path/to/taiyin-ephemeris
npm run format
npm run build:wasm -- /path/to/taiyin-ephemeris
npm run test:astronomy
```

The extension's generated protocol signature prevents mismatched JS/Wasm tables from being used silently. Existing version-1 base bridge calls remain intact. An optional native oracle is built as `taiyin_astronomy_probe` from the standalone `experiments/wasm` CMake project; set `TAIYIN_ASTRONOMY_NATIVE_PROBE` to its executable when running `test:astronomy`. The oracle compares statuses/flags and successful numeric payloads, not identical adaptive iteration counts or independent scientific accuracy.
