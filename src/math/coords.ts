// @ts-nocheck
import type { Vec3 } from '../types.js';

const PI2 = 2 * Math.PI;
const ASEC2RAD = Math.PI / (180 * 3600);

export const J2000_MEAN_OBLIQUITY = 84381.406 * ASEC2RAD;
export const FRAME_BIAS_DX = -0.016617 * ASEC2RAD;
export const FRAME_BIAS_DE = -0.0068192 * ASEC2RAD;
export const FRAME_BIAS_DR = -0.0146 * ASEC2RAD;

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

export function transposeMat(m: Matrix3x3): Matrix3x3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
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
// J2000 frame-bias aware conversions
// ==========================================

export function frameBiasMatrix(): Matrix3x3 {
  return matMul(matMul(rotX(-FRAME_BIAS_DE), rotY(FRAME_BIAS_DX)), rotZ(FRAME_BIAS_DR));
}

export function equatorialJ2000ToEclipticJ2000Matrix(): Matrix3x3 {
  return matMul(rotX(-J2000_MEAN_OBLIQUITY), frameBiasMatrix());
}

export function eclipticJ2000ToEquatorialJ2000(position: Vec3): Vec3 {
  return mulMatVec(transposeMat(equatorialJ2000ToEclipticJ2000Matrix()), position);
}

export function equatorialJ2000ToEclipticJ2000(position: Vec3): Vec3 {
  return mulMatVec(equatorialJ2000ToEclipticJ2000Matrix(), position);
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
