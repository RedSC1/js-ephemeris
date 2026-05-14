/**
 * 示例 2: 地心视黄道状态（占星核心功能）
 * 
 * 获取天体的地心真黄经、黄纬、速度，判断逆行。
 * 默认包含光行时和光行差修正。
 */
import { Ephemeris } from '../src/engine.js';

const eph = new Ephemeris();

async function main() {
  const date = new Date('2024-12-06T00:00:00Z'); // 火星逆行期间

  console.log('=== 2024-12-06 各天体地心视黄道状态 ===\n');
  
  const bodies = ['sun', 'moon', 'mer', 'ven', 'mar', 'jup', 'sat', 'ura', 'nep', 'plu'] as const;
  
  console.log('天体     黄经(°)      黄纬(°)    速度(°/day)  逆行');
  console.log('─'.repeat(60));

  for (const tag of bodies) {
    const state = await eph.geocentricState(tag, date);
    const flag = state.retrograde ? '◀ R' : '';
    console.log(
      `${tag.padEnd(6)}  ${state.lon.toFixed(4).padStart(10)}  ${state.lat.toFixed(4).padStart(8)}  ${state.lonSpeed.toFixed(6).padStart(11)}  ${flag}`
    );
  }

  // 小行星
  console.log('\n=== 小行星 ===\n');
  const asteroids = ['ceres', 'chiron', 'lilith'] as const;
  for (const tag of asteroids) {
    const state = await eph.geocentricState(tag, date);
    console.log(`${tag.padEnd(8)} λ=${state.lon.toFixed(4)}° v=${state.lonSpeed.toFixed(4)}°/day ${state.retrograde ? 'R' : ''}`);
  }

  // 关闭修正对比
  console.log('\n=== 火星: 视位置 vs 几何位置 ===\n');
  const apparent = await eph.geocentricState('mar', date);
  const geometric = await eph.geocentricState('mar', date, { lightTime: false, aberration: false });
  console.log(`视黄经:   ${apparent.lon.toFixed(6)}°`);
  console.log(`几何黄经: ${geometric.lon.toFixed(6)}°`);
  console.log(`差值:     ${((apparent.lon - geometric.lon) * 3600).toFixed(2)}" (光行时+光行差)`);
}

main().catch(console.error);
