import type { Vec3 } from '../types.js';

/**
 * 太阳引力偏折常数 (Schwarzschild radius): 2 * G * M_sun / c^2，单位：AU
 */
const SCHWARZSCHILD_RADIUS_AU = 1.97412574336e-8;

/**
 * 太阳圆盘边缘的 cos(角距) 阈值，约对应 0.26° 视半径
 * 在此阈值以内线性衰减偏折量，防止目标穿越太阳圆盘时出现方向跳变
 */
const GRAZING_THRESHOLD = -0.9999897;

/**
 * 太阳引力偏折修正 (Gravitational Deflection)
 * 
 * 光线经过太阳附近时路径弯曲，最大偏折量约 1.75" (掠日)。
 * 在太阳圆盘内部应用线性衰减，避免不连续跳变。
 * 
 * @param objPos 目标地心位置向量 (J2000/ICRF, AU)
 * @param earthPos 地球日心位置向量 (J2000/ICRF, AU)，用于确定太阳方向
 * @param distance 目标地心距离 (AU)
 * @returns 偏折修正后的位置向量
 */
export function applyDeflection(objPos: Vec3, earthPos: Vec3, distance: number): Vec3 {
  // 观测者(地球)到太阳的向量 = -earthPos (因为数据是日心的)
  const sunVec: Vec3 = [-earthPos[0], -earthPos[1], -earthPos[2]];
  const E = Math.sqrt(sunVec[0] * sunVec[0] + sunVec[1] * sunVec[1] + sunVec[2] * sunVec[2]);
  const q: Vec3 = [sunVec[0] / E, sunVec[1] / E, sunVec[2] / E]; // 指向太阳的单位向量

  const p: Vec3 = [objPos[0] / distance, objPos[1] / distance, objPos[2] / distance]; // 指向目标的单位向量

  const pDotQ = p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

  // 目标几乎正好在太阳背后 (cos ≈ -1)，偏折公式发散，跳过
  if (pDotQ <= -0.99999999) {
    return objPos;
  }

  // 平滑系数：太阳外部为 1.0，太阳圆盘内部从边缘线性衰减到中心的 0
  let attenuationFactor = 1.0;
  if (pDotQ < GRAZING_THRESHOLD) {
    attenuationFactor = (1.0 + pDotQ) / (1.0 + GRAZING_THRESHOLD);
  }

  const factor = (SCHWARZSCHILD_RADIUS_AU / E / (1.0 + pDotQ)) * attenuationFactor;

  const dp: Vec3 = [
    factor * (q[0] - pDotQ * p[0]),
    factor * (q[1] - pDotQ * p[1]),
    factor * (q[2] - pDotQ * p[2])
  ];

  // 加上偏折修正，归一化后恢复原始距离
  const pDeflected: Vec3 = [p[0] + dp[0], p[1] + dp[1], p[2] + dp[2]];
  const pDefLen = Math.sqrt(
    pDeflected[0] * pDeflected[0] + pDeflected[1] * pDeflected[1] + pDeflected[2] * pDeflected[2]
  );

  return [
    (pDeflected[0] / pDefLen) * distance,
    (pDeflected[1] / pDefLen) * distance,
    (pDeflected[2] / pDefLen) * distance
  ];
}
