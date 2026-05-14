/**
 * 示例 3: 站心观测（地平坐标）
 * 
 * 从地球表面某个位置观测天体，获取赤经赤纬、方位角高度角。
 * 包含站心视差、大气折射等修正。
 */
import { Ephemeris } from '../src/engine.js';
import { SkyObserver } from '../src/observer.js';

const eph = new Ephemeris();

// 北京观测者
const observer = new SkyObserver(eph, {
  lat: 39.9042,    // 纬度 (°)
  lon: 116.4074,   // 经度 (°)
  alt: 50          // 海拔 (m)
});

async function main() {
  const date = new Date('2024-06-15T20:00:00+08:00'); // 北京时间晚8点

  console.log('=== 北京 2024-06-15 20:00 CST 天空 ===\n');
  console.log('天体     赤经(h)    赤纬(°)    方位(°)    高度(°)');
  console.log('─'.repeat(55));

  const bodies = ['moon', 'mar', 'jup', 'sat', 'ven'] as const;

  for (const tag of bodies) {
    const result = await observer.observe(tag, date, {
      pressure: 1013.25,   // 标准大气压 → 开启折射修正
      temperature: 25,     // 25°C
    });

    const raHours = (result.ra * 12 / Math.PI + 24) % 24;
    const decDeg = result.dec * 180 / Math.PI;
    const azDeg = result.azimuth * 180 / Math.PI;
    const altDeg = result.altitude * 180 / Math.PI;

    const visible = altDeg > 0 ? '' : ' (地平线下)';
    console.log(
      `${tag.padEnd(6)}  ${raHours.toFixed(3).padStart(7)}h  ${decDeg.toFixed(2).padStart(7)}°  ${azDeg.toFixed(2).padStart(7)}°  ${altDeg.toFixed(2).padStart(6)}°${visible}`
    );
  }

  // 不含折射 vs 含折射对比
  console.log('\n=== 月球: 折射修正效果 ===\n');
  const withRefraction = await observer.observe('moon', date, { pressure: 1013.25, temperature: 25 });
  const noRefraction = await observer.observe('moon', date);
  const diff = (withRefraction.altitude - noRefraction.altitude) * 180 / Math.PI * 3600;
  console.log(`含折射高度: ${(withRefraction.altitude * 180 / Math.PI).toFixed(4)}°`);
  console.log(`无折射高度: ${(noRefraction.altitude * 180 / Math.PI).toFixed(4)}°`);
  console.log(`折射修正量: ${diff.toFixed(1)}"`);
}

main().catch(console.error);
