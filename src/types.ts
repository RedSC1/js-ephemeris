/**
 * 天体标识符
 */
export type BodyTag =
  | 'mer' | 'ven' | 'ear' | 'mar' | 'jup' | 'sat' | 'ura' | 'nep' | 'plu'
  | 'moon'
  | 'ceres' | 'pallas' | 'juno' | 'vesta' | 'eros'
  | 'chiron' | 'pholus' | 'nessus' | 'lilith'
  | string;

/**
 * 3D 向量 [x, y, z]
 */
export type Vec3 = [number, number, number];

/**
 * 6分量状态向量 [x, y, z, vx, vy, vz]
 */
export type StateVec = [number, number, number, number, number, number];

export type CoordFrame = 'equatorial' | 'ecliptic';

export type PrecisionLevel = 'high' | 'low';

export interface EphemerisResult {
  xyz: Vec3;
  body: BodyTag;
  jd: number;
  precision: PrecisionLevel;
  lbr(): Vec3;
}
