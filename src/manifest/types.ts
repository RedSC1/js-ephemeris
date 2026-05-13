import { BodyTag, Vec3, StateVec, PrecisionLevel, CoordFrame } from '../types.js';
import { EphemerisTime } from '../time.js';

/**
 * 状态向量计算结果
 */
export interface ResolverResult {
  /** 位置 (+速度) */
  state: Vec3 | StateVec;
  /** 数据来源名称 (如 'opm2', 'vsop87', 'spk') */
  source: string;
  /** 精度等级 */
  precision: PrecisionLevel;
  /** 坐标系中心 */
  center: string;
  /** 坐标系参考系 */
  frame: CoordFrame;
}

/**
 * 位置解析器接口
 * 任何能够提供天体位置的模块（OPM2, SPK, VSOP87）都必须实现此接口
 */
export interface PositionResolver {
  /** 解析器唯一名称 */
  name: string;
  /** 
   * 优先级。数值越大越优先被调用。
   * 建议：SPK(100), Builtin(50), Remote(40), Fallback(10)
   */
  priority: number;

  /**
   * 询问解析器是否能处理该请求
   */
  canResolve(tag: BodyTag, jd: number): boolean;

  /**
   * 执行计算
   */
  resolve(tag: BodyTag, jd: number, options?: any): Promise<ResolverResult | null>;
}

/**
 * Delta-T 提供者函数类型
 * 给定 UT 儒略日，返回秒数
 */
export type DeltaTProvider = (jdUT: number) => number;
