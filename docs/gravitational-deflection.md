# Gravitational Deflection Implementation

## Overview

Light passing near the Sun is deflected by its gravitational field (general relativity). This causes the apparent position of a celestial body to shift away from the Sun. The maximum deflection at the solar limb is approximately 1.75".

## Standard Formula (SOFA iauLd)

The deflection correction to the unit direction vector `p` is:

```
p_new = p + f * (e - (e·p) * p) / (1 + e·p)
```

Where:
- `p` = unit vector from observer toward the body
- `e` = unit vector from the deflecting body (Sun) toward the observer (Earth)
- `f = 2GM/(c² × R)`, with R = distance from Sun to observer

In our code, `q` is defined as the unit vector from Earth toward the Sun, so `e = -q` and `e·p = -pDotQ`.

Substituting:
- Denominator: `1 + e·p = 1 - pDotQ`
- Direction: `e - (e·p)*p = -q + pDotQ*p = pDotQ*p - q`

### Orthogonality Proof

The deflection direction `pDotQ*p - q` is orthogonal to `p`:

```
(pDotQ*p - q) · p = pDotQ*(p·p) - (q·p) = pDotQ - pDotQ = 0
```

This ensures deflection only changes direction, not distance.

### Behavior at Key Angles

| Angular separation | pDotQ | 1 - pDotQ | Deflection |
|-------------------|-------|-----------|------------|
| 0° (behind Sun) | +1 | 0 | Maximum (diverges) |
| 0.267° (solar limb) | +0.99999 | ~0.00001 | ~1.75" |
| 90° | 0 | 1 | ~0.004" |
| 180° (opposite Sun) | -1 | 2 | ~0.002" |

## Solar Disk Interior: Enclosed Mass Fraction

When the line of sight passes through the solar disk (angular separation < solar radius), the standard formula diverges. Physically, light passing through the Sun's interior is only deflected by the mass enclosed within the cylinder of closest approach (shell theorem / Gauss's law for gravity).

We model this with an **enclosed mass fraction** `emf(x)`:

```
emf(x) = x * 1.05 / (x + 0.05)
```

Where `x = impact_parameter / solar_radius` is the normalized distance from the Sun's center (0 = center, 1 = limb).

### Properties

- `emf(0) = 0` — at the center, no enclosed mass, zero deflection
- `emf(1) = 1.05/1.05 = 1.0` — at the limb, full deflection (continuous with exterior formula)
- Smooth (C∞) everywhere — no discontinuities in the ecliptic longitude curve
- Monotonically increasing — physically reasonable

### Why This Matters

Without this model, the ecliptic longitude curve would have a discontinuity when a planet transits the solar disk (superior conjunction). This would cause:
1. Spurious jumps in longitude
2. False zero-crossings in conjunction search algorithms
3. Incorrect conjunction timing (by a few seconds)

The rational function `x*1.05/(x+0.05)` approximates the effect of the Sun's centrally concentrated density profile (most mass is in the core) without needing a full density table.

## Constants

| Constant | Value | Unit | Source |
|----------|-------|------|--------|
| 2GM☉/c² (Schwarzschild radius) | 1.97412574336 × 10⁻⁸ | AU | IAU 2012 |
| Solar physical radius | 696,000 | km | IAU 2015 |
| 1 AU | 149,597,870.7 | km | IAU 2012 |

The solar angular radius is computed dynamically as `R☉/(E × AU)` where E is the current Earth-Sun distance in AU.

## References

- IERS Conventions (2010), Section 7.1.2
- Klioner, S.A. (2003), "A practical relativistic model for microarcsecond astrometry in space", AJ 125, 1580
- IAU SOFA Library, function `iauLd`
