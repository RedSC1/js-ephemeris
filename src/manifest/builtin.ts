import type { BodyTag, Vec3, StateVec } from '../types.js';
import type { PositionResolver, ResolverResult } from './types.js';
import { parseOPM2, evalOPM2 } from '../decode/opm2.js';
import type { OPM2CenturyData } from '../decode/opm2.js';
import { decodeBuiltinData } from '../loader/builtin.js';
import { BUILTIN_MANIFEST } from './builtin-manifest.js';
import type { BuiltinEntry } from './builtin-manifest.js';

/**
 * 内置解析器：负责处理 1800-2100 年的 Base64 硬编码数据
 */
export class BuiltinResolver implements PositionResolver {
  name = 'builtin';
  priority = 50;

  // 内存缓存：key 格式为 "tag:jdStart"
  private cache = new Map<string, OPM2CenturyData>();

  canResolve(tag: BodyTag, jd: number): boolean {
    const entries = BUILTIN_MANIFEST[tag];
    if (!entries) return false;
    return entries.some(e => jd >= e.jdStart && jd < e.jdEnd);
  }

  async resolve(tag: BodyTag, jd: number, options?: any): Promise<ResolverResult | null> {
    const entries = BUILTIN_MANIFEST[tag];
    if (!entries) return null;

    const entry = entries.find(e => jd >= e.jdStart && jd < e.jdEnd);
    if (!entry) return null;

    const data = await this.loadCenturyData(tag, entry);
    if (!data) return null;

    const computeVelocity = options?.computeVelocity === true;
    const state = evalOPM2(jd, data, null, computeVelocity);

    return {
      state,
      source: 'builtin',
      precision: 'high',
      center: tag === 'moon' ? 'earth' : 'sun',
      frame: 'equatorial'
    };
  }

  private async loadCenturyData(tag: BodyTag, entry: BuiltinEntry): Promise<OPM2CenturyData | null> {
    const cacheKey = `${tag}:${entry.jdStart}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    try {
      // 动态导入数据文件
      // 注意：这里假设构建工具（如 Vite/Rollup）能识别这种动态路径
      const module = await import(`../data/builtin/${tag}.js`);
      const base64 = module[entry.variable];
      
      if (!base64) {
        throw new Error(`找不到变量 ${entry.variable} 在文件 ../data/builtin/${tag}.js 中`);
      }

      const buffer = await decodeBuiltinData(base64);
      const data = parseOPM2(buffer);
      
      this.cache.set(cacheKey, data);
      return data;
    } catch (e) {
      console.error(`加载内置数据失败 [${tag}, ${entry.jdStart}]:`, e);
      return null;
    }
  }
}
