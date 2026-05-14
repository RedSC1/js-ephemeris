# Data Formats: OPM2 and OPV2

## Background

The data format is inspired by Kammeyer (1989), "Compressed Planetary and Lunar Ephemerides" (Celestial Mechanics 45, 311-316). The original system stored JPL DE200 positions as Chebyshev series with integer-quantized coefficients, achieving milliarcsecond accuracy in 830 KB for 1801-2049.

Our OPM2/OPV2 formats extend this approach with:
- SVD-derived local coordinate frames (vs fixed orbital planes)
- Variable-width integer encoding (1/2/3/4 bytes per coefficient)
- Per-segment or per-century frame definitions
- Gzip compression for storage

## OPM2 Format (Planets, Moon, Asteroids)

**Magic**: `OPM2` (4 bytes)

### Compression Strategy

Following Kammeyer's approach:

1. **Local coordinate frame**: For each segment, an SVD-derived orthonormal frame (u, v, w) is computed where the orbit lies near the u-v plane. This minimizes the magnitude of the z-component coefficients.

2. **Quantization**: Chebyshev coefficients are divided by a body-specific unit and rounded to integers. The unit is chosen so that the quantization error is below 0.001".

3. **Variable-width packing**: Each integer coefficient is stored using only the bytes needed (1, 2, 3, or 4 bytes), with a 2-bit width code per coefficient packed into header bytes.

4. **Reference orbit subtraction** (Mercury only): A reference Chebyshev series (representing a mean orbit) is subtracted from the x/y coefficients, reducing their magnitude and thus storage.

### Binary Layout

```
Header:
  [4 bytes]  Magic: 'OPM2'
  [1 byte]   Version (1)
  [1 byte]   Body ID (1=Mercury, 2=Venus, ..., 10=Moon)
  [8 bytes]  jdStart (float64)
  [8 bytes]  jdEnd (float64)
  [2 bytes]  nSegments (uint16)
  [1 byte]   degXY (Chebyshev degree for x,y components)
  [1 byte]   degZ (Chebyshev degree for z component)

Per segment (repeated nSegments times):
  [8 bytes]  segment start JD (float64)
  [8 bytes]  segment end JD (float64)
  [24 bytes] frame angles: nodeLon, nodeLat, inPlaneAngle (3 × float64)
  [variable] x-component integer coefficients (mixed-width)
  [variable] y-component integer coefficients (mixed-width)
  [variable] z-component integer coefficients (mixed-width)
```

### Mixed-Width Integer Encoding

For N coefficients:
1. `ceil(N/4)` bytes of width codes (2 bits per coefficient: 0=1byte, 1=2bytes, 2=3bytes, 3=4bytes)
2. Packed integer values in little-endian, using the specified width

### Frame Reconstruction

The three angles (nodeLon, nodeLat, inPlaneAngle) encode an orthonormal frame:
1. `w` = normal vector from (nodeLon, nodeLat) on unit sphere
2. `u` = in-plane reference direction, rotated by inPlaneAngle
3. `v` = w × u (completing right-handed frame)

Position in J2000 equatorial: `P = cx*u + cy*v + cz*w`

### Quantization Units (km)

