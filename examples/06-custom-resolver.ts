/**
 * 示例 6: 自定义解析器（扩展天体支持）
 * 
 * 通过实现 PositionResolver 接口，可以注册任意天体数据源。
 */
import { Ephemeris } from '../src/engine.js';
import type { PositionResolver, ResolverResult } from '../src/manifest/types.js';
import type { BodyTag } from '../src/types.js';

/**
 * 示例：一个简单的圆轨道解析器
 * 用于演示如何注册自定义天体
 */
class CircularOrbitResolver implements PositionResolver {
  name = 'circular-orbit';
  priority = 10; // 低优先级，作为 fallback

  private bodies: Record<string, { a: number; period: number; incl: number }> = {
    // 假想天体 "vulcan"：0.1 AU 圆轨道
    'vulcan': { a: 0.1, period: 15.0, incl: 0.05 },
  };

  canResolve(tag: BodyTag, jd: number): boolean {
    return tag in this.bodies;
  }

  async resolve(tag: BodyTag, jd: number): Promise<ResolverResult | null> {
    const body = this.bodies[tag];
    if (!body) return null;

    // 简单圆轨道
    const t = (jd - 2451545.0) / body.period; // 轨道周期数
    const angle = 2 * Math.PI * t;
    const x = body.a * Math.cos(angle);
    const y = body.a * Math.sin(angle) * Math.cos(body.incl);
    const z = body.a * Math.sin(angle) * Math.sin(body.incl);

    return {
      state: [x, y, z],
      source: 'kepler',
      precision: 'arcmin',
      center: 'sun',
      frame: 'equatorial'
    };
  }
}

async function main() {
  const eph = new Ephemeris();

  // 注册自定义解析器
  eph.registerResolver(new CircularOrbitResolver());

  // 现在可以查询自定义天体
  const pos = await eph.position('vulcan', 2451545.0);
  console.log('Vulcan 位置:', pos.xyz);
  console.log('数据来源:', pos.source);
  console.log('精度:', pos.precision);

  // 内置天体仍然正常工作（优先级更高）
  const mars = await eph.position('mar', 2451545.0);
  console.log('\n火星位置:', mars.xyz);
  console.log('数据来源:', mars.source);
}

main().catch(console.error);
