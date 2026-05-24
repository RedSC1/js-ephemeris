import type { Observer, Vec3 } from '../types.js';

const DEG_TO_RAD = Math.PI / 180.0;
const AU_KM = 149597870.7;

// IERS 2010 参考椭球体参数
const EARTH_RADIUS_KM = 6378.1366;
const EARTH_FLATTENING = 1.0 / 298.25642;

/**
 * 计算地球自转角 (Earth Rotation Angle, ERA)
 * IAU 2006 标准，精度极高。
 * 
 * @param jdUT 世界时 (UT1) 的儒略日
 * @returns ERA (弧度)
 */
export function earthRotationAngle(jdUT: number): number {
  const tU = jdUT - 2451545.0;
  // 按照 IAU 2006 (Capitaine et al. 2000) 公式计算
  // theta(tU) = 2 * PI * (0.7790572732640 + 1.00273781191135448 * tU)
  const frac = (0.7790572732640 + 1.00273781191135448 * tU) % 1.0;
  return (frac >= 0 ? frac : frac + 1.0) * 2 * Math.PI;
}

/**
 * 根据经纬度和海拔，计算观测者在“当期真赤道系”下的地心坐标向量 (单位：AU)
 * 
 * 基于 WGS84 / IERS 2010 椭球体几何，
 * 以及 IAU 2006 ERA 旋转角度。
 */
export function getObserverGeocentricVector(obs: Observer, jdUT: number): Vec3 {
  const lonRad = obs.lon * DEG_TO_RAD;
  const latRad = obs.lat * DEG_TO_RAD;
  const altKm = (obs.alt ?? 0) / 1000.0;

  const a = EARTH_RADIUS_KM;
  const f = EARTH_FLATTENING;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const oneMinusF = 1.0 - f;

  // 椭球体几何系数
  const c = 1.0 / Math.sqrt(cosLat * cosLat + oneMinusF * oneMinusF * sinLat * sinLat);
  const s = oneMinusF * oneMinusF * c;

  // 计算地心极坐标 rho*cos(phi') 和 rho*sin(phi')
  const rhoCosPhiPrime = (a * c + altKm) * cosLat;
  const rhoSinPhiPrime = (a * s + altKm) * sinLat;

  // 计算当前的地球自转角
  const era = earthRotationAngle(jdUT);

  // 观测者所在的本地恒星时角度 (Local Apparent Sidereal Time 简化等效)
  const theta = era + lonRad;

  // 转换为 3D 笛卡尔坐标 (单位: AU)
  const x = (rhoCosPhiPrime * Math.cos(theta)) / AU_KM;
  const y = (rhoCosPhiPrime * Math.sin(theta)) / AU_KM;
  const z = (rhoSinPhiPrime) / AU_KM;

  return [x, y, z];
}

export function getObserverGeocentricVelocity(obs: Observer, jdUT: number): Vec3 {
  const pos = getObserverGeocentricVector(obs, jdUT);
  const omega = 2 * Math.PI * 1.00273781191135448;
  return [-omega * pos[1], omega * pos[0], 0];
}
