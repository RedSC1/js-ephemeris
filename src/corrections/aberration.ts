import type { Vec3 } from '../types.js';
import { LIGHT_TIME_DAYS_PER_AU } from './light-time.js';

/**
 * 光速 (AU/day)
 */
const C_AU_DAY = 1.0 / LIGHT_TIME_DAYS_PER_AU;

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

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
  return applyAberrationWithVelocity(pos, [0, 0, 0], earthVel, [0, 0, 0], distance).pos;
}

export interface AberrationVelocityResult {
  pos: Vec3;
  vel: Vec3;
}

/**
 * 相对论光行差修正及其时间导数。
 */
export function applyAberrationWithVelocity(
  pos: Vec3,
  vel: Vec3,
  earthVel: Vec3,
  earthAcc: Vec3,
  distance: number,
): AberrationVelocityResult {
  const invD = 1 / distance;
  const u: Vec3 = [pos[0] * invD, pos[1] * invD, pos[2] * invD];
  const distDot = dot(u, vel);
  const uDot: Vec3 = [
    (vel[0] - u[0] * distDot) * invD,
    (vel[1] - u[1] * distDot) * invD,
    (vel[2] - u[2] * distDot) * invD,
  ];

  const invC = 1 / C_AU_DAY;
  const beta: Vec3 = [earthVel[0] * invC, earthVel[1] * invC, earthVel[2] * invC];
  const betaDot: Vec3 = [earthAcc[0] * invC, earthAcc[1] * invC, earthAcc[2] * invC];

  const beta2 = dot(beta, beta);
  const invGamma = Math.sqrt(1 - beta2);
  const invGammaDot = -dot(beta, betaDot) / invGamma;
  const uDotBeta = dot(u, beta);
  const uDotBetaDot = dot(uDot, beta) + dot(u, betaDot);
  const q = 1 + invGamma;
  const f = uDotBeta / q;
  const fDot = (uDotBetaDot * q - uDotBeta * invGammaDot) / (q * q);

  const denom = 1 + uDotBeta;
  const denomDot = uDotBetaDot;
  const n: Vec3 = [
    u[0] * invGamma + beta[0] + f * beta[0],
    u[1] * invGamma + beta[1] + f * beta[1],
    u[2] * invGamma + beta[2] + f * beta[2],
  ];
  const nDot: Vec3 = [
    uDot[0] * invGamma + u[0] * invGammaDot + betaDot[0] + fDot * beta[0] + f * betaDot[0],
    uDot[1] * invGamma + u[1] * invGammaDot + betaDot[1] + fDot * beta[1] + f * betaDot[1],
    uDot[2] * invGamma + u[2] * invGammaDot + betaDot[2] + fDot * beta[2] + f * betaDot[2],
  ];

  const w: Vec3 = [n[0] / denom, n[1] / denom, n[2] / denom];
  const wDot: Vec3 = [
    (nDot[0] * denom - n[0] * denomDot) / (denom * denom),
    (nDot[1] * denom - n[1] * denomDot) / (denom * denom),
    (nDot[2] * denom - n[2] * denomDot) / (denom * denom),
  ];

  const len = Math.sqrt(dot(w, w));
  const up: Vec3 = [w[0] / len, w[1] / len, w[2] / len];
  const upDotWDot = dot(up, wDot);
  const upDot: Vec3 = [
    (wDot[0] - up[0] * upDotWDot) / len,
    (wDot[1] - up[1] * upDotWDot) / len,
    (wDot[2] - up[2] * upDotWDot) / len,
  ];

  return {
    pos: [up[0] * distance, up[1] * distance, up[2] * distance],
    vel: [
      up[0] * distDot + upDot[0] * distance,
      up[1] * distDot + upDot[1] * distance,
      up[2] * distDot + upDot[2] * distance,
    ],
  };
}

/**
 * @deprecated Use applyAberrationWithVelocity.
 */
export function applyAberrationToVelocity(
  vel: Vec3,
  pos: Vec3,
  earthVel: Vec3,
  distance: number
): Vec3 {
  return applyAberrationWithVelocity(pos, vel, earthVel, [0, 0, 0], distance).vel;
}
