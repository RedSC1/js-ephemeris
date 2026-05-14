/**
 * SXWNL (寿星万年历) Position Resolver
 *
 * Fallback resolver (priority 30) using truncated VSOP87B + ELP2000 algorithms
 * from the 寿星万年历 project. Provides arcsecond-level accuracy for all major
 * solar system bodies without requiring external data files.
 *
 * Planets: VSOP87B heliocentric ecliptic spherical → J2000 equatorial cartesian
 * Moon: ELP2000 geocentric ecliptic spherical → J2000 equatorial cartesian
 * Pluto: Custom series → J2000 equatorial cartesian
 */
import type { BodyTag, Vec3 } from '../types.js';
import type { PositionResolver, ResolverResult } from './types.js';
import { XL0, XL0_xzb, XL0Pluto, XL1 } from '../data/sxwnl-coefficients.js';

/** J2000.0 obliquity in radians (23.4392911°) */
const EPS = 23.4392911 * Math.PI / 180;
const COS_EPS = Math.cos(EPS);
const SIN_EPS = Math.sin(EPS);

/** Arcseconds per radian */
const RAD = 180 * 3600 / Math.PI;

/** Supported body tags */
const SUPPORTED_TAGS = new Set<string>([
  'sun', 'mer', 'ven', 'ear', 'emb', 'mar', 'jup', 'sat', 'ura', 'nep', 'plu', 'moon',
]);

/** Map body tag to XL0 planet index */
const TAG_TO_XT: Record<string, number> = {
  ear: 0, emb: 0,
  mer: 1, ven: 2, mar: 3,
  jup: 4, sat: 5, ura: 6, nep: 7,
};

// ─── VSOP87B Planet Calculation ─────────────────────────────────────────────

/**
 * Evaluate VSOP87B truncated series for a planet coordinate.
 * @param xt Planet index (0=Earth, 1=Mercury, ..., 7=Neptune)
 * @param zn Coordinate (0=longitude L, 1=latitude B, 2=radius R)
 * @param t Julian centuries from J2000.0
 * @param n Number of terms (-1 for all)
 * @returns L in radians, B in radians, or R in AU
 */
function XL0_calc(xt: number, zn: number, t: number, n: number): number {
  const tk = t / 10; // Convert to Julian millennia
  let v = 0;
  let tn = 1;
  const F = XL0[xt]!;
  const pn = zn * 6 + 1;
  const N0 = F[pn + 1]! - F[pn]!; // Total terms in first power

  for (let i = 0; i < 6; i++, tn *= tk) {
    const n1 = F[pn + i]!;
    const n2 = F[pn + 1 + i]!;
    const n0 = n2 - n1;
    if (!n0) continue;

    let N: number;
    if (n < 0) {
      N = n2; // Use all terms
    } else {
      N = Math.floor(3 * n * n0 / N0 + 0.5) + n1;
      if (i) N += 3;
      if (N > n2) N = n2;
    }

    let c = 0;
    for (let j = n1; j < N; j += 3) {
      c += F[j]! * Math.cos(F[j + 1]! + tk * F[j + 2]!);
    }
    v += c * tn;
  }

  v /= F[0]!; // Divide by amplitude multiplier

  // Apply DE405 system corrections (from original sxwnl)
  if (xt === 0) {
    // Earth corrections
    const t2 = tk * tk, t3 = t2 * tk;
    if (zn === 0) v += (-0.0728 - 2.7702 * tk - 1.1019 * t2 - 0.0996 * t3) / RAD;
    if (zn === 1) v += (+0.0000 + 0.0004 * tk + 0.0004 * t2 - 0.0026 * t3) / RAD;
    if (zn === 2) v += (-0.0020 + 0.0044 * tk + 0.0213 * t2 - 0.0250 * t3) / 1000000;
  } else {
    // Other planets
    const dv = XL0_xzb[(xt - 1) * 3 + zn]!;
    if (zn === 0) v += -3 * tk / RAD;
    if (zn === 2) v += dv / 1000000;
    else v += dv / RAD;
  }

  return v;
}

// ─── Pluto Calculation ──────────────────────────────────────────────────────

/**
 * Compute Pluto's J2000 ecliptic cartesian coordinates.
 * @param t Julian centuries from J2000.0
 * @returns [x, y, z] in AU (J2000 ecliptic)
 */
function plutoCoord(t: number): Vec3 {
  const c0 = Math.PI / 180 / 100000;
  const x = -1 + 2 * (t * 36525 + 1825394.5) / 2185000;
  const T = t / 100000000;
  const r: Vec3 = [0, 0, 0];

  for (let i = 0; i < 9; i++) {
    const ob = XL0Pluto[i]!;
    const N = ob.length;
    let v = 0;
    for (let j = 0; j < N; j += 3) {
      v += ob[j]! * Math.sin(ob[j + 1]! * T + ob[j + 2]! * c0);
    }
    if (i % 3 === 1) v *= x;
    if (i % 3 === 2) v *= x * x;
    r[Math.floor(i / 3) as 0 | 1 | 2] += v / 100000000;
  }

  r[0] += 9.922274 + 0.154154 * x;
  r[1] += 10.016090 + 0.064073 * x;
  r[2] += -3.947474 - 0.042746 * x;
  return r;
}

// ─── Moon (ELP2000) Calculation ─────────────────────────────────────────────

/**
 * Evaluate ELP2000 truncated series for a Moon coordinate.
 * @param zn Coordinate (0=longitude, 1=latitude, 2=distance)
 * @param t Julian centuries from J2000.0
 * @param n Number of terms (-1 for all)
 * @returns longitude/latitude in radians, or distance in Earth radii (for zn=2)
 */
