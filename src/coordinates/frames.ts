import type { CoordFrame, Vec3 } from '../types.js';
import {
  J2000_MEAN_OBLIQUITY,
  frameBiasMatrix,
  matMul,
  mulMatVec,
  rotX,
  transposeMat,
} from '../math/coords.js';
import type { Matrix3x3 } from '../math/coords.js';

export interface NutationAngles {
  dpsi: number;
  deps: number;
  mobl: number;
  tobl: number;
}

export interface FrameTransformContext {
  precessionMatrix: Matrix3x3;
  nutation: NutationAngles;
}

export function identityMatrix(): Matrix3x3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

export function transposeMatrix(matrix: Matrix3x3): Matrix3x3 {
  return transposeMat(matrix);
}

export { frameBiasMatrix } from '../math/coords.js';

export function nutationMatrix(nutation: NutationAngles): Matrix3x3 {
  const cobm = Math.cos(nutation.mobl), sobm = Math.sin(nutation.mobl);
  const cobt = Math.cos(nutation.tobl), sobt = Math.sin(nutation.tobl);
  const cpsi = Math.cos(nutation.dpsi), spsi = Math.sin(nutation.dpsi);
  return [
    [cpsi, -spsi * cobm, -spsi * sobm],
    [spsi * cobt, cpsi * cobm * cobt + sobm * sobt, cpsi * sobm * cobt - cobm * sobt],
    [spsi * sobt, cpsi * cobm * sobt - sobm * cobt, cpsi * sobm * sobt + cobm * cobt],
  ];
}

export function matrixFromIcrfToFrame(frame: CoordFrame, context: FrameTransformContext): Matrix3x3 {
  switch (frame) {
    case 'ICRF / J2000 Equatorial':
      return identityMatrix();
    case 'J2000 Mean Equatorial':
      return frameBiasMatrix();
    case 'J2000 Ecliptic':
      return matMul(rotX(-J2000_MEAN_OBLIQUITY), frameBiasMatrix());
    case 'True Equator of Date':
      return matMul(nutationMatrix(context.nutation), context.precessionMatrix);
    case 'True Ecliptic of Date':
      return matMul(rotX(-context.nutation.tobl), matMul(nutationMatrix(context.nutation), context.precessionMatrix));
    default:
      throw new Error(`Unsupported coordinate frame: ${frame}`);
  }
}

export function projectIcrfToFrame(vector: Vec3, frame: CoordFrame, context: FrameTransformContext): Vec3 {
  return mulMatVec(matrixFromIcrfToFrame(frame, context), vector);
}

export function convertFrame(
  vector: Vec3,
  from: CoordFrame,
  to: CoordFrame,
  context: FrameTransformContext,
): Vec3 {
  const fromMatrix = matrixFromIcrfToFrame(from, context);
  const toMatrix = matrixFromIcrfToFrame(to, context);
  return mulMatVec(toMatrix, mulMatVec(transposeMatrix(fromMatrix), vector));
}
