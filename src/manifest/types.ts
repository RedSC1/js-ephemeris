import type { BodyTag, Vec3, StateVec, PrecisionLevel, DataSource, CoordFrame } from '../types.js';
import type { EphemerisTime } from '../time.js';

/**
 * 状态向量计算结果
 */
export interface ResolverResult {
  /** 位置 (+速度) */
  state: Vec3 | StateVec;
  /** 数据来源 */
  source: DataSource;
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

/**
 * 岁差提供者接口
 */
export interface PrecessionProvider {
  /** 模型名称 */
  name: string;
  /** 给定 TT 儒略日，返回从 J2000.0 到该时刻的 3x3 岁差矩阵 */
  getMatrix(jdTT: number): number[][];
}

/**
 * 章动计算结果
 */
export interface NutationResult {
  /** 黄经章动 (dpsi) ，单位：弧度 */
  dpsi: number;
  /** 交角章动 (deps) ，单位：弧度 */
  deps: number;
  /** 平黄赤交角 (mean obliquity) ，单位：弧度 */
  mobl: number;
  /** 真黄赤交角 (true obliquity) ，单位：弧度 */
  tobl: number;
  /** 分点差 (Equation of the Equinoxes) ，单位：弧度 */
  ee: number;
}

/**
 * 章动提供者接口
 */
export interface NutationProvider {
  /** 模型名称 */
  name: string;
  /** 给定 TT 儒略日，返回章动修正量及交角 */
  getNutation(jdTT: number): NutationResult;
}

/**
 * 大气折射提供者接口
 */
export interface RefractionProvider {
  /** 模型名称 */
  name: string;
  /** 
   * 给定真实的几何高度角和气象条件，返回视高度角
   * @param altRad 真实高度角 (弧度)
   * @param pressure 气压 (毫巴/hPa)
   * @param temp 温度 (摄氏度)
   */
  getApparentAltitude(altRad: number, pressure: number, temp: number): number;
}
