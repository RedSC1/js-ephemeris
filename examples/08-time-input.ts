/**
 * 示例 8: 时间输入方式
 * 
 * 展示各种传入时间的方式，以及历史日期的正确处理。
 */
import { Ephemeris } from '../src/engine.js';
import { EphemerisTime } from '../src/time.js';

const eph = new Ephemeris();

async function main() {
  console.log('=== 时间输入方式 ===\n');

  // ===== 方式 1: Date 对象 (最常用) =====
  // Date 内部存的是 UTC 时间戳，不受本地时区影响
  const date = new Date('2024-06-15T12:00:00Z');  // 明确 UTC
  const s1 = await eph.geocentricState('mar', date);
  console.log(`Date 对象: 火星黄经 = ${s1.lon.toFixed(4)}°`);

  // ===== 方式 2: JD 数字 (当作 UT) =====
  // 2451545.0 = J2000.0 = 2000-01-01 12:00 UT
  const s2 = await eph.geocentricState('mar', 2451545.0);
  console.log(`JD(UT) 数字: 火星黄经 = ${s2.lon.toFixed(4)}°`);

  // ===== 方式 3: EphemerisTime.fromCalendar (推荐历史日期) =====
  // 不经过 JS Date，不受 IANA 历史时区影响
  // 参数: year, month, day, hour, minute, second, timezone
  const t3 = EphemerisTime.fromCalendar(1900, 1, 1, 12, 0, 0, 8);  // 北京时间
  const s3 = await eph.geocentricState('mar', t3);
  console.log(`fromCalendar(1900, 北京时间): 火星黄经 = ${s3.lon.toFixed(4)}°`);

  // ===== 方式 4: EphemerisTime.fromTT (从力学时创建) =====
  // 如果你已经有 JD(TT)，用这个避免被当成 UT
  const t4 = EphemerisTime.fromTT(2451545.0);  // J2000.0 in TT
  const s4 = await eph.geocentricState('mar', t4);
  console.log(`fromTT(J2000): 火星黄经 = ${s4.lon.toFixed(4)}°`);

  // ===== 对比: UT vs TT 的差异 =====
  console.log('\n=== UT vs TT 差异 ===\n');
  const tUT = new EphemerisTime(2451545.0);           // 当作 UT
  const tTT = EphemerisTime.fromTT(2451545.0);        // 当作 TT
  console.log(`同一个数字 2451545.0:`);
  console.log(`  当 UT: jdTT = ${tUT.jdTT.toFixed(6)}, deltaT = ${tUT.deltaT.toFixed(2)}s`);
  console.log(`  当 TT: jdUT = ${tTT.jdUT.toFixed(6)}, deltaT = ${tTT.deltaT.toFixed(2)}s`);
  console.log(`  差异: ${(Math.abs(tUT.jdTT - 2451545.0) * 86400).toFixed(1)} 秒`);

  // ===== 历史日期注意事项 =====
  console.log('\n=== 历史日期注意 ===\n');
  console.log('⚠️  不要用 new Date(1900, 0, 1) 处理 1949 年前的中国时间！');
  console.log('    JS 会用历史时区 UTC+8:05:43 而不是 UTC+8');
  console.log('    用 EphemerisTime.fromCalendar(1900, 1, 1, 0, 0, 0, 8) 代替');
}

main().catch(console.error);
