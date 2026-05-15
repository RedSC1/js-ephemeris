/**
 * 天体标识符
 */
export type BodyTag =
  | 'sun'
  | 'mer' | 'ven' | 'ear' | 'emb' | 'mar' | 'jup' | 'sat' | 'ura' | 'nep' | 'plu'
  | 'moon'
  | 'ceres' | 'pallas' | 'juno' | 'vesta' | 'eros'
  | 'chiron' | 'pholus' | 'nessus' | 'lilith'
  | (string & {});

/**
 * 3D 向量 [x, y, z]
 */
export type Vec3 = [number, number, number];

/**
 * 6分量状态向量 [x, y, z, vx, vy, vz]
 */
export type StateVec = [number, number, number, number, number, number];

export type CoordFrame =
  | 'ICRF / J2000 Equatorial'
  | 'J2000 Mean Equatorial'
  | 'J2000 Ecliptic'
  | 'True Equator of Date'
  | 'True Ecliptic of Date'
  | (string & {});

export type CoordCenter = 'sun' | 'earth' | 'emb' | 'topocentric' | (string & {});

/** 数据来源 */
export type DataSource = 'spk' | 'opm2' | 'opv2' | 'sxwnl' | 'astronomy-engine' | 'kepler' | (string & {});

/** 精度等级 */
export type PrecisionLevel = 'milliarcsec' | 'arcsec' | 'arcmin';

export interface Observer {
  /** 经度 (度)，向东为正 */
  lon: number;
  /** 纬度 (度)，向北为正 */
  lat: number;
  /** 海拔高度 (米)，默认为 0 */
  alt?: number;
}

/**
 * 地心黄道状态
 */
export interface GeocentricEclipticState {
  /** 地心真黄经 (度) [0, 360) */
  lon: number;
  /** 地心真黄纬 (度) [-90, 90] */
  lat: number;
  /** 地心距离 (AU) */
  distance: number;
  /** 黄经速度 (度/天)，负值 = 逆行 */
  lonSpeed: number;
  /** 黄纬速度 (度/天) */
  latSpeed: number;
  /** 径向速度 (AU/天)，正值 = 远离 */
  distSpeed: number;
  /** 是否逆行 */
  retrograde: boolean;
}

export interface EphemerisResult {
  xyz: Vec3;
  body: BodyTag;
  /** 坐标中心：'sun' (日心), 'earth' (地心), 'topocentric' (站心) 等 */
  center: CoordCenter;
  /** 参考系描述：如 'ICRF / J2000 Equatorial' */
  frame: string;

  /** 力学时 Julian Day (JDE) */
  jdTT: number;
  /** 世界时 Julian Day (JD) */
  jdUT: number;
  /** 该时刻的 Delta-T (秒) */
  deltaT: number;
  /** 数据来源 */
  source: DataSource;
  /** 精度等级 */
  precision: PrecisionLevel;
  lbr(): Vec3;
  /** 转换为当期真黄道坐标系 (True Ecliptic of Date) */
  toTrueEcliptic(): EphemerisResult;
  /** 转换为当期真赤道坐标系 (True Equator of Date) */
  toTrueEquatorial(): EphemerisResult;
  /** 转换为 J2000 动力学黄道坐标系 (J2000 Ecliptic, 与 Swiss Eph 一致) */
  toJ2000Ecliptic(): EphemerisResult;
  /** 转换为 ICRF/GCRS 赤道坐标系 (即 DE441 原始参考系) */
  toJ2000Equatorial(): EphemerisResult;
  /** 转换为 J2000 动力学平赤道坐标系 (经过 frame bias，与 Swiss Eph 一致) */
  toJ2000MeanEquatorial(): EphemerisResult;
  /** 转换为地心坐标系 (Geocentric) */
  toGeocentric(): Promise<EphemerisResult>;
  /** 转换为日心坐标系 (Heliocentric) */
  toHeliocentric(): Promise<EphemerisResult>;
}
