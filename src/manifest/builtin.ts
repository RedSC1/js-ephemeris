import type { BodyTag, Vec3, StateVec } from '../types.js';
import type { PositionResolver, ResolverResult } from './types.js';
import { parseOPM2, evalOPM2 } from '../decode/opm2.js';
import type { OPM2CenturyData, OPM2ReferenceData } from '../decode/opm2.js';
import { parseOPV2, evalOPV2 } from '../decode/opv2.js';
import type { OPV2CenturyData } from '../decode/opv2.js';
import { decodeBuiltinData } from '../loader/builtin.js';
import { BUILTIN_MANIFEST } from './builtin-manifest.js';
import type { BuiltinEntry } from './builtin-manifest.js';

/** 解析后的世纪数据（OPM2 或 OPV2） */
type CenturyData = OPM2CenturyData | OPV2CenturyData;

/**
 * 从参考轨道二进制数据中解析出 OPM2ReferenceData
 * OPR2 格式: magic(4) + version(1) + bodyId(1) + nCoeffs(1) + reserved(1) + refCx(nCoeffs×float64) + refCy(nCoeffs×float64)
 * 文件中存储的是 float64 Chebyshev 系数（km 单位），需要除以 QUANT_UNIT 量化为整数
 */
function parseReferenceOrbit(buffer: ArrayBuffer): OPM2ReferenceData {
  const view = new DataView(buffer);
  // magic(4) + version(1) + bodyId(1) = 6 bytes
  const nCoeffs = view.getUint8(6); // byte 6 = nCoeffs (27 for Mercury, deg=26)
  // byte 7 = reserved
  const degXY = nCoeffs - 1;
  const QUANT_UNIT = 0.04; // Mercury quantization unit (km)
  
  const refCxInt = new Int32Array(nCoeffs);
  const refCyInt = new Int32Array(nCoeffs);
  let offset = 8;
  for (let i = 0; i < nCoeffs; i++) {
    refCxInt[i] = Math.round(view.getFloat64(offset, true) / QUANT_UNIT);
    offset += 8;
  }
  for (let i = 0; i < nCoeffs; i++) {
    refCyInt[i] = Math.round(view.getFloat64(offset, true) / QUANT_UNIT);
    offset += 8;
  }
  return { degXY, refCxInt, refCyInt };
}

/**
 * 内置解析器：负责处理 1800-2100 年的 Base64 硬编码数据
 * 自动根据文件 magic 识别 OPM2 / OPV2 格式
 */
export class BuiltinResolver implements PositionResolver {
  name = 'builtin';
  priority = 50;

  // 内存缓存：key 格式为 "tag:jdStart"
  private cache = new Map<string, CenturyData>();
  // 水星参考轨道缓存
  private mercuryRef: OPM2ReferenceData | null = null;

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
      // 水星需要参考轨道
      const ref = (tag === 'mer') ? await this.getMercuryRef() : null;
      state = evalOPM2(jd, data, ref, computeVelocity);
    }

    return {
      state,
      source: data.magic === 'OPV2' ? 'opv2' as const : 'opm2' as const,
      precision: 'milliarcsec' as const,
      center: tag === 'moon' ? 'earth' : 'sun',
      frame: 'ICRF / J2000 Equatorial' as const
    };
  }

  private async getMercuryRef(): Promise<OPM2ReferenceData | null> {
    if (this.mercuryRef) return this.mercuryRef;
    try {
      const module = await import('../data/builtin/mercury.js');
      const base64 = module.mercury_ref_bin_gz_base64;
      if (!base64) return null;
      const buffer = await decodeBuiltinData(base64);
      this.mercuryRef = parseReferenceOrbit(buffer);
      return this.mercuryRef;
    } catch (e) {
      console.error('加载水星参考轨道失败:', e);
      return null;
    }
  }

  private async loadCenturyData(tag: BodyTag, entry: BuiltinEntry): Promise<CenturyData | null> {
    const cacheKey = `${tag}:${entry.jdStart}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    try {
      // emb 和 ear 共用同一个数据文件; mer 使用 mercury 文件（含参考轨道）
      const fileTag = tag === 'emb' ? 'ear' : tag === 'mer' ? 'mercury' : tag;
      const module = await import(`../data/builtin/${fileTag}.js`);
      const base64 = module[entry.variable];
      
      if (!base64) {
        throw new Error(`找不到变量 ${entry.variable} 在文件 ../data/builtin/${fileTag}.js 中`);
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
