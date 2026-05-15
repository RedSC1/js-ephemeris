/**
 * Moshier PLAN404 Position Resolver
 *
 * Fallback resolver (priority 20) using Moshier's semi-analytical planetary theory.
 * 
 * Reference frame:
 *   Moshier's PLAN404 outputs J2000.0 ecliptic coordinates in the DE404 reference
 *   frame (dynamical equinox of J2000). This differs from ICRF by the frame bias
 *   rotation (~0.015"), which is negligible compared to the theory's truncation
 *   error (0.04-0.25"). The DE441 correction polynomials implicitly absorb this
 *   frame bias along with other systematic differences, so the final output is
 *   effectively in ICRF/J2000.
 *
 * Accuracy (with DE441 correction):
 *   - Earth: 2" peak over ±5000 years, 0.05" in modern era
 *   - Inner planets: 0.1-1.8" over ±1500 years
 *   - Outer planets: 0.5-1.5" over ±1500 years
 *   - Moon: ~2" in modern era (geocentric)
 *   - Pluto: ~28" over ±1500 years
 *
 * Does NOT diverge (unlike VSOP87) — T only appears in amplitude polynomials.
 */

// @ts-nocheck
import type { BodyTag, Vec3 } from '../types.js';
import type { PositionResolver, ResolverResult } from '../manifest/types.js';
import { gplan, g3plan, gmoon } from './gplan.js';
import type { PlanetTable, MoonLRTable, MoonLatTable } from './gplan.js';
import { ear404 } from './data/ear404.js';
import { mer404 } from './data/mer404.js';
import { ven404 } from './data/ven404.js';
import { mar404 } from './data/mar404.js';
import { jup404 } from './data/jup404.js';
import { sat404 } from './data/sat404.js';
import { ura404 } from './data/ura404.js';
import { nep404 } from './data/nep404.js';
import { plu404 } from './data/plu404.js';
import { moonlr } from './data/mlr404.js';
import { moonlat } from './data/mlat404.js';
import {
  mercury404Correction, venus404Correction, earth404Correction,
  mars404Correction, jupiter404Correction, saturn404Correction,
  uranus404Correction, neptune404Correction, pluto404Correction,
  type CorrectionSegment,
} from './data/corrections.js';

/** J2000 obliquity (radians) */
const EPS = 23.4392911 * Math.PI / 180;
const COS_EPS = Math.cos(EPS);
const SIN_EPS = Math.sin(EPS);

/** Arcseconds to radians */
const AS2RAD = Math.PI / (180 * 3600);

/** DE441 Earth/Moon mass ratio */
const EMRAT = 81.3005682;

/** Supported bodies */
const BODY_CONFIG: Record<string, {
  table: PlanetTable;
  useG3plan: boolean;
  objnum: number;
  correction: CorrectionSegment[];
}> = {
  mer: { table: mer404, useG3plan: false, objnum: 0, correction: mercury404Correction },
  ven: { table: ven404, useG3plan: false, objnum: 0, correction: venus404Correction },
  ear: { table: ear404, useG3plan: true, objnum: 3, correction: earth404Correction },
  emb: { table: ear404, useG3plan: true, objnum: 3, correction: earth404Correction },
  mar: { table: mar404, useG3plan: false, objnum: 0, correction: mars404Correction },
  jup: { table: jup404, useG3plan: false, objnum: 0, correction: jupiter404Correction },
  sat: { table: sat404, useG3plan: false, objnum: 0, correction: saturn404Correction },
  ura: { table: ura404, useG3plan: false, objnum: 0, correction: uranus404Correction },
  nep: { table: nep404, useG3plan: false, objnum: 0, correction: neptune404Correction },
  plu: { table: plu404, useG3plan: false, objnum: 0, correction: pluto404Correction },
};/**
 * 应用分段多项式修正
 * @param year - CE 年份
 * @param segments - 修正段数组
 * @returns [dLon_rad, dLat_rad] 修正量（弧度）
 */
function applyCorrection(year: number, segments: CorrectionSegment[]): [number, number] {
  // 找到对应的段
  for (const seg of segments) {
    if (year >= seg.start && year < seg.end) {
      const T = (year - seg.center) / seg.half; // [-1, 1]
      // 多项式求值: c[0]*T^3 + c[1]*T^2 + c[2]*T + c[3]
      const dLon = ((seg.lon[0] * T + seg.lon[1]) * T + seg.lon[2]) * T + seg.lon[3];
      const dLat = ((seg.lat[0] * T + seg.lat[1]) * T + seg.lat[2]) * T + seg.lat[3];
      return [dLon * AS2RAD, dLat * AS2RAD];
    }
  }
  // 最后一个点 (year == end of last segment)
  const last = segments[segments.length - 1];
  if (last && year >= last.start && year <= last.end) {
    const T = (year - last.center) / last.half;
    const dLon = ((last.lon[0] * T + last.lon[1]) * T + last.lon[2]) * T + last.lon[3];
    const dLat = ((last.lat[0] * T + last.lat[1]) * T + last.lat[2]) * T + last.lat[3];
    return [dLon * AS2RAD, dLat * AS2RAD];
  }
  return [0, 0]; // 超出修正范围，不修正
}

