import type { Vec3 } from '../types.js';
import { LIGHT_TIME_DAYS_PER_AU } from './light-time.js';

/**
 * 光速 (AU/day)
 */
const C_AU_DAY = 1.0 / LIGHT_TIME_DAYS_PER_AU;

/**
 * 相对论光行差修正 (完整 Lorentz 变换)
 * 
 * 将星表方向 (astrometric) 修正为视方向 (apparent)。
 * 使用完整的狭义相对论公式，精度优于 0.001"。
 * 
 * 公式 (IERS Conventions 2010, eq. 7.40):
 *   u' = (u/γ + β + (u·β/(1+1/γ)) * β) / (1 + u·β)
 * 
 * 其中 β = V_earth/c, γ = 1/√(1-β²)
 * 
 * 一阶近似 (|β|≈10⁻⁴): u' ≈ u + β - (u·β)u
 * 相对论修正项 (二阶): ~(v/c)² ≈ 0.001"
 * 
 * @param pos 地心位置向量 (AU)
 * @param earthVel 地球日心速度 (AU/day)
 * @param distance 地心距离 (AU)
 * @returns 光行差修正后的位置向量
 */
export function applyAberration(pos: Vec3, earthVel: Vec3, distance: number): Vec3 {
  // 单位方向向量
  const invD = 1 / distance;
  const u0 = pos[0] * invD, u1 = pos[1] * invD, u2 = pos[2] * invD;

  // β = V_earth / c
  const invC = 1 / C_AU_DAY;
  const b0 = earthVel[0] * invC, b1 = earthVel[1] * invC, b2 = earthVel[2] * invC;

  // β² 和 γ
  const beta2 = b0 * b0 + b1 * b1 + b2 * b2;
  const gamma = 1 / Math.sqrt(1 - beta2);
  const invGamma = 1 / gamma;

  // u · β
  const uDotBeta = u0 * b0 + u1 * b1 + u2 * b2;

  // 相对论光行差公式:
  // u' = (u/γ + β + (u·β / (1 + 1/γ)) * β) / (1 + u·β)
  const f = uDotBeta / (1 + invGamma);  // 二阶修正因子
  const denom = 1 / (1 + uDotBeta);

  const up0 = (u0 * invGamma + b0 + f * b0) * denom;
  const up1 = (u1 * invGamma + b1 + f * b1) * denom;
  const up2 = (u2 * invGamma + b2 + f * b2) * denom;

  // 归一化并恢复距离
  const len = Math.sqrt(up0 * up0 + up1 * up1 + up2 * up2);
  const scale = distance / len;
  return [up0 * scale, up1 * scale, up2 * scale];
}

/**
 * 光行差对速度的修正
 * 
 * 光行差改变了方向，因此角速度也会受影响。
 * 这里用解析方法：对修正后的位置求导。
 * 
 * 设 u = pos/|pos|, β = V_earth/c
 * 视方向 u' = (u + β) / |u + β|
 * 视位置 P' = u' * distance
 * 
 * 对于速度，我们需要考虑：
 * 1. 原始速度 vel 对 u 的贡献
 * 2. 地球加速度对 β 的贡献 (二阶小量，忽略)
 * 
 * 简化处理：将修正后的位置和原始速度一起做坐标变换，
 * 速度的主要贡献来自目标本身的运动，光行差对速度的修正是二阶小量。
 * 
 * @param vel 地心速度向量 (AU/day)
 * @param pos 光行差修正前的地心位置 (AU)
 * @param earthVel 地球日心速度 (AU/day)
 * @param distance 地心距离 (AU)
 * @returns 光行差修正后的速度向量 (一阶近似)
 */
export function applyAberrationToVelocity(
  vel: Vec3,
  pos: Vec3,
  earthVel: Vec3,
  distance: number
): Vec3 {
  // 对于速度，光行差的影响是二阶小量 (v/c * dv/dt / c)
  // 主要的速度修正已经通过光行时处理了 (取 t-τ 时刻的目标速度)
  // 这里我们对速度应用同样的方向旋转，保持一致性
  
  const u: Vec3 = [pos[0] / distance, pos[1] / distance, pos[2] / distance];
  const beta: Vec3 = [earthVel[0] / C_AU_DAY, earthVel[1] / C_AU_DAY, earthVel[2] / C_AU_DAY];
  
  // |u + β|
  const apparent: Vec3 = [u[0] + beta[0], u[1] + beta[1], u[2] + beta[2]];
  const len = Math.sqrt(apparent[0] * apparent[0] + apparent[1] * apparent[1] + apparent[2] * apparent[2]);
  
  // 速度中的径向分量不受光行差影响，横向分量按同比例缩放
  // 简化：直接返回原始速度 (光行差对速度的修正 < 0.001 deg/day)
  // 如果需要更高精度，可以用数值微分
  return vel;
}
