/**
 * 示例 4: 完整状态向量（位置 + 速度）
 * 
 * 获取天体的 6 分量状态向量 [x, y, z, vx, vy, vz]。
 * 位置单位 AU，速度单位 AU/day。
 */
import { Ephemeris } from '../src/engine.js';

const eph = new Ephemeris();

async function main() {
  // J2000.0 时刻
  const jd = 2451545.0;

  console.log('=== J2000.0 各天体状态向量 (日心 ICRF) ===\n');

  const bodies = ['mer', 'ven', 'ear', 'mar', 'jup'] as const;

  for (const tag of bodies) {
    const state = await eph.state(tag, jd);
    const [x, y, z, vx, vy, vz] = state;
    
    const r = Math.sqrt(x * x + y * y + z * z);
    const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

    console.log(`${tag}:`);
    console.log(`  位置: [${x.toFixed(8)}, ${y.toFixed(8)}, ${z.toFixed(8)}] AU`);
    console.log(`  速度: [${vx.toFixed(8)}, ${vy.toFixed(8)}, ${vz.toFixed(8)}] AU/day`);
    console.log(`  距离: ${r.toFixed(6)} AU, 速率: ${(v * 149597870.7 / 86400).toFixed(2)} km/s`);
    console.log('');
  }

  // 月球（地心状态）
  const moonState = await eph.state('moon', jd);
  const [mx, my, mz] = moonState;
  const moonDist = Math.sqrt(mx * mx + my * my + mz * mz) * 149597870.7;
  console.log(`moon (地心):`);
  console.log(`  距离: ${moonDist.toFixed(0)} km`);
}

main().catch(console.error);
