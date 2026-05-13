import { BodyTag, EphemerisResult, Vec3, StateVec } from './types.js';
import { EphemerisTime, EphemerisTimeOptions } from './time.js';
import { PositionResolver, DeltaTProvider } from './manifest/types.js';
import { deltaTByJD } from './corrections/delta-t.js';
import { BuiltinResolver } from './manifest/builtin.js';
import { rectToSpherical } from './math/coords.js';

export interface EphemerisOptions {
  /** 数据 CDN 基础路径 */
  baseUrl?: string;
  /** 自定义 Delta-T 提供者 */
  deltaTProvider?: DeltaTProvider;
  /** 初始解析器列表 */
  resolvers?: PositionResolver[];
}

/**
 * js-ephemeris 主引擎（调度器）
 */
export class Ephemeris {
  private resolvers: PositionResolver[] = [];
  private deltaTProvider: DeltaTProvider;

  constructor(options?: EphemerisOptions) {
    this.deltaTProvider = options?.deltaTProvider ?? deltaTByJD;
    
    if (options?.resolvers) {
      options.resolvers.forEach(r => this.registerResolver(r));
    }

    // 默认注册内置解析器
    this.registerResolver(new BuiltinResolver());
  }

  /**
   * 注册一个新的解析器，并按优先级重新排序
   */
  registerResolver(resolver: PositionResolver) {
    this.resolvers.push(resolver);
    this.resolvers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取天体位置
   */
  async position(
    tag: BodyTag, 
    timeInput: number | Date | EphemerisTime,
    options?: any
  ): Promise<EphemerisResult> {
    const time = this.normalizeTime(timeInput);
    
    for (const resolver of this.resolvers) {
      if (resolver.canResolve(tag, time.jdTT)) {
        const result = await resolver.resolve(tag, time.jdTT, options);
        if (result) {
          const xyz = result.state.slice(0, 3) as Vec3;
          return {
            xyz,
            body: tag,
            jd: time.jdTT,
            precision: result.precision,
            lbr: () => rectToSpherical(xyz)
          };
        }
      }
    }

    throw new Error(`无法找到解析器来计算天体 ${tag} 在 JD ${time.jdTT} 的位置`);
  }

  /**
   * 获取天体完整状态 (位置 + 速度)
   */
  async state(
    tag: BodyTag,
    timeInput: number | Date | EphemerisTime,
    options?: any
  ): Promise<StateVec> {
    const time = this.normalizeTime(timeInput);
    for (const resolver of this.resolvers) {
      if (resolver.canResolve(tag, time.jdTT)) {
        const result = await resolver.resolve(tag, time.jdTT, { ...options, computeVelocity: true });
        if (result) return result.state as StateVec;
      }
    }
    throw new Error(`无法计算 ${tag} 的状态向量`);
  }

  /**
   * 内部方法：将各种输入转为标准的 EphemerisTime 对象
   */
  private normalizeTime(input: number | Date | EphemerisTime): EphemerisTime {
    if (input instanceof EphemerisTime) return input;
    
    const options: EphemerisTimeOptions = {
      deltaTProvider: this.deltaTProvider
    };

    if (input instanceof Date) {
      return EphemerisTime.fromDate(input, options);
    } else {
      return new EphemerisTime(input, options);
    }
  }
}
