import type { Vec3 } from '../types.js';

/**
 * 太阳引力偏折常数: 2 * G * M_sun / c^2，单位：AU (Schwarzschild radius)
 * SOFA 中称为 SRS = 1.97412574336e-8 AU
 */
const SRS_AU = 1.97412574336e-8;

/**
 * 太阳物理半径 (km)
 */
const SUN_RADIUS_KM = 696000;

/**
 * 1 AU (km)
 */
const AU_KM = 149597870.7;

/**
 * 太阳引力偏折修正 (Gravitational Deflection)
 * 
 * 基于 SOFA iauLd 函数实现 (Klioner 2003, Expr. 70)。
 * 
 * 当目标在太阳圆盘内部时，使用 enclosed mass fraction 模型平滑衰减，
 * 保证黄经曲线处处光滑。
 * 
 * @param objPos 目标地心位置向量 (J2000/ICRF, AU)
 * @param earthPos 地球日心位置向量 (J2000/ICRF, AU)
 * @param targetHelio 目标日心位置向量 (J2000/ICRF, AU)，用于确定太阳到目标的方向
 * @param distance 目标地心距离 (AU)
 * @returns 偏折修正后的位置向量
 */
export function applyDeflection(
  objPos: Vec3,
  earthPos: Vec3,
  targetHelio: Vec3,
  distance: number
): Vec3 {
  // SOFA iauLd 参数对应关系:
  // p = objPos / distance (observer to source, unit vector)
  // e = earthPos / |earthPos| (Sun to observer, unit vector) — 注意: earthPos 就是从太阳到地球
  // q = targetHelio / |targetHelio| (Sun to source, unit vector)
  // em = |earthPos| (Sun to observer distance, AU)

  const em = Math.sqrt(earthPos[0] * earthPos[0] + earthPos[1] * earthPos[1] + earthPos[2] * earthPos[2]);
  const e: Vec3 = [earthPos[0] / em, earthPos[1] / em, earthPos[2] / em];

  const p: Vec3 = [objPos[0] / distance, objPos[1] / distance, objPos[2] / distance];

  const targetDist = Math.sqrt(
    targetHelio[0] * targetHelio[0] + targetHelio[1] * targetHelio[1] + targetHelio[2] * targetHelio[2]
  );
  const q: Vec3 = [targetHelio[0] / targetDist, targetHelio[1] / targetDist, targetHelio[2] / targetDist];

  // qdqpe = q · (q + e) = 1 + q·e
  // 当星体在太阳后面: q·e ≈ -1, qdqpe ≈ 0 (偏折最大)
  // 当星体在太阳前面: q·e ≈ +1, qdqpe ≈ 2 (偏折最小)
  const qDotE = q[0] * e[0] + q[1] * e[1] + q[2] * e[2];
  let qdqpe = 1.0 + qDotE;

  // 太阳视半径 sin 值（用于圆盘内衰减）
  const sunRadiusSin = SUN_RADIUS_KM / (em * AU_KM);
  // deflection limiter: dlim = phi²/2 where phi = solar angular radius
  const dlim = sunRadiusSin * sunRadiusSin / 2.0;

  // Enclosed mass fraction: 太阳圆盘内平滑衰减
  let emf = 1.0;
  if (qdqpe < dlim * 2) {
    // 目标非常接近太阳方向，计算 impact factor
    const pDotE = p[0] * e[0] + p[1] * e[1] + p[2] * e[2];
    // 从观测者看，目标和太阳的角距的 sin 值
    const impactFactor = Math.sqrt(Math.max(0, 1.0 - pDotE * pDotE));
    if (impactFactor < sunRadiusSin) {
      const x = impactFactor / sunRadiusSin;
      emf = (x * 1.05) / (x + 0.05);
    }
  }

  // 应用 limiter (SOFA 的 dlim 机制) 和 enclosed mass fraction
  qdqpe = Math.max(qdqpe, dlim) ;

  // w = 2GM / (em * c² * qdqpe) = SRS / (em * qdqpe)
  // 乘以 bm=1 (太阳质量) 和 emf
  const w = (SRS_AU / em / qdqpe) * emf;

  // 偏折方向: p × (e × q)
  // e × q
  const eXq: Vec3 = [
    e[1] * q[2] - e[2] * q[1],
    e[2] * q[0] - e[0] * q[2],
    e[0] * q[1] - e[1] * q[0]
  ];
  // p × (e × q)
  const pXeXq: Vec3 = [
    p[1] * eXq[2] - p[2] * eXq[1],
    p[2] * eXq[0] - p[0] * eXq[2],
    p[0] * eXq[1] - p[1] * eXq[0]
  ];

  // p1 = p + w * p×(e×q)
  const p1: Vec3 = [
    p[0] + w * pXeXq[0],
    p[1] + w * pXeXq[1],
    p[2] + w * pXeXq[2]
  ];

  // 归一化后恢复距离
  const p1Len = Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);
  return [
    (p1[0] / p1Len) * distance,
    (p1[1] / p1Len) * distance,
    (p1[2] / p1Len) * distance
  ];
}
