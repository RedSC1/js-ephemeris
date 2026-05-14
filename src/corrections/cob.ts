/**
 * Center-of-Body (COB) 形心修正
 * 
 * DE441 中外行星的位置是系统质心（barycenter），包含了所有卫星的质量贡献。
 * COB 修正提供从系统质心到行星本体的偏移向量。
 * 
 * 行星本体位置 = 系统质心位置 - COB偏移
 * 
 * 支持的天体: jupiter, saturn, uranus, neptune, pluto
 * 偏移量级: 最大 ~0.088" (Pluto)
 */
import type { Vec3, StateVec, BodyTag } from '../types.js';
import type { DataLoader } from '../loader/interface.js';
import { parseOPM2, evalOPM2 } from '../decode/opm2.js';
import type { OPM2CenturyData } from '../decode/opm2.js';
import { LRUCache } from '../cache.js';

/**
 * COB manifest 条目
 */
export interface COBManifestEntry {
  jdStart: number;
  jdEnd: number;
  /** 相对于 loader baseUrl 的文件路径 */
  path: string;
}

/**
 * COB manifest: 描述可用的形心修正数据
 */
export type COBManifest = Record<string, COBManifestEntry[]>;

/** 支持 COB 修正的天体 */
const COB_BODIES = new Set(['jup', 'sat', 'ura', 'nep', 'plu']);

/** tag 到 COB 数据目录名的映射 */
const COB_DIR_MAP: Record<string, string> = {
  'jup': 'jupiter',
  'sat': 'saturn',
  'ura': 'uranus',
  'nep': 'neptune',
  'plu': 'pluto',
};

export interface COBProviderOptions {
  loader: DataLoader;
  manifest: COBManifest;
  cacheSize?: number;
}

/**
 * COB 修正提供者
 */
export class COBProvider {
  private loader: DataLoader;
  private manifest: COBManifest;
  private cache: LRUCache<string, OPM2CenturyData>;
  private loading = new Map<string, Promise<OPM2CenturyData | null>>();

  constructor(options: COBProviderOptions) {
    this.loader = options.loader;
    this.manifest = options.manifest;
    this.cache = new LRUCache(options.cacheSize ?? 16);
  }

  /**
   * 检查某天体是否支持 COB 修正
   */
  static hasCOB(tag: BodyTag): boolean {
    return COB_BODIES.has(tag);
  }

  /**
   * 获取 COB 偏移向量 (J2000 equatorial, AU)
   * 
   * @throws 如果数据不可用
   */
  async getOffset(tag: BodyTag, jd: number, computeVelocity: boolean = false): Promise<Vec3 | StateVec> {
    if (!COB_BODIES.has(tag)) {
      throw new Error(`No COB data exists for '${tag}'. Only jupiter, saturn, uranus, neptune, pluto have COB corrections.`);
    }

    const entries = this.manifest[tag];
    if (!entries || entries.length === 0) {
      throw new Error(`COB manifest has no entries for '${tag}'. Check your COB manifest configuration.`);
    }

    const entry = entries.find(e => jd >= e.jdStart && jd < e.jdEnd);
    if (!entry) {
      throw new Error(`COB data not available for '${tag}' at JD ${jd}. Data coverage: JD ${entries[0]!.jdStart} to ${entries[entries.length - 1]!.jdEnd}.`);
    }

    const data = await this.loadData(entry);
    if (!data) {
      throw new Error(`Failed to load COB data for '${tag}' from '${entry.path}'.`);
    }

    return evalOPM2(jd, data, null, computeVelocity);
  }

  private async loadData(entry: COBManifestEntry): Promise<OPM2CenturyData | null> {
    const cacheKey = entry.path;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // 并发请求合并
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey)!;
    }

    const promise = this.doLoad(entry);
    this.loading.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  private async doLoad(entry: COBManifestEntry): Promise<OPM2CenturyData | null> {
    try {
      const buffer = await this.loader.load(entry.path);
      const data = parseOPM2(buffer);
      this.cache.set(entry.path, data);
      return data;
    } catch (e) {
      console.error(`COB data load failed [${entry.path}]:`, e);
      return null;
    }
  }
}

/**
 * 生成默认的 COB manifest（1800-2100，标准文件命名）
 */
export function generateDefaultCOBManifest(): COBManifest {
  const jdRanges: [number, number][] = [
    [2378495, 2415020],
    [2415020, 2451545],
    [2451545, 2488070],
  ];

  const manifest: COBManifest = {};
  for (const [tag, dir] of Object.entries(COB_DIR_MAP)) {
    manifest[tag] = jdRanges.map(([jdStart, jdEnd]) => ({
      jdStart,
      jdEnd,
      path: `cob/${dir}/${dir}_cob_${jdStart}_${jdEnd}.bin.gz`,
    }));
  }
  return manifest;
}
