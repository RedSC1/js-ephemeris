/**
 * 示例 1: 基本位置查询
 * 
 * 获取天体在指定时刻的位置，支持多种坐标系。
 */
import { Ephemeris } from '../src/engine.js';

const eph = new Ephemeris();

async function main() {
  const date = new Date('2024-03-20T12:00:00Z'); // 2024 春分

  // 日心 J2000 赤道直角坐标 (AU)
  const mars = await eph.position('mar', date);
  console.log('火星日心 J2000 赤道坐标:', mars.xyz);
  console.log('  数据来源:', mars.source);
  console.log('  精度:', mars.precision);

  // 转换为不同坐标系
  const marsEcl = mars.toTrueEcliptic();
  const [lon, lat, r] = marsEcl.lbr();
  console.log(`  真黄道坐标: λ=${(lon * 180 / Math.PI).toFixed(4)}° β=${(lat * 180 / Math.PI).toFixed(4)}° r=${r.toFixed(6)} AU`);

  const marsJ2000Ecl = mars.toJ2000Ecliptic();
  const [lon2, lat2, r2] = marsJ2000Ecl.lbr();
  console.log(`  J2000黄道坐标: λ=${(lon2 * 180 / Math.PI).toFixed(4)}° β=${(lat2 * 180 / Math.PI).toFixed(4)}°`);

  // 地心坐标
  const marsGeo = await mars.toGeocentric();
  console.log('  地心距离:', marsGeo.xyz, 'AU');

  // 太阳位置
  const sun = await eph.position('sun', date);
  const sunGeo = await sun.toGeocentric();
  const [sunLon] = sunGeo.toTrueEcliptic().lbr();
  console.log(`\n太阳地心真黄经: ${(sunLon * 180 / Math.PI).toFixed(4)}°`);
}

main().catch(console.error);