| Body ID | Body | Unit | Format | Content |
|---------|------|------|--------|---------|
| 1 | Mercury | 0.04 | OPM2 | Heliocentric position |
| 2 | Venus | 0.08 | OPM2 | Heliocentric position |
| 3 | Earth/EMB | 0.08 | OPM2 | Heliocentric position |
| 4 | Mars | 0.13 | OPM2 | Heliocentric position |
| 5 | Jupiter | 0.55 | OPM2 | System barycenter position |
| 6 | Saturn | 1.0 | OPM2 | System barycenter position |
| 7 | Uranus | 2.0 | OPM2 | System barycenter position |
| 8 | Neptune | 3.2 | OPM2 | System barycenter position |
| 9 | Pluto | — | OPV2 | System barycenter position (per-segment scale) |
| 10 | Moon | 0.0003 | OPM2 | Geocentric position |
| 101 | Ceres | 0.5 | OPM2 | Heliocentric position |
| 102 | Pallas | 0.5 | OPM2 | Heliocentric position |
| 103 | Juno | 0.5 | OPM2 | Heliocentric position |
| 104 | Vesta | 0.5 | OPM2 | Heliocentric position |
| 105 | Eros | 0.3 | OPM2 | Heliocentric position |
| 106 | Chiron | 5.0 | OPM2 | Heliocentric position |
| 107 | Pholus | 8.0 | OPM2 | Heliocentric position |
| 108 | Nessus | 12.0 | OPM2 | Heliocentric position |
| 109 | Lilith (1181) | 0.5 | OPM2 | Heliocentric position |
| 201 | Jupiter COB | — | OPM2 | Barycenter-to-body offset |
| 202 | Saturn COB | — | OPM2 | Barycenter-to-body offset |
| 203 | Uranus COB | — | OPM2 | Barycenter-to-body offset |
| 204 | Neptune COB | — | OPM2 | Barycenter-to-body offset |
| 205 | Pluto COB | — | OPM2 | Barycenter-to-body offset |

ID numbering scheme:
- 1–10: Major bodies (planets + Moon)
- 101–109: Asteroids and centaurs
- 201–205: Center-of-body (COB) offset data

Asteroids (ID 101+) use the default unit of 0.04 km for built-in 1800-2100 data. Extended data (30000-year) uses larger units to avoid int32 overflow at greater distances.

### Evaluation

```
1. Binary search for segment containing JD
2. Normalize time: x = (2*JD - a - b) / (b - a), x ∈ [-1, 1]
3. Reconstruct float coefficients: c_float = c_int * unit + ref_int * unit
4. Chebyshev evaluation (Clenshaw recurrence) for each component
5. Rotate from local frame to J2000: P = lx*u + ly*v + lz*w
6. Convert km → AU
```

### Velocity

Velocity is obtained by analytic differentiation of the Chebyshev series:

```
dP/dt = dP/dx × dx/dt = chebDeriv(coeffs, x) × 2/(b-a)
```

The Clenshaw recurrence for the derivative is computed simultaneously with the value (no extra pass needed).

## OPV2 Format (Pluto, potentially other slow-moving bodies)

**Magic**: `OPV2` (4 bytes)

### Differences from OPM2

| Feature | OPM2 | OPV2 |
|---------|------|------|
| Frame | Per-segment (3 angles) | Per-century fixed (3×3 vectors) |
| Quantization | Fixed unit per body | Per-segment per-component scale factor |
| Coefficient encoding | Integer × unit | Integer / scale |
| Best for | Fast-moving bodies (inner planets) | Slow-moving bodies (Pluto) |

OPV2 uses a fixed PCA frame for the entire century file because Pluto's orbital plane barely changes over 100 years. This saves the per-segment frame overhead.

### Binary Layout

```
Header:
  [4 bytes]  Magic: 'OPV2'
  [1 byte]   Version (1)
  [1 byte]   Body ID
  [4 bytes]  jdStart offset from JD 2461076 (int32)
  [4 bytes]  jdEnd offset from JD 2461076 (int32)
  [4 bytes]  nSegments (uint32)
  [72 bytes] Fixed frame: uFix, vFix, wFix (3 × 3 × float64)

Segment boundaries (nSegments × 16 bytes):
  [8 bytes]  segment start JD (float64)
  [8 bytes]  segment end JD (float64)

Segment degrees (nSegments × 3 bytes):
  [1 byte]   degX
  [1 byte]   degY
  [1 byte]   degZ

Per segment coefficients:
  For each component (x, y, z):
    [8 bytes]  scale factor (float64)
    [variable] width codes (ceil(nCoeffs/4) bytes)
    [variable] packed integers (mixed-width, same encoding as OPM2)
    
  Real coefficient = integer_value / scale
```

### Evaluation

Same as OPM2 but simpler:
1. No reference orbit subtraction
2. Frame is fixed (no per-segment angle decoding)
3. Coefficients decoded as `int / scale` instead of `int * unit`

## File Organization

Each `.bin.gz` file contains one century (36525 days) of data for one body.

