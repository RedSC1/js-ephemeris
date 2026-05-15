# js-ephemeris

High-precision solar system ephemeris engine for JavaScript/TypeScript. Zero dependencies, runs in Browser and Node.js.

Ships with built-in high-precision data for 1800–2100 CE (fitted from NASA JPL DE441 planetary ephemeris and sb441/Horizons asteroid ephemerides, reconstruction error ~0.001" vs original). Beyond this range, automatically falls back to Moshier PLAN404 semi-analytical theory (±5000 years, 0.05–2" accuracy, non-divergent). High-precision coverage can be extended to -13000 ~ +17000 CE via the [ephemeris-data](https://github.com/RedSC1/ephemeris-data) package. Center-of-body (COB) correction data is not built-in and requires a separate download.

## Features

- **20 built-in bodies** (extensible): Sun, Moon, Mercury–Pluto, Ceres, Pallas, Juno, Vesta, Eros, Chiron, Pholus, Nessus, Lilith
- **Multi-precision resolver chain**:
  - Built-in OPM2/OPV2 data (DE441): sub-milliarcsecond, 1800–2100 CE
  - Moshier PLAN404 fallback: 0.05–2" accuracy, ±5000 years, no data files needed
  - User-extensible: register custom resolvers (SPK, remote APIs, etc.)
- **1800–2100 CE** zero-config, extendable to -13000 ~ +17000 CE via [ephemeris-data](https://github.com/RedSC1/ephemeris-data)
- **Full astrometric corrections**: light-time iteration, relativistic aberration (Lorentz), gravitational deflection, center-of-body (COB)
- **Multiple coordinate frames**: J2000 equatorial, J2000 ecliptic, true ecliptic/equatorial of date
- **Velocity support**: analytic Chebyshev derivatives, geocentric ecliptic speed (deg/day)
- **Topocentric observation**: altitude/azimuth with optional atmospheric refraction
- **Extensible resolver architecture**: plug in your own data sources (SPK, custom providers)

## Install

```bash
npm install js-ephemeris
```

## Quick Start

```typescript
import { Ephemeris } from 'js-ephemeris';

const eph = new Ephemeris();

// Geocentric apparent ecliptic state
const mars = await eph.geocentricState('mars', new Date('2024-03-20'));
console.log(mars.lon);       // geocentric ecliptic longitude (degrees)
console.log(mars.lonSpeed);  // longitude speed (deg/day), negative = retrograde
console.log(mars.retrograde); // boolean

// Raw heliocentric J2000 equatorial position (AU)
const pos = await eph.position('chiron', 2451545.0);
console.log(pos.xyz);        // [x, y, z] in AU

// Convert coordinate frames
const ecl = pos.toTrueEcliptic();
const [lon, lat, r] = ecl.lbr();

// Full state vector (position + velocity)
const state = await eph.state('mars', 2451545.0);
// state = [x, y, z, vx, vy, vz] in AU and AU/day
```

## Topocentric Observation

```typescript
import { Ephemeris, SkyObserver } from 'js-ephemeris';

const eph = new Ephemeris();
const observer = new SkyObserver(eph, { lat: 39.9, lon: 116.4, alt: 50 });

const result = await observer.observe('mars', new Date());
console.log(result.ra);        // right ascension (radians)
console.log(result.dec);       // declination (radians)
console.log(result.azimuth);   // azimuth (radians)
console.log(result.altitude);  // altitude (radians)
```

### SkyObserver Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `lat` | `number` | required | Geodetic latitude (degrees, north positive) |
| `lon` | `number` | required | Longitude (degrees, east positive) |
| `alt` | `number` | `0` | Altitude above sea level (meters) |
| `pressure` | `number` | — | Atmospheric pressure (hPa). Enables refraction if > 0 |
| `temperature` | `number` | `15` | Temperature (°C). Used with refraction |
| `refractionProvider` | `RefractionProvider` | Standard | Custom refraction model |

> Atmospheric refraction is only applied when `pressure` is provided and > 0. Since meteorological conditions vary by location and time, the library cannot provide a sensible default, so refraction is off by default.

## Configuration

### EphemerisOptions

Passed to `new Ephemeris(options)`. All fields are optional — zero-config works out of the box.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseUrl` | `string` | — | CDN base URL for remote data files |
| `loader` | `DataLoader` | — | Custom data loader (overrides baseUrl) |
| `remoteManifest` | `RemoteManifest` | — | Describes available remote data files |
| `cobManifest` | `COBManifest` | — | Center-of-body correction data manifest |
| `cacheSize` | `number` | `100` | LRU cache entries (0 = unlimited) |
| `deltaTProvider` | `function` | built-in | Custom ΔT (TT−UT) function |
| `precessionProvider` | `PrecessionProvider` | Vondrak 2011 | Precession model |
| `nutationProvider` | `NutationProvider` | IAU 2000B | Nutation model |
| `astrometric` | `AstrometricOptions` | see below | Default corrections for `geocentricState` |
| `resolvers` | `PositionResolver[]` | — | Additional resolvers to register |

### AstrometricOptions

Controls corrections applied by `geocentricState()`. Can be set globally (in `EphemerisOptions.astrometric`) or per-call.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `lightTime` | `boolean` | `true` | Iterative light-time correction |
| `aberration` | `boolean` | `true` | Relativistic stellar aberration |
| `deflection` | `boolean` | `false` | Gravitational light deflection by Sun |
| `cob` | `boolean` | `false` | Center-of-body correction (requires COB data) |

```typescript
// Zero config — all defaults
const eph = new Ephemeris();

// Custom config
const eph = new Ephemeris({
  baseUrl: 'https://cdn.jsdelivr.net/gh/RedSC1/ephemeris-data@main/data_integrated/',
  cacheSize: 200,
  astrometric: { deflection: true }  // enable deflection globally
});

// Per-call override
const geo = await eph.geocentricState('mars', jd, { cob: true });
```

## Supported Bodies

| Tag | Body | Built-in | Extended (download) | Source |
|-----|------|----------|---------------------|--------|
| `sun` | Sun | ∞ | — | Synthetic (−Earth) |
| `mer` | Mercury | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `ven` | Venus | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `ear` | Earth/EMB | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `moon` | Moon | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `mar` | Mars | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `jup` | Jupiter | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `sat` | Saturn | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `ura` | Uranus | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `nep` | Neptune | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `plu` | Pluto | 1800–2100 | -13000–17000 CE | DE441 OPV2 |
| `ceres` | Ceres | 1800–2100 | -13000–17000 CE | sb441 / numerical integration |
| `pallas` | Pallas | 1800–2100 | -13000–17000 CE | sb441 / numerical integration |
| `juno` | Juno | 1800–2100 | -13000–17000 CE | sb441 / numerical integration |
| `vesta` | Vesta | 1800–2100 | -13000–17000 CE | sb441 / numerical integration |
| `eros` | Eros | 1800–2100 | -13000–17000 CE | sb441 / numerical integration |
| `chiron` | Chiron | 1800–2100 | -13000–17000 CE | Horizons / numerical integration |
| `pholus` | Pholus | 1800–2100 | -13000–17000 CE | Horizons / numerical integration |
| `nessus` | Nessus | 1800–2100 | -13000–17000 CE | Horizons / numerical integration |
| `lilith` | Lilith (1181) | 1800–2100 | -13000–17000 CE | Horizons / numerical integration |

Extended data matches the full DE441 coverage range. Download from [ephemeris-data](https://github.com/RedSC1/ephemeris-data).

### Center-of-Body (COB) Correction Data (requires download)

COB corrects planet system barycenter to planet body center. Not built-in — download from [ephemeris-data](https://github.com/RedSC1/ephemeris-data).

| Body | Coverage | Source |
|------|----------|--------|
| Jupiter | 1600–2200 CE | jup365.bsp |
| Saturn | 1750–2250 CE | sat441.bsp |
| Uranus | -12000–17000 CE | ura111xl-799.bsp |
| Neptune | 1600–2400 CE | nep097.bsp |
| Pluto | 1800–2200 CE | plu060.bsp |

## Extended Data (beyond 1800–2100)

Additional data files covering -13000 CE to +17000 CE are available at [ephemeris-data](https://github.com/RedSC1/ephemeris-data).

Data directory structure (in [ephemeris-data](https://github.com/RedSC1/ephemeris-data)):

```
data_integrated/
├── mer/
│   ├── before_1800/        # Extended past
│   ├── 1800_2100/          # JPL official data (fitted)
│   └── after_2100/         # Extended future
├── ven/
├── ear/
├── moon/
├── mar/
├── jup/
├── sat/
├── ura/
├── nep/
├── plu/
├── ceres/
├── chiron/
├── ...                     # Other asteroids
└── cob/                    # Center-of-body offsets (requires separate download)
    ├── jupiter/
    ├── saturn/
    ├── uranus/
    ├── neptune/
    └── pluto/
```

Each file is named `{body}_{jdStart}_{jdEnd}.bin.gz` (gzipped OPM2/OPV2 Chebyshev data).

```typescript
import { Ephemeris } from 'js-ephemeris';

// Use jsDelivr as CDN (serves GitHub repo files directly)
const eph = new Ephemeris({
  baseUrl: 'https://cdn.jsdelivr.net/gh/RedSC1/ephemeris-data@main/data_integrated/'
});

// Or use local files (Node.js)
import { NodeFileLoader } from 'js-ephemeris/loader/node';
const eph2 = new Ephemeris({
  loader: new NodeFileLoader('/path/to/ephemeris-data/')
});

// Now works for dates outside 1800-2100
const ancient = await eph.geocentricState('mars', julianDay(-500, 6, 15));
```

Without extended data, the Moshier fallback automatically provides positions for all major planets and Moon with arcsecond-level accuracy over ±5000 years.

## Astrometric Corrections

`geocentricState` applies corrections by default:

| Correction | Default | Effect |
|-----------|---------|--------|
| Light-time | ✅ on | Iterative, with Shapiro delay |
| Stellar aberration | ✅ on | Relativistic Lorentz transform |
| Gravitational deflection | ❌ off | Solar limb darkening model |
| Center-of-body (COB) | ❌ off | Barycenter → planet surface center |

> **Note**: COB correction data (for Jupiter, Saturn, Uranus, Neptune, Pluto) is not built-in. Download from [ephemeris-data](https://github.com/RedSC1/ephemeris-data) and configure a loader to use it.

```typescript
// Geometric position (no corrections)
const geo = await eph.geocentricState('mars', jd, {
  lightTime: false,
  aberration: false
});

// Full apparent with deflection
const app = await eph.geocentricState('mars', jd, {
  deflection: true
});
```

## Architecture

The engine uses a priority-based resolver chain:

| Priority | Resolver | Source |
|----------|----------|--------|
| 50 | Builtin | Embedded OPM2/OPV2 (1800–2100 CE) |
| 40 | Remote | CDN/local file loading |
| 20 | Moshier | PLAN404 semi-analytical (all planets + Moon) |
| 10 | Keplerian | Mean orbital elements (asteroids) |

> **Planned**: A NASA/JPL SPK (.bsp) file reader is under development and will be added in a future release.

Higher priority resolvers are tried first. If a resolver cannot handle the request (e.g., date out of range), the next one is used automatically.

The Moshier fallback provides positions for all planets + Moon without any data files, using Steve Moshier's PLAN404 theory fitted to DE404, with polynomial corrections aligned to DE441. It does not diverge over ±5000 years (unlike VSOP87).

### Custom Resolvers

Implement the `PositionResolver` interface to plug in your own data source:

```typescript
import type { PositionResolver, ResolverResult } from 'js-ephemeris';

const myResolver: PositionResolver = {
  name: 'my-source',
  priority: 60,  // higher than Builtin(50) = used first
  canResolve(tag, jd) { return tag === 'mars' && jd > 2451545; },
  async resolve(tag, jd) {
    // Return J2000 equatorial cartesian (AU)
    return { state: [x, y, z], source: 'my-source', precision: 'milliarcsec', center: 'sun', frame: 'ICRF / J2000 Equatorial' };
  }
};

eph.registerResolver(myResolver);
```

## Fallback (No Data Files Required)

Even without any data files loaded, the Moshier PLAN404 engine provides planetary positions:

```typescript
import { MoshierResolver } from 'js-ephemeris/moshier';

// Standalone usage (no Ephemeris engine needed)
const resolver = new MoshierResolver();
const mars = await resolver.resolve('mar', 2451545.0);
console.log(mars.state); // [x, y, z] heliocentric J2000 equatorial (AU)
```

**Moshier fallback accuracy (vs DE441):**

| Body | ±500 years | ±1500 years | Notes |
|------|-----------|-------------|-------|
| Mercury | 0.5" | 1.8" | |
| Venus | 0.13" | 0.12" | |
| Earth | 0.05" | 2.0" | Extended to ±5000yr |
| Mars | 0.24" | 0.58" | |
| Jupiter | 0.5" | 0.71" | |
| Saturn | 0.5" | 0.54" | |
| Uranus | 0.76" | 1.54" | |
| Neptune | 0.7" | 0.67" | |
| Moon | ~0.1" | ~12" | Geocentric |
| Pluto | ~10" | ~28" | |

## License

Apache-2.0 — see [LICENSE](./LICENSE)

## Roadmap

- [ ] NASA/JPL SPK (.bsp) file reader
- [ ] Planetary satellites (Galilean moons, Titan, Triton, etc.)
- [ ] Additional asteroids and TNOs
