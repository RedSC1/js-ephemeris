import type { Vec3 } from '../types.js';

const PI2 = 2 * Math.PI;

// ==========================================
// 基础 3D 矩阵运算
// ==========================================

export type Matrix3x3 = number[][];

/** 矩阵乘矢量：v_out = M * v_in */
export function mulMatVec(m: Matrix3x3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}

/** 矩阵乘矩阵：M_out = M1 * M2 */
export function matMul(m1: Matrix3x3, m2: Matrix3x3): Matrix3x3 {
  const out: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i][j] = m1[i][0] * m2[0][j] + m1[i][1] * m2[1][j] + m1[i][2] * m2[2][j];
    }
  }
  return out;
}

/** 绕 X 轴旋转矩阵 (右手系) */
export function rotX(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c]
  ];
}

/** 绕 Y 轴旋转矩阵 (右手系) */
export function rotY(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c]
  ];
}

/** 绕 Z 轴旋转矩阵 (右手系) */
export function rotZ(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
}

// ==========================================
// 传统的 J2000 固定转换 (保留备用)
// ==========================================

const ECL_TO_EQ = [
  [1.0, 0.00000044036, -0.000000190919],
  [-0.000000479966, 0.917482137087, -0.397776982902],
  [0.0, 0.397776982902, 0.917482137087],
] as const;

const EQ_TO_ECL = [
  [1.0, -0.000000479966, 0.0],
  [0.00000044036, 0.917482137087, 0.397776982902],
  [-0.000000190919, -0.397776982902, 0.917482137087],
] as const;

export function eclipticJ2000ToEquatorialJ2000(position: Vec3): Vec3 {
  const [x, y, z] = position;
  return [
    ECL_TO_EQ[0][0] * x + ECL_TO_EQ[0][1] * y + ECL_TO_EQ[0][2] * z,
    ECL_TO_EQ[1][0] * x + ECL_TO_EQ[1][1] * y + ECL_TO_EQ[1][2] * z,
    ECL_TO_EQ[2][0] * x + ECL_TO_EQ[2][1] * y + ECL_TO_EQ[2][2] * z,
  ];
}

export function equatorialJ2000ToEclipticJ2000(position: Vec3): Vec3 {
  const [x, y, z] = position;
  return [
    EQ_TO_ECL[0][0] * x + EQ_TO_ECL[0][1] * y + EQ_TO_ECL[0][2] * z,
    EQ_TO_ECL[1][0] * x + EQ_TO_ECL[1][1] * y + EQ_TO_ECL[1][2] * z,
    EQ_TO_ECL[2][0] * x + EQ_TO_ECL[2][1] * y + EQ_TO_ECL[2][2] * z,
  ];
}

export function rectToSpherical(position: Vec3): Vec3 {
  const [x, y, z] = position;
  const radius = Math.hypot(x, y, z);
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(z, Math.hypot(x, y));
  return [lon, lat, radius];
}

export function sphericalToRect(lon: number, lat: number, radius: number): Vec3 {
  const rCosLat = radius * Math.cos(lat);
  return [
    rCosLat * Math.cos(lon),
    rCosLat * Math.sin(lon),
    radius * Math.sin(lat),
  ];
}

export function wrapAngleRad(angle: number): number {
  return ((angle + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
}
