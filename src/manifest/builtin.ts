import { BodyTag, Vec3, StateVec } from '../types.js';
import { PositionResolver, ResolverResult } from './types.js';
import { parseOPM2, evalOPM2, OPM2CenturyData } from '../decode/opm2.js';

/**
 * 内置解析器：负责处理 1800-2100 年的 Base64 硬编码数据
 */
export class BuiltinResolver implements PositionResolver {
  name = 'builtin';
  priority = 50; // 默认优先级，高于 Fallback，低于 SPK

  // 内存缓存：存放已解码的 OPM2 数据对象
  private cache = new Map<string, OPM2CenturyData>();

  canResolve(tag: BodyTag, jd: number): boolean {
    // 检查 JD 是否在 1800-2100 范围内
    // JD 2378496.5 是 1800-01-01
    // JD 2488128.5 是 2100-01-01
    if (jd < 2378496.5 || jd > 2488128.5) return false;
    
    // 检查我们是否有该天体的数据（占位，待填充具体映射）
    return this.hasData(tag);
  }

  async resolve(tag: BodyTag, jd: number, options?: any): Promise<ResolverResult | null> {
    const data = await this.getData(tag);
    if (!data) return null;

    const computeVelocity = options?.computeVelocity === true;
    const state = evalOPM2(jd, data, null, computeVelocity);

    return {
      state,
      source: 'builtin',
      precision: 'high',
      center: 'sun', // 绝大多数内置天体是日心，月球除外（需额外处理）
      frame: 'equatorial'
    };
  }

  private hasData(tag: BodyTag): boolean {
    const supported = ['mer', 'ven', 'ear', 'mar', 'jup', 'sat', 'ura', 'nep', 'plu', 'moon'];
    return supported.includes(tag);
  }

  private async getData(tag: BodyTag): Promise<OPM2CenturyData | null> {
    if (this.cache.has(tag)) return this.cache.get(tag)!;

    // TODO: 这里需要根据 tag 动态 import 对应的 .ts 数据文件
    // 比如：const module = await import(`../data/${tag}.js`);
    // 然后调用 base64ToBuffer(module.data)
    
    return null;
  }
}