Naming convention: `{body}_{jdStart}_{jdEnd}.bin.gz`

Example: `mars_2451545_2488070.bin.gz` = Mars, J2000.0 to 2100-01-01

### Storage Hierarchy

```
Built-in (npm package):     base64 in TypeScript, 1800-2100 only
Local/CDN (RemoteResolver): .bin.gz files, full time range
```

## Accuracy

The quantization error is bounded by `unit / 2` per coefficient. With degree-40 Chebyshev series, the worst-case position error is approximately `40 × unit / 2`. For Saturn (unit = 1.0 km): max error ≈ 20 km ≈ 0.0001" at 10 AU.

Measured p99 accuracy against DE441:

| Body | Format | p99 error | Coverage | Source |
|------|--------|-----------|----------|--------|
| Mercury | OPM2 | 0.0012" | -13100 ~ 17191 CE | DE441 |
| Venus | OPM2 | 0.0012" | -13100 ~ 17191 CE | DE441 |
| Earth/EMB | OPM2 | 0.0015" | -13100 ~ 17191 CE | DE441 |
| Moon | OPM2 | 0.0008" | -13100 ~ 17191 CE | DE441 |
| Mars | OPM2 | 0.0014" | -13100 ~ 17191 CE | DE441 |
| Jupiter | OPM2 | 0.0011" | -13100 ~ 17191 CE | DE441 |
| Saturn | OPM2 | 0.0007" | -13100 ~ 17191 CE | DE441 |
| Uranus | OPM2 | 0.0013" | -13100 ~ 17191 CE | DE441 |
| Neptune | OPM2 | 0.0009" | -13100 ~ 17191 CE | DE441 |
| Pluto | OPV2 | 0.0005" | -13274 ~ 17191 CE | DE441 |
| Ceres | OPM2 | 0.0013" | -7900 ~ 9000 CE | sb441-n16.bsp |
| Pallas | OPM2 | 0.0009" | -7900 ~ 9000 CE | sb441-n16.bsp |
| Juno | OPM2 | 0.0011" | -7900 ~ 9000 CE | sb441-n16.bsp |
| Vesta | OPM2 | 0.0012" | -7900 ~ 9000 CE | sb441-n16.bsp |
| Eros | OPM2 | 0.0007" | 1600 ~ 2700 CE | sb441-n373s.bsp |
| Chiron | OPM2 | 0.0007" | 1800 ~ 2100 CE | JPL Horizons |
| Pholus | OPM2 | ~0.001" | 1800 ~ 2100 CE | JPL Horizons |
| Nessus | OPM2 | ~0.001" | 1800 ~ 2100 CE | JPL Horizons |
| Lilith (1181) | OPM2 | 0.003" | 1800 ~ 2100 CE | JPL Horizons |

### Asteroid Notes

- **Ceres, Pallas, Juno, Vesta**: Data from JPL sb441-n16.bsp (16 main asteroids, numerical integration over 17000 years). These are the four largest main-belt asteroids.
- **Eros**: Data from JPL sb441-n373s.bsp (373 asteroids, 1100-year coverage). Near-Earth asteroid, first to be orbited by a spacecraft.
- **Chiron, Pholus, Nessus**: Centaur objects with orbits between Saturn and Neptune/Pluto. Data from JPL Horizons API, limited to 1800-2100 due to chaotic orbital dynamics (Chiron's orbit is physically unreliable before ~700 CE).
- **Lilith (1181)**: Main-belt asteroid (not to be confused with Black Moon Lilith, the lunar apogee). Data from JPL Horizons API.

All asteroids use the same OPM2 format as planets. Their heliocentric positions are stored in J2000 equatorial (ICRF) coordinates.

## References

- Kammeyer, P. (1989), "Compressed Planetary and Lunar Ephemerides", Celestial Mechanics 45, 311-316
- Standish, E.M. et al. (1976), JPL Development Ephemeris Number 96, NASA Tech. Rep. 32-1603
- Broucke, R. (1973), "Ten Subroutines for the Manipulation of Chebyshev Series", Comm. ACM 16, 254-256
