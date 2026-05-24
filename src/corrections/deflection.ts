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

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function norm(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

function unitWithDerivative(pos: Vec3, vel: Vec3): { unit: Vec3; len: number; lenDot: number; unitDot: Vec3 } {
  const len = norm(pos);
  const unit = scale(pos, 1 / len);
  const lenDot = dot(unit, vel);
  const unitDot: Vec3 = [
    (vel[0] - unit[0] * lenDot) / len,
    (vel[1] - unit[1] * lenDot) / len,
    (vel[2] - unit[2] * lenDot) / len,
  ];
  return { unit, len, lenDot, unitDot };
}

export interface DeflectionVelocityResult {
  pos: Vec3;
  vel: Vec3;
}

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
  return applyDeflectionWithVelocity(
    objPos,
    [0, 0, 0],
    earthPos,
    [0, 0, 0],
    targetHelio,
    [0, 0, 0],
    distance,
    0,
  ).pos;
}

/**
 * 太阳引力偏折修正及其时间导数。
 */
export function applyDeflectionWithVelocity(
  objPos: Vec3,
  objVel: Vec3,
  earthPos: Vec3,
  earthVel: Vec3,
  targetHelio: Vec3,
  targetHelioVel: Vec3,
  distance: number,
  distSpeed: number,
): DeflectionVelocityResult {
  const earth = unitWithDerivative(earthPos, earthVel);
  const e = earth.unit;
  const eDot = earth.unitDot;
  const em = earth.len;
  const emDot = earth.lenDot;

  const pState = unitWithDerivative(objPos, objVel);
  const p = pState.unit;
  const pDot = pState.unitDot;

  const qState = unitWithDerivative(targetHelio, targetHelioVel);
  const q = qState.unit;
  const qDot = qState.unitDot;

  const qDotE = dot(q, e);
  const qDotEDot = dot(qDot, e) + dot(q, eDot);
  const rawQdqpe = 1.0 + qDotE;
  const rawQdqpeDot = qDotEDot;

  const sunRadiusSin = SUN_RADIUS_KM / (em * AU_KM);
  const sunRadiusSinDot = -sunRadiusSin * emDot / em;
  const dlim = sunRadiusSin * sunRadiusSin / 2.0;
  const dlimDot = sunRadiusSin * sunRadiusSinDot;

  let emf = 1.0;
  let emfDot = 0.0;
  if (rawQdqpe < dlim * 2) {
    const pDotE = dot(p, e);
    const pDotEDot = dot(pDot, e) + dot(p, eDot);
    const impactSquared = Math.max(0, 1.0 - pDotE * pDotE);
    const impactFactor = Math.sqrt(impactSquared);
    let impactFactorDot = 0;
    if (impactFactor > 0) {
      impactFactorDot = -pDotE * pDotEDot / impactFactor;
    }
    if (impactFactor < sunRadiusSin) {
      const x = impactFactor / sunRadiusSin;
      const xDot = (impactFactorDot * sunRadiusSin - impactFactor * sunRadiusSinDot) / (sunRadiusSin * sunRadiusSin);
      emf = (x * 1.05) / (x + 0.05);
      emfDot = (1.05 * 0.05 * xDot) / ((x + 0.05) * (x + 0.05));
    }
  }

  const qdqpe = Math.max(rawQdqpe, dlim);
  const qdqpeDot = rawQdqpe >= dlim ? rawQdqpeDot : dlimDot;
  const a = SRS_AU / (em * qdqpe);
  const aDot = a * (-emDot / em - qdqpeDot / qdqpe);
  const w = a * emf;
  const wDot = aDot * emf + a * emfDot;

  const eXq = cross(e, q);
  const eXqDot = add(cross(eDot, q), cross(e, qDot));
  const pXeXq = cross(p, eXq);
  const pXeXqDot = add(cross(pDot, eXq), cross(p, eXqDot));

  const p1 = add(p, scale(pXeXq, w));
  const p1Dot = add(pDot, add(scale(pXeXq, wDot), scale(pXeXqDot, w)));
  const p1State = unitWithDerivative(p1, p1Dot);
  const p1Unit = p1State.unit;
  const p1UnitDot = p1State.unitDot;

  return {
    pos: scale(p1Unit, distance),
    vel: [
      p1Unit[0] * distSpeed + p1UnitDot[0] * distance,
      p1Unit[1] * distSpeed + p1UnitDot[1] * distance,
      p1Unit[2] * distSpeed + p1UnitDot[2] * distance,
    ],
  };
}
