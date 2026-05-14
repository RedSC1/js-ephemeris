/**
 * 开普勒轨道解析器 (Keplerian Resolver)
 * 
 * 最低优先级 fallback：用轨道根数 + 开普勒方程求解位置。
 * 精度约 1'（角分级），但覆盖任意时间。
 * 
 * 适用于小行星在超出预计算数据范围时的兜底。
 * 不考虑摄动，纯二体问题。
 */
import type { BodyTag, Vec3 } from '../types.js';
import type { PositionResolver, ResolverResult } from './types.js';

/** 高斯引力常数 k² (AU³/day²/M_sun) */
const GM_SUN = 0.000295912208285591100; // k² = (0.01720209895)²

/** J2000.0 epoch (JD) */
const J2000 = 2451545.0;

/**
 * 轨道根数 (J2000.0 epoch)
 * a: 半长轴 (AU)
 * e: 偏心率
 * i: 轨道倾角 (rad)
 * node: 升交点经度 Ω (rad)
 * peri: 近日点幅角 ω (rad)
 * M0: 历元平近点角 (rad)
 * n: 平均日运动 (rad/day)
 */
interface OrbitalElements {
  a: number;
  e: number;
  i: number;
  node: number;
  peri: number;
  M0: number;
  n: number;
}

const DEG = Math.PI / 180;

/**
 * 内置小行星轨道根数 (J2000.0 epoch, ICRF)
 * 来源: JPL Small-Body Database
 */
const ELEMENTS: Record<string, OrbitalElements> = {
  'ceres': {
    a: 2.7691652, e: 0.0760090, i: 10.5935 * DEG,
    node: 80.3055 * DEG, peri: 73.5977 * DEG,
    M0: 77.372 * DEG, n: 0.2141308 * DEG,
  },
  'pallas': {
    a: 2.7716566, e: 0.2312736, i: 34.8323 * DEG,
    node: 173.0962 * DEG, peri: 310.0474 * DEG,
    M0: 259.885 * DEG, n: 0.2135015 * DEG,
  },
  'juno': {
    a: 2.6700912, e: 0.2562050, i: 12.9817 * DEG,
    node: 169.8712 * DEG, peri: 248.4100 * DEG,
    M0: 115.416 * DEG, n: 0.2260420 * DEG,
  },
  'vesta': {
    a: 2.3615079, e: 0.0887458, i: 7.1422 * DEG,
    node: 103.8514 * DEG, peri: 149.8585 * DEG,
    M0: 20.864 * DEG, n: 0.2716576 * DEG,
  },
  'eros': {
    a: 1.4580706, e: 0.2229512, i: 10.8290 * DEG,
    node: 304.2988 * DEG, peri: 178.8165 * DEG,
    M0: 171.607 * DEG, n: 0.5598186 * DEG,
  },
  'chiron': {
    a: 13.6481, e: 0.3792, i: 6.9260 * DEG,
    node: 209.3526 * DEG, peri: 339.4268 * DEG,
    M0: 28.82 * DEG, n: 0.01953 * DEG,
  },
  'pholus': {
    a: 20.3267, e: 0.5721, i: 24.6889 * DEG,
    node: 119.4190 * DEG, peri: 354.8963 * DEG,
    M0: 72.10 * DEG, n: 0.01076 * DEG,
  },
  'nessus': {
    a: 24.6155, e: 0.5195, i: 15.6459 * DEG,
    node: 31.2417 * DEG, peri: 130.3082 * DEG,
    M0: 212.44 * DEG, n: 0.00808 * DEG,
  },
  'lilith': {
    a: 2.7543, e: 0.1180, i: 5.4780 * DEG,
    node: 58.3700 * DEG, peri: 327.3400 * DEG,
    M0: 143.50 * DEG, n: 0.2170 * DEG,
  },
};

/**
 * 求解开普勒方程: M = E - e*sin(E)
 * Newton-Raphson 迭代
 */
function solveKepler(M: number, e: number): number {
  // 归一化 M 到 [0, 2π)
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  let E = M + e * Math.sin(M); // 初始猜测
  for (let i = 0; i < 20; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-14) break;
  }
  return E;
}

/**
 * 从轨道根数计算日心 J2000 赤道直角坐标
 */
function elementsToPosition(el: OrbitalElements, jd: number): Vec3 {
  const dt = jd - J2000;
  const M = el.M0 + el.n * dt;

  const E = solveKepler(M, el.e);

  // 轨道平面内坐标
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const x_orb = el.a * (cosE - el.e);
  const y_orb = el.a * Math.sqrt(1 - el.e * el.e) * sinE;

  // 旋转到 J2000 赤道坐标系
  const cosNode = Math.cos(el.node);
  const sinNode = Math.sin(el.node);
  const cosPeri = Math.cos(el.peri);
  const sinPeri = Math.sin(el.peri);
  const cosI = Math.cos(el.i);
  const sinI = Math.sin(el.i);

  // 旋转矩阵 R = Rz(-Ω) * Rx(-i) * Rz(-ω)
  const Px = cosNode * cosPeri - sinNode * sinPeri * cosI;
  const Py = sinNode * cosPeri + cosNode * sinPeri * cosI;
  const Pz = sinPeri * sinI;

  const Qx = -cosNode * sinPeri - sinNode * cosPeri * cosI;
  const Qy = -sinNode * sinPeri + cosNode * cosPeri * cosI;
  const Qz = cosPeri * sinI;

  // 日心黄道坐标
  const x_ecl = Px * x_orb + Qx * y_orb;
  const y_ecl = Py * x_orb + Qy * y_orb;
  const z_ecl = Pz * x_orb + Qz * y_orb;

  // 黄道 → 赤道 (J2000 黄赤交角 ε = 23.4392911°)
  const eps = 23.4392911 * DEG;
  const cosEps = Math.cos(eps);
  const sinEps = Math.sin(eps);

  return [
    x_ecl,
    y_ecl * cosEps - z_ecl * sinEps,
    y_ecl * sinEps + z_ecl * cosEps,
  ];
}

/**
 * 开普勒轨道解析器
 * 优先级 10（最低），作为小行星的兜底方案
 */
export class KeplerianResolver implements PositionResolver {
  name = 'keplerian';
  priority = 10;

  canResolve(tag: BodyTag, jd: number): boolean {
    return tag in ELEMENTS;
  }

  async resolve(tag: BodyTag, jd: number): Promise<ResolverResult | null> {
    const el = ELEMENTS[tag];
    if (!el) return null;

    const pos = elementsToPosition(el, jd);

    return {
      state: pos,
      source: 'kepler',
      precision: 'arcmin',
      center: 'sun',
      frame: 'ICRF / J2000 Equatorial',
    };
  }
}
