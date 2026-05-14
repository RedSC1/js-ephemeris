# js-ephemeris

High-precision solar system ephemeris engine for JavaScript/TypeScript. Zero dependencies, runs in Browser and Node.js.

## Features

- **20 bodies**: Sun, Moon, Mercury–Pluto, Ceres, Pallas, Juno, Vesta, Eros, Chiron, Pholus, Nessus, Lilith
- **Sub-milliarcsecond precision** (OPM2/OPV2 Chebyshev data from DE441)
- **1800–2100 CE** built-in (zero config), extendable via CDN or local files
- **Full astrometric corrections**: light-time, stellar aberration, gravitational deflection
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

// Geocentric apparent ecliptic state (astrology use case)
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

## Supported Bodies

| Tag | Body | Coverage | Source |
|-----|------|----------|--------|
| `sun` | Sun | ∞ | Synthetic (−Earth) |
| `mer` | Mercury | 1800–2100 | DE441 OPM2 |
| `ven` | Venus | 1800–2100 | DE441 OPM2 |
| `ear` | Earth/EMB | 1800–2100 | DE441 OPM2 |
| `moon` | Moon | 1800–2100 | DE441 OPM2 |
| `mar` | Mars | 1800–2100 | DE441 OPM2 |
| `jup` | Jupiter | 1800–2100 | DE441 OPM2 |
| `sat` | Saturn | 1800–2100 | DE441 OPM2 |
| `ura` | Uranus | 1800–2100 | DE441 OPM2 |
| `nep` | Neptune | 1800–2100 | DE441 OPM2 |
| `plu` | Pluto | 1800–2100 | DE441 OPV2 |
| `ceres` | Ceres | 1800–2100 | sb441 OPM2 |
| `pallas` | Pallas | 1800–2100 | sb441 OPM2 |
| `juno` | Juno | 1800–2100 | sb441 OPM2 |
| `vesta` | Vesta | 1800–2100 | sb441 OPM2 |
| `eros` | Eros | 1800–2100 | sb441 OPM2 |
| `chiron` | Chiron | 1800–2100 | Horizons OPM2 |
| `pholus` | Pholus | 1800–2100 | Horizons OPM2 |
| `nessus` | Nessus | 1800–2100 | Horizons OPM2 |
| `lilith` | Lilith (1181) | 1800–2100 | Horizons OPM2 |

## Extended Data (beyond 1800–2100)

```typescript
import { Ephemeris } from 'js-ephemeris';
import { NodeFileLoader } from 'js-ephemeris/loader/node';

const eph = new Ephemeris({
  loader: new NodeFileLoader('/path/to/data_v3/'),
  remoteManifest: {
    'ceres': [
      { jdStart: 2341972, jdEnd: 2378495, path: 'ceres/before_1800/ceres_2341972_2378495.bin.gz' },
      // ...
    ]
  }
});

// Now works for dates outside 1800-2100
const ancient = await eph.geocentricState('ceres', julianDay(-500, 6, 15));
```

## Astrometric Corrections

`geocentricState` applies corrections by default:

| Correction | Default | Effect |
|-----------|---------|--------|
| Light-time | ✅ on | Iterative, with Shapiro delay |
| Stellar aberration | ✅ on | Classical first-order |
| Gravitational deflection | ❌ off | Solar limb darkening model |

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

| Priority | Resolver | Source | Precision |
|----------|----------|--------|-----------|
| 100 | SPK | User-provided NASA .bsp | <0.001" |
| 50 | Builtin | Embedded base64 OPM2/OPV2 | <0.01" |
| 40 | Remote | CDN/local file loading | <0.01" |
| 10 | Fallback | Kepler / sxwnl / astronomy-engine | ~1'–1" |

Custom resolvers can be registered:

```typescript
eph.registerResolver(myCustomResolver);
```

## License

GPL-2.0 — see [LICENSE](./LICENSE)
