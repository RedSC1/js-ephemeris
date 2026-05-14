/**
 * 示例 7: 天体测量学修正选项
 * 
 * 展示如何配置默认修正选项，以及如何临时覆盖。
 */
import { Ephemeris } from '../src/engine.js';

async function main() {
  // ===== 默认配置 =====
  // 不传 astrometric，使用内置默认值：lightTime=true, aberration=true, 其他 false
  const eph = new Ephemeris();
  const mars = await eph.geocentricState('mar', new Date('2024-06-15'));
  console.log('默认配置 (lightTime + aberration):');
  console.log(`  火星黄经: ${mars.lon.toFixed(6)}°\n`);

  // ===== 构造时设全局默认 =====
  // 全开：适合需要最高精度的场景
  const ephPrecise = new Ephemeris({
    astrometric: { lightTime: true, aberration: true, deflection: true }
  });
  const marsPrecise = await ephPrecise.geocentricState('mar', new Date('2024-06-15'));
  console.log('全开 (含引力偏折):');
  console.log(`  火星黄经: ${marsPrecise.lon.toFixed(6)}°`);
  console.log(`  差异: ${((marsPrecise.lon - mars.lon) * 3600).toFixed(3)}" (引力偏折的影响)\n`);

  // ===== 临时覆盖 =====
  // 用全开的引擎，但这次临时关闭所有修正看几何位置
  const marsGeo = await ephPrecise.geocentricState('mar', new Date('2024-06-15'), {
    lightTime: false,
    aberration: false,
    deflection: false
  });
  console.log('临时关闭所有修正 (几何位置):');
  console.log(`  火星黄经: ${marsGeo.lon.toFixed(6)}°`);
  console.log(`  视位置 vs 几何位置差: ${((marsPrecise.lon - marsGeo.lon) * 3600).toFixed(2)}"\n`);

  // ===== 只关一个 =====
  const marsNoAberr = await ephPrecise.geocentricState('mar', new Date('2024-06-15'), {
    aberration: false
  });
  console.log('只关光行差:');
  console.log(`  火星黄经: ${marsNoAberr.lon.toFixed(6)}°`);
  console.log(`  光行差贡献: ${((marsPrecise.lon - marsNoAberr.lon) * 3600).toFixed(2)}"`);
}

main().catch(console.error);