/**
 * 将 J2000 ecliptic spherical 转为 J2000 equatorial cartesian
 */
function eclipticToEquatorial(L: number, B: number, R: number): Vec3 {
  const cosB = Math.cos(B);
  const x_ecl = R * cosB * Math.cos(L);
  const y_ecl = R * cosB * Math.sin(L);
  const z_ecl = R * Math.sin(B);
  return [
    x_ecl,
    y_ecl * COS_EPS - z_ecl * SIN_EPS,
    y_ecl * SIN_EPS + z_ecl * COS_EPS,
  ];
}

/**
 * Moshier PLAN404 Position Resolver
 */
export class MoshierResolver implements PositionResolver {
  name = 'moshier';
  priority = 20;

  /** 是否应用 DE441 修正 (默认开启) */
  applyDE441Correction = true;

  canResolve(tag: BodyTag, _jd: number): boolean {
    return tag in BODY_CONFIG || tag === 'sun' || tag === 'moon';
  }

  async resolve(tag: BodyTag, jd: number, options?: any): Promise<ResolverResult | null> {
    if (tag === 'sun') {
      return {
        state: [0, 0, 0] as Vec3,
        source: 'moshier',
        precision: 'arcsec',
        center: 'sun',
        frame: 'ICRF / J2000 Equatorial',
      };
    }

    if (tag === 'moon') {
      return this.resolveMoon(jd, options);
    }

    const config = BODY_CONFIG[tag];
    if (!config) return null;

    const computeVelocity = options?.computeVelocity === true;
    const isEarthBody = (tag === 'ear');

    // 计算位置
    let pos = this.computePosition(jd, config);

    // Earth body = EMB - Moon / (1 + EMRAT)
    if (isEarthBody) {
      const moonPos = gmoon(jd, moonlr, moonlat);
      const factor = 1 / (1 + EMRAT);
      pos = [
        pos[0] - moonPos[0] * factor,
        pos[1] - moonPos[1] * factor,
        pos[2] - moonPos[2] * factor,
      ];
    }

    let state: any;
    if (computeVelocity) {
      const dt = 0.01;
      let p1 = this.computePosition(jd - dt, config);
      let p2 = this.computePosition(jd + dt, config);
      if (isEarthBody) {
        const m1 = gmoon(jd - dt, moonlr, moonlat);
        const m2 = gmoon(jd + dt, moonlr, moonlat);
        const factor = 1 / (1 + EMRAT);
        p1 = [p1[0] - m1[0]*factor, p1[1] - m1[1]*factor, p1[2] - m1[2]*factor];
        p2 = [p2[0] - m2[0]*factor, p2[1] - m2[1]*factor, p2[2] - m2[2]*factor];
      }
      const inv2dt = 1 / (2 * dt);
      state = [
        pos[0], pos[1], pos[2],
        (p2[0] - p1[0]) * inv2dt,
        (p2[1] - p1[1]) * inv2dt,
        (p2[2] - p1[2]) * inv2dt,
      ];
    } else {
      state = pos;
    }

    return {
      state,
      source: 'moshier',
      precision: 'arcsec',
      center: 'sun',
      frame: 'ICRF / J2000 Equatorial',
    };
  }

  private async resolveMoon(jd: number, options?: any): Promise<ResolverResult> {
    const computeVelocity = options?.computeVelocity === true;
    const pos = gmoon(jd, moonlr, moonlat);

    let state: any;
    if (computeVelocity) {
      const dt = 0.001; // 月球运动快，用更小的步长
      const p1 = gmoon(jd - dt, moonlr, moonlat);
      const p2 = gmoon(jd + dt, moonlr, moonlat);
      const inv2dt = 1 / (2 * dt);
      state = [
        pos[0], pos[1], pos[2],
        (p2[0] - p1[0]) * inv2dt,
        (p2[1] - p1[1]) * inv2dt,
        (p2[2] - p1[2]) * inv2dt,
      ];
    } else {
      state = pos;
    }

    return {
      state,
      source: 'moshier',
      precision: 'arcsec',
      center: 'earth',
      frame: 'ICRF / J2000 Equatorial',
    };
  }

  private computePosition(jd: number, config: typeof BODY_CONFIG[string]): Vec3 {
    // 计算 Moshier 原始位置 (J2000 ecliptic spherical)
    let L: number, B: number, R: number;

    if (config.useG3plan) {
      [L, B, R] = g3plan(jd, config.table, config.objnum);
    } else {
      [L, B, R] = gplan(jd, config.table);
    }

    // 应用 DE441 修正
    if (this.applyDE441Correction && config.correction.length > 0) {
      const year = 2000 + (jd - 2451545.0) / 365.25;
      const [dL, dB] = applyCorrection(year, config.correction);
      L -= dL; // 修正是 Moshier - DE441，所以减去
      B -= dB;
    }

    // 转为 equatorial cartesian
    return eclipticToEquatorial(L, B, R);
  }
}
