import type { Vec3, StateVec } from '../types.js';

/**
 * 光行时常数: 1 AU 对应的光行时 (天)
 */
export const LIGHT_TIME_DAYS_PER_AU = 0.00577551833;

/**
 * Shapiro delay 常数: 2 * GM_sun / c^3 (天)
 */
const SHAPIRO_CONST_DAYS = 9.8509e-6 / 86400;

export interface LightTimeResult {
  /** 光行时修正后的地心位置 (J2000/ICRF) */
  pos: Vec3;
  /** 光行时修正后的地心速度 (J2000/ICRF)，即目标在 t-τ 时刻的速度减去地球在 t 时刻的速度 */
  vel: Vec3;
  /** 光行时 τ (天) */
  tau: number;
  /** 地心距离 (AU) */
  distance: number;
}

/**
 * 光行时迭代修正
 * 
 * 给定观测时刻的地球状态和一个获取目标状态的回调函数，
 * 迭代求解光行时 τ，返回修正后的地心位置和速度。
 * 
 * @param earthPos 观测时刻地球日心位置 (J2000/ICRF, AU)
 * @param earthVel 观测时刻地球日心速度 (J2000/ICRF, AU/day)
 * @param getTargetState 回调：给定 JD(TT)，返回目标的日心状态向量 [x,y,z,vx,vy,vz]
 * @param jdTT 观测时刻 JD(TT)
 * @param enabled 是否启用光行时修正，false 则只算一次几何距离
 */
export async function applyLightTime(
  earthPos: Vec3,
  earthVel: Vec3,
  getTargetState: (jd: number) => Promise<StateVec>,
  jdTT: number,
  enabled: boolean = true
): Promise<LightTimeResult> {
  let tau = 0;
  let iterations = 0;
  let geoPos: Vec3 = [0, 0, 0];
  let geoVel: Vec3 = [0, 0, 0];
  let distance = 0;

  while (true) {
    const jdEval = jdTT - tau;
    const targetState = await getTargetState(jdEval);

    // 地心向量 = 目标日心(t-τ) - 地球日心(t)
    geoPos = [
      targetState[0] - earthPos[0],
      targetState[1] - earthPos[1],
      targetState[2] - earthPos[2]
    ];
    geoVel = [
      targetState[3] - earthVel[0],
      targetState[4] - earthVel[1],
      targetState[5] - earthVel[2]
    ];

    const newDist = Math.sqrt(geoPos[0] * geoPos[0] + geoPos[1] * geoPos[1] + geoPos[2] * geoPos[2]);

    if (!enabled) {
      distance = newDist;
      break;
    }

    const newTau = newDist * LIGHT_TIME_DAYS_PER_AU;

    // Shapiro delay (引力时间延迟)
    const rEarth = Math.sqrt(earthPos[0] * earthPos[0] + earthPos[1] * earthPos[1] + earthPos[2] * earthPos[2]);
    const rTarget = Math.sqrt(
      targetState[0] * targetState[0] + targetState[1] * targetState[1] + targetState[2] * targetState[2]
    );
    const shapiro = SHAPIRO_CONST_DAYS * Math.log(
      (rEarth + rTarget + newDist) / (rEarth + rTarget - newDist)
    );
    const newTauTotal = newTau + shapiro;

    if (Math.abs(newTauTotal - tau) < 1e-12 || iterations > 3) {
      distance = newDist;
      break;
    }
    tau = newTauTotal;
    iterations++;
  }

  return { pos: geoPos, vel: geoVel, tau, distance };
}
