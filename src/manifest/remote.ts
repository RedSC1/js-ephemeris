/**
 * 远程数据解析器
 * 
 * 通过 DataLoader 按需加载 OPM2/OPV2 数据文件。
 * 支持任意时间范围（取决于远程数据覆盖）。
 */
import type { BodyTag, Vec3, StateVec } from '../types.js';
import type { PositionResolver, ResolverResult } from './types.js';
import type { DataLoader } from '../loader/interface.js';
import { parseOPM2, evalOPM2 } from '../decode/opm2.js';
import type { OPM2CenturyData } from '../decode/opm2.js';
import { parseOPV2, evalOPV2 } from '../decode/opv2.js';
import type { OPV2CenturyData } from '../decode/opv2.js';
import { LRUCache } from '../cache.js';

type CenturyData = OPM2CenturyData | OPV2CenturyData;

/**
 * 远程 manifest 条目
 */
export interface RemoteManifestEntry {
  jdStart: number;
  jdEnd: number;
  /** 相对于 loader baseUrl 的文件路径，如 'ceres/ceres_2378495_2415020.bin.gz' */
  path: string;
}

/**
 * 远程 manifest：描述远程数据源覆盖的天体和时间范围
 */
export type RemoteManifest = Record<string, RemoteManifestEntry[]>;

export interface RemoteResolverOptions {
  /** 数据加载器 */
  loader: DataLoader;
  /** 远程 manifest（描述可用数据） */
  manifest: RemoteManifest;
  /** LRU 缓存容量，默认 32 */
  cacheSize?: number;
}

/**
 * 远程解析器：通过 DataLoader 按需加载数据
 * 优先级 40（低于内置 50，高于 fallback 10）
 */
export class RemoteResolver implements PositionResolver {
  name = 'remote';
  priority = 40;

  private loader: DataLoader;
  private manifest: RemoteManifest;
  private cache: LRUCache<string, CenturyData>;
  private loading = new Map<string, Promise<CenturyData | null>>();

  constructor(options: RemoteResolverOptions) {
    this.loader = options.loader;
    this.manifest = options.manifest;
    this.cache = new LRUCache(options.cacheSize ?? 32);
  }

  canResolve(tag: BodyTag, jd: number): boolean {
    const entries = this.manifest[tag];
    if (!entries) return false;
    return entries.some(e => jd >= e.jdStart && jd < e.jdEnd);
  }

  async resolve(tag: BodyTag, jd: number, options?: any): Promise<ResolverResult | null> {
    const entries = this.manifest[tag];
    if (!entries) return null;

    const entry = entries.find(e => jd >= e.jdStart && jd < e.jdEnd);
    if (!entry) return null;

    const data = await this.loadData(entry);
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
      source: data.magic === 'OPV2' ? 'opv2' as const : 'opm2' as const,
      precision: 'milliarcsec' as const,
      center: tag === 'moon' ? 'earth' : 'sun',
      frame: 'ICRF / J2000 Equatorial' as const
    };
  }

  private async loadData(entry: RemoteManifestEntry): Promise<CenturyData | null> {
    const cacheKey = entry.path;

    // 1. 查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // 2. 防止重复加载同一文件（并发请求合并）
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey)!;
    }

    // 3. 加载
    const promise = this.doLoad(entry);
    this.loading.set(cacheKey, promise);

    try {
      const data = await promise;
      return data;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  private async doLoad(entry: RemoteManifestEntry): Promise<CenturyData | null> {
    try {
      const buffer = await this.loader.load(entry.path);

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

      this.cache.set(entry.path, data);
      return data;
    } catch (e) {
      console.error(`远程数据加载失败 [${entry.path}]:`, e);
      return null;
    }
  }
}
