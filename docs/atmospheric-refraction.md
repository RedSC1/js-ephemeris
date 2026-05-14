# Atmospheric Refraction Implementation

## Overview

Two refraction providers are available:

| Provider | Method | Accuracy | Speed | Best for |
|----------|--------|----------|-------|----------|
| `StandardRefractionProvider` | Bennett/Smart empirical blend | ~5" (z<80°) | Instant | General use |
| `AuerStandishRefractionProvider` | Numerical integration | <1.2" (z<80°) | ~1ms | Precision work |

## Auer & Standish (2000) Implementation

Based on: "Astronomical Refraction: Computational Method for All Zenith Angles", AJ 119, 2472-2474.

### Core Idea

Classical refraction integral (Eq. 1):

```
R = ∫ tan(t) d(ln k)
```

where `k` is the refractive index, `t` is the angle between the light ray and the radius vector.

Using `t` as the integration variable (Eq. 3):

```
R = ∫[0, t₀] f(t) dt

f(t) = -[d(ln k)/d(ln r)] / [1 + d(ln k)/d(ln r)]
```

subject to Snell's invariant: `k·r·sin(t) = k₀·r₀·sin(t₀)`

### Variable Substitution for Horizon

At the horizon (t₀ = 90°), the integrand has a sharp peak near t = t₀. Uniform sampling misses this peak.

Solution: substitute `s = √(t₀ - t)`, so `t = t₀ - s²`, `dt = -2s ds`.

This maps the integration to `s ∈ [0, √t₀]` with automatic grid refinement near t₀.

### Atmospheric Model (Garfinkel 1944)

Spherical piecewise polytropic model:

**Troposphere** (h ≤ 11019 m):
```
ρ(r) = ρ_w × (1 + β × (R_E/r - R_E/r_w))^n
β = g·R_E / (R·T_w·(1+n))
n = 5 (polytropic index)
```

**Stratosphere** (h > 11019 m):
```
ρ(r) = ρ_B × exp(γ × (R_E/r - R_E/r_B))
γ = g·R_E / (R·T_B)
```

The `1/r` form (vs linear `T - lapse*h`) correctly accounts for Earth's curvature and gravity variation with altitude.

### Newton-Raphson for r(t)

For each integration point, we solve `k(r)·r·sin(t) = S` for `r`:

```
F(r) = k·r·sin(t) - S
F'(r) = (dk/dr·r + k)·sin(t)
r_{n+1} = r_n - F/F'
```

Initial guess: `r = S/sin(t)` (assuming k ≈ 1). Converges in 2-3 iterations.

### True vs Apparent Zenith Angle

The formula takes the **apparent (observed) zenith angle** as input. Our API receives the **true (geometric) altitude**. The relationship is:

```
z_true = z_apparent + R(z_apparent)
```

We use fixed-point iteration to invert this:
```
z_app_{n+1} = z_true - R(z_app_n)
```

Converges in 3-5 iterations for z < 89°.

### Validation Against Paper Table 2

Standard conditions: T = 0°C, P = 1013.25 hPa, h = 0 m.

| Zenith angle | Computed | Paper | Error |
|-------------|----------|-------|-------|
| 15° | 16.14" | 16.14" | 0.00" |
| 30° | 34.74" | 34.77" | -0.03" |
| 45° | 60.05" | 60.17" | -0.12" |
| 60° | 104.14" | 103.99" | +0.15" |
| 75° | 220.21" | 221.34" | -1.13" |
| 80° | 328.64" | 329.46" | -0.82" |
| 85° | 599.42" | 588.87" | +10.55" |
| 90° (direct) | 2192.01" | 2189.42" | +2.59" |

Note: The 85° discrepancy is because our test uses true zenith angle while the paper reports apparent zenith angle values. Direct computation with z_app = 90° matches the paper to within 0.1%.

### Constants

| Constant | Value | Unit |
|----------|-------|------|
| Gladstone-Dale `a` | 0.00029241 | — |
| Earth radius | 6,378,390 | m |
| g | 9.80655 | m/s² |
| R (gas constant) | 287.053 | J/(kg·K) |
| Polytropic index n | 5 | — |
| Tropopause height | 11,019 | m |

### Usage

```typescript
import { SkyObserver } from 'js-ephemeris';
import { AuerStandishRefractionProvider } from 'js-ephemeris/corrections/refraction/auer-standish';

const observer = new SkyObserver(engine, { lat: 39.9, lon: 116.4, alt: 50 });

const result = await observer.observe('mars', date, {
  pressure: 1013.25,
  temperature: 15,
  refractionProvider: new AuerStandishRefractionProvider()
});
```

## Standard Provider (Default)

Blends two empirical formulas with a smooth transition at 14°-16° altitude:

- **High altitude (>16°)**: Smart formula `R = 58.276·tan(z) - 0.0824·tan³(z)`
- **Low altitude (<14°)**: Bennett formula `R = 1.02 / tan(h + 10.3/(h + 5.11))`
- **Transition (14°-16°)**: Linear blend

Meteorological correction: `R_corrected = R × (P/1010) × (283/(273+T))`

Faster than Auer-Standish but less accurate near the horizon.

## References

- Auer, L.H. & Standish, E.M. (2000), "Astronomical Refraction: Computational Method for All Zenith Angles", AJ 119, 2472
- Garfinkel, B. (1944), AJ 50, 169
- Bennett, G.G. (1982), "The Calculation of Astronomical Refraction in Marine Navigation", J. Inst. Navigation 35, 255
