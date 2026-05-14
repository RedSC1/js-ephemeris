import type { BodyTag, Vec3, StateVec } from '../types.js';
import type { PositionResolver, ResolverResult } from './types.js';
import { parseOPM2, evalOPM2 } from '../decode/opm2.js';
import type { OPM2CenturyData } from '../decode/opm2.js';
import { parseOPV2, evalOPV2 } from '../decode/opv2.js';
import type { OPV2CenturyData } from '../decode/opv2.js';
import { decodeBuiltinData } from '../loader/builtin.js';
import { BUILTIN_MANIFEST } from './builtin-manifest.js';
import type { BuiltinEntry } from './builtin-manifest.js';

/** 解析后的世纪数据（OPM2 或 OPV2） */
type CenturyData = OPM2CenturyData | OPV2CenturyData;

/**
 * 内置解析器：负责处理 1800-2100 年的 Base64 硬编码数据
 * 自动根据文件 magic 识别 OPM2 / OPV2 格式
 */
export class BuiltinResolver implements PositionResolver {
  name = 'builtin';
  priority = 50;

  // 内存缓存：key 格式为 "tag:jdStart"
  private cache = new Map<string, CenturyData>();

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

    let state: Vec3 | StateVec;
    if (data.magic === 'OPV2') {
      state = evalOPV2(jd, data, computeVelocity);
    } else {
      state = evalOPM2(jd, data, null, computeVelocity);
    }

    return {
      state,
      source: 'builtin',
      precision: 'high',
      center: tag === 'moon' ? 'earth' : 'sun',
      frame: 'equatorial'
    };
  }

  private async loadCenturyData(tag: BodyTag, entry: BuiltinEntry): Promise<CenturyData | null> {
    const cacheKey = `${tag}:${entry.jdStart}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    try {
      const module = await import(`../data/builtin/${tag}.js`);
      const base64 = module[entry.variable];
      
      if (!base64) {
        throw new Error(`找不到变量 ${entry.variable} 在文件 ../data/builtin/${tag}.js 中`);
      }

      const buffer = await decodeBuiltinData(base64);

      // 根据 magic 自动选择解码器
      const magic = String.fromCharCode(
        new Uint8Array(buffer)[0]!,
        new Uint8Array(buffer)[1]!,
        new Uint8Array(buffer)[2]!,
        new Uint8Array(buffer)[3]!
      );

      let data: CenturyData;
      if (magic === 'OPV2') {
        data = parseOPV2(buffer);
      } else {
        data = parseOPM2(buffer);
      }
      
      this.cache.set(cacheKey, data);
      return data;
    } catch (e) {
      console.error(`加载内置数据失败 [${tag}, ${entry.jdStart}]:`, e);
      return null;
    }
  }
}