function XL1_calc(zn: number, t: number, n: number): number {
  const ob = XL1[zn]!;
  let v = 0;
  let tn = 1;
  const t2 = t * t, t3 = t2 * t, t4 = t3 * t;

  if (zn === 0) {
    // Moon mean longitude (J2000, WITHOUT precession)
    v += (3.81034409 + 8399.684730072 * t - 3.319e-05 * t2 + 3.11e-08 * t3 - 2.033e-10 * t4) * RAD;
    // NOTE: We intentionally do NOT add the precession term (5028.792262*t + ...)
    // because we want J2000 ecliptic longitude, not ecliptic of date.
  }

  // Scale t powers for the series evaluation
  const t2s = t2 / 1e4, t3s = t3 / 1e8, t4s = t4 / 1e8;

  let nTerms = n * 6;
  if (nTerms < 0) nTerms = ob[0]!.length;

  for (let i = 0; i < ob.length; i++, tn *= t) {
    const F = ob[i]!;
    let N = Math.floor(nTerms * F.length / ob[0]!.length + 0.5);
    if (i) N += 6;
    if (N >= F.length) N = F.length;

    let c = 0;
    for (let j = 0; j < N; j += 6) {
      c += F[j]! * Math.cos(F[j + 1]! + t * F[j + 2]! + t2s * F[j + 3]! + t3s * F[j + 4]! + t4s * F[j + 5]!);
    }
    v += c * tn;
  }

  if (zn !== 2) v /= RAD; // Convert arcseconds to radians
  return v;
}

// ─── Coordinate Conversions ─────────────────────────────────────────────────

/**
 * Rotate ecliptic cartesian to J2000 equatorial cartesian.
 */
function eclipticToEquatorial(x: number, y: number, z: number): Vec3 {
  return [
    x,
    y * COS_EPS - z * SIN_EPS,
    y * SIN_EPS + z * COS_EPS,
  ];
}

/**
 * Convert ecliptic spherical (L, B, R) to equatorial cartesian.
 * @param L longitude in radians
 * @param B latitude in radians
 * @param R distance in AU
 */
function eclipticSphericalToEquatorial(L: number, B: number, R: number): Vec3 {
  const cosB = Math.cos(B);
  const x_ecl = R * cosB * Math.cos(L);
  const y_ecl = R * cosB * Math.sin(L);
  const z_ecl = R * Math.sin(B);
  return eclipticToEquatorial(x_ecl, y_ecl, z_ecl);
}

// ─── Resolver Implementation ────────────────────────────────────────────────

/**
 * SXWNL Position Resolver
 *
 * Uses truncated VSOP87B (planets) and ELP2000 (Moon) from the 寿星万年历 project.
 * Provides arcsecond-level accuracy as a fallback when high-precision ephemeris
 * data is not available.
 */
export class SxwnlResolver implements PositionResolver {
  name = 'sxwnl';
  priority = 30;

  canResolve(tag: BodyTag, _jd: number): boolean {
    return SUPPORTED_TAGS.has(tag);
  }

  async resolve(tag: BodyTag, jd: number, options?: any): Promise<ResolverResult | null> {
    const t = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

    if (tag === 'sun') {
      return {
        state: [0, 0, 0, 0, 0, 0] as any,
        source: 'sxwnl',
        precision: 'arcsec',
        center: 'sun',
        frame: 'ICRF / J2000 Equatorial',
      };
    }

    const computeVelocity = options?.computeVelocity === true;
    const pos = this.computePosition(tag, t);
    if (!pos) return null;

    let state: any = pos;
    if (computeVelocity) {
      // 数值差分求速度: dt = 0.01 天 ≈ 14 分钟
      const dt = 0.01;
      const dtCentury = dt / 36525;
      const p1 = this.computePosition(tag, t - dtCentury)!;
      const p2 = this.computePosition(tag, t + dtCentury)!;
      const inv2dt = 1 / (2 * dt);
      state = [
        pos[0], pos[1], pos[2],
        (p2[0] - p1[0]) * inv2dt,
        (p2[1] - p1[1]) * inv2dt,
        (p2[2] - p1[2]) * inv2dt,
      ];
    }

    const center = tag === 'moon' ? 'earth' : 'sun';
    return {
      state,
      source: 'sxwnl',
      precision: 'arcsec',
      center,
      frame: 'ICRF / J2000 Equatorial',
    };
  }

  private computePosition(tag: BodyTag, t: number): Vec3 | null {
    if (tag === 'moon') {
      const L = XL1_calc(0, t, -1);
      const B = XL1_calc(1, t, -1);
      const distKm = XL1_calc(2, t, -1);
      const R = distKm / 149597870.7;
      return eclipticSphericalToEquatorial(L, B, R);
    }

    if (tag === 'plu') {
      const eclCart = plutoCoord(t);
      return eclipticToEquatorial(eclCart[0], eclCart[1], eclCart[2]);
    }

    const xt = TAG_TO_XT[tag];
    if (xt === undefined) return null;

    let L = XL0_calc(xt, 0, t, -1);
    const B = XL0_calc(xt, 1, t, -1);
    const R = XL0_calc(xt, 2, t, -1);

    // XL0_calc with corrections outputs ecliptic-of-date longitude.
    // Subtract precession to get J2000 ecliptic longitude.
    const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const precession = (5028.792262 * t + 1.1124406 * t2 + 0.00007699 * t3
      - 0.000023479 * t4 - 0.0000000178 * t5) / RAD; // radians
    L -= precession;

    return eclipticSphericalToEquatorial(L, B, R);
  }
}
