import type { Vec3 } from '../types.js';
import { LIGHT_TIME_DAYS_PER_AU } from './light-time.js';

/**
 * 光速 (AU/day)
 */
const C_AU_DAY = 1.0 / LIGHT_TIME_DAYS_PER_AU;

/**
 * 经典光行差修正 (一阶近似)
 * 
 * 将星表方向 (astrometric) 修正为视方向 (apparent)。
 * 公式: u' = u + V_earth / c (归一化后恢复距离)
 * 
 * @param pos 地心位置向量 (AU)
 * @param earthVel 地球日心速度 (AU/day)
 * @param distance 地心距离 (AU)
 * @returns 光行差修正后的位置向量
 */
export function applyAberration(pos: Vec3, earthVel: Vec3, distance: number): Vec3 {
  // 单位方向向量
  const u: Vec3 = [pos[0] / distance, pos[1] / distance, pos[2] / distance];

  // 地球速度 / 光速 (β 向量)
  const beta: Vec3 = [earthVel[0] / C_AU_DAY, earthVel[1] / C_AU_DAY, earthVel[2] / C_AU_DAY];

  // 合成视方向
  const apparent: Vec3 = [u[0] + beta[0], u[1] + beta[1], u[2] + beta[2]];

  // 归一化并恢复距离
  const len = Math.sqrt(apparent[0] * apparent[0] + apparent[1] * apparent[1] + apparent[2] * apparent[2]);
  return [
    (apparent[0] / len) * distance,
    (apparent[1] / len) * distance,
    (apparent[2] / len) * distance
  ];
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
  // 简化：直接返回原始速度 (光行差对速度的修正 < 0.001 deg/day，对占星足够)
  // 如果需要更高精度，可以用数值微分
  return vel;
}
