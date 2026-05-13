/**
 * ΔT (TT - UT1) 计算模块
 * 从 opendestiny/astro-wnl 移植
 *
 * 数据来源：
 * - -720 ~ 1953: Stephenson, Morrison & Hohenkerk (2016), Table S15
 * - 1953 ~ 2026: IERS finals2000A 实测 + skyfield 历史数据
 * - 2027 ~ 2050: skyfield DE440s 预测
 * - < -720 及 > 2050: 二次外推 -20 + 32 * ((y - 1820) / 100)²
 */

import { JD_J2000, SECONDS_PER_DAY, DAYS_PER_JULIAN_YEAR, DEG_TO_RAD } from '../math/constants.js';
import { jdToCalendar, calendarToJD } from '../math/julian.js';
import { S15_SPLINE, ANNUAL_DATA } from '../manifest/delta-t-data.js';

const S15_STRIDE = 6;

function evalS15(y: number): number {
  const d = S15_SPLINE;
  const n = d.length / S15_STRIDE;
  for (let i = 0; i < n; i++) {
    const off = i * S15_STRIDE;
    const x0 = d[off], x1 = d[off + 1];
    if (y >= x0 && y < x1) {
      const t = (y - x0) / (x1 - x0);
      const a0 = d[off + 5], a1 = d[off + 4], a2 = d[off + 3], a3 = d[off + 2];
      return a0 + a1 * t + a2 * t * t + a3 * t * t * t;
    }
  }
  const last = (n - 1) * S15_STRIDE;
  return d[last + 5] + d[last + 4] + d[last + 3] + d[last + 2];
}

function catmullRom(
  t0: number, t1: number, t2: number, t3: number,
  p0: number, p1: number, p2: number, p3: number,
  t: number,
): number {
  const dt1 = t2 - t1;
  const x = (t - t1) / dt1;
  const m1 = ((p2 - p0) / (t2 - t0)) * dt1;
  const m2 = ((p3 - p1) / (t3 - t1)) * dt1;
  const x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * p1 + (x3 - 2 * x2 + x) * m1 + (-2 * x3 + 3 * x2) * p2 + (x3 - x2) * m2;
}

function dtExtrapolate(y: number): number {
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/** 计算 ΔT = TT - UT1（秒） */
export function deltaT(y: number): number {
  if (y >= -720 && y < 1953) return evalS15(y);

  const data = ANNUAL_DATA;
  const firstYear = data[0][0];
  const lastYear = data[data.length - 1][0];

  if (y >= firstYear && y < lastYear) {
    let i = 0;
    for (; i < data.length - 1; i++) {
      if (y < data[i + 1][0]) break;
    }
    const i0 = Math.max(i - 1, 0), i1 = i;
    const i2 = Math.min(i + 1, data.length - 1), i3 = Math.min(i + 2, data.length - 1);
    return catmullRom(data[i0][0], data[i1][0], data[i2][0], data[i3][0],
      data[i0][1], data[i1][1], data[i2][1], data[i3][1], y);
  }

  if (y < -720) return dtExtrapolate(y);

  const t0 = lastYear, v0 = data[data.length - 1][1];
  if (y > t0 + 100) return dtExtrapolate(y);
  const v = dtExtrapolate(y), dv = dtExtrapolate(t0) - v0;
  return v - (dv * (t0 + 100 - y)) / 100;
}

/** 计算 ΔT = TT - UT1（秒），入参 jd 为儒略日 */
export function deltaTByJD(jd: number): number {
  const { year } = jdToCalendar(jd);
  const jdStart = calendarToJD(year, 1, 1);
  const jdEnd = calendarToJD(year + 1, 1, 1);
  const decimalYear = year + (jd - jdStart) / (jdEnd - jdStart);
  return deltaT(decimalYear);
}

/** TDB - TT（秒） */
export function tdbMinusTtSeconds(ttJd: number): number {
  const g = (357.53 + 0.9856003 * (ttJd - JD_J2000)) * DEG_TO_RAD;
  return 0.001657 * Math.sin(g) + 0.000022 * Math.sin(2 * g);
}

/** TT → TDB 转换 */
export function barycentricDynamicalTime(ttJd: number): number {
  return ttJd + tdbMinusTtSeconds(ttJd) / SECONDS_PER_DAY;
}
