import type { BodyTag, EphemerisResult, Vec3, StateVec } from './types.js';
import { EphemerisTime } from './time.js';
import type { EphemerisTimeOptions } from './time.js';
import type { PositionResolver, DeltaTProvider, PrecessionProvider, NutationProvider } from './manifest/types.js';
import { deltaTByJD } from './corrections/delta-t.js';
import { BuiltinResolver } from './manifest/builtin.js';
import { 
  rectToSpherical, 
  equatorialJ2000ToEclipticJ2000, 
  eclipticJ2000ToEquatorialJ2000,
  mulMatVec,
  matMul,
  rotX,
  rotY,
  rotZ
} from './math/coords.js';
import { Vondrak2011Provider } from './corrections/precession/v11-algorithm.js';
import { IAU2000BProvider } from './corrections/nutation/iau2000b-algorithm.js';

export interface EphemerisOptions {
  /** 数据 CDN 基础路径 */
  baseUrl?: string;
  /** 自定义 Delta-T 提供者 */
  deltaTProvider?: DeltaTProvider;
  /** 初始解析器列表 */
  resolvers?: PositionResolver[];
  /** 岁差模型提供者 */
  precessionProvider?: PrecessionProvider;
  /** 章动模型提供者 */
  nutationProvider?: NutationProvider;
}

/**
 * js-ephemeris 主引擎（调度器）
 */
export class Ephemeris {
  private resolvers: PositionResolver[] = [];
  private deltaTProvider: DeltaTProvider;
  private precessionProvider: PrecessionProvider;
  private nutationProvider: NutationProvider;

  constructor(options?: EphemerisOptions) {
    this.deltaTProvider = options?.deltaTProvider ?? deltaTByJD;
    this.precessionProvider = options?.precessionProvider ?? new Vondrak2011Provider();
    this.nutationProvider = options?.nutationProvider ?? new IAU2000BProvider();
    
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
          const rawXyz = result.state.slice(0, 3) as Vec3;
          
          // 获取当期岁差和章动参数
          const pMat = this.precessionProvider.getMatrix(time.jdTT);
          const nut = this.nutationProvider.getNutation(time.jdTT);

          // 构造章动矩阵 (直接三角函数展开，避免 R1·R3·R1 级联的参考系不兼容问题)
          const cobm = Math.cos(nut.mobl), sobm = Math.sin(nut.mobl);
          const cobt = Math.cos(nut.tobl), sobt = Math.sin(nut.tobl);
          const cpsi = Math.cos(nut.dpsi), spsi = Math.sin(nut.dpsi);
          const nMat = [
            [cpsi,            -spsi * cobm,                    -spsi * sobm],
            [spsi * cobt,      cpsi * cobm * cobt + sobm * sobt, cpsi * sobm * cobt - cobm * sobt],
            [spsi * sobt,      cpsi * cobm * sobt - sobm * cobt, cpsi * sobm * sobt + cobm * cobt]
          ];

          // 构造总的平->真赤道旋转矩阵: NP = N * P
          const npMat = matMul(nMat, pMat);

          // 闭包内的纯函数：从基准的 ICRF/GCRS 赤道坐标 (rawXyz) 转换到任意 5 种坐标系之一
          const getPosForFrame = (targetFrame: string, basePos: Vec3): Vec3 => {
            if (targetFrame === 'ICRF / J2000 Equatorial') return basePos;
            if (targetFrame === 'J2000 Mean Equatorial') {
              // ICRF/GCRS → 动力学 J2000 mean equator (经过 frame bias)
              // 使用 pMat 中已包含的 bias，但这里需要单独的 bias 矩阵
              // Frame bias: B 矩阵 (一阶近似, IERS 2010 Eqs. 5.21, 5.33)
              const DX = -0.016617 * 4.848136811095359935899141e-6;
              const DE = -0.0068192 * 4.848136811095359935899141e-6;
              const DR = -0.0146 * 4.848136811095359935899141e-6;
              return [
                basePos[0] - basePos[1] * DR + basePos[2] * DX,
                basePos[0] * DR + basePos[1] + basePos[2] * DE,
                -basePos[0] * DX - basePos[1] * DE + basePos[2]
              ];
            }
            if (targetFrame === 'J2000 Ecliptic') {
              // ICRF → frame bias → 动力学 J2000 equatorial → ε₀ 旋转 → 动力学 J2000 ecliptic
              const meanEq = getPosForFrame('J2000 Mean Equatorial', basePos);
              return equatorialJ2000ToEclipticJ2000(meanEq);
            }
            
            const trueEqPos = mulMatVec(npMat, basePos);
            if (targetFrame === 'True Equator of Date') return trueEqPos;
            if (targetFrame === 'True Ecliptic of Date') return mulMatVec(rotX(nut.tobl), trueEqPos);
            
            if (targetFrame === 'Horizontal') return basePos;

            return basePos; // 理论上不可达
          };

          // 内部工厂函数：根据目标参考系生成结果对象
          const createResult = (frameStr: string, centerStr: string, currentRawPos: Vec3): EphemerisResult => {
            const pos = getPosForFrame(frameStr, currentRawPos);
            return {
              xyz: pos,
              body: tag,
              jdTT: time.jdTT,
              jdUT: time.jdUT,
              deltaT: time.deltaT,
              center: centerStr,
              frame: frameStr,
              precision: result.precision,
              lbr: () => rectToSpherical(pos),
              toTrueEcliptic: () => frameStr === 'True Ecliptic of Date' ? createResult(frameStr, centerStr, currentRawPos) : createResult('True Ecliptic of Date', centerStr, currentRawPos),
              toTrueEquatorial: () => frameStr === 'True Equator of Date' ? createResult(frameStr, centerStr, currentRawPos) : createResult('True Equator of Date', centerStr, currentRawPos),
              toJ2000Ecliptic: () => frameStr === 'J2000 Ecliptic' ? createResult(frameStr, centerStr, currentRawPos) : createResult('J2000 Ecliptic', centerStr, currentRawPos),
              toJ2000Equatorial: () => frameStr === 'ICRF / J2000 Equatorial' ? createResult(frameStr, centerStr, currentRawPos) : createResult('ICRF / J2000 Equatorial', centerStr, currentRawPos),
              toJ2000MeanEquatorial: () => frameStr === 'J2000 Mean Equatorial' ? createResult(frameStr, centerStr, currentRawPos) : createResult('J2000 Mean Equatorial', centerStr, currentRawPos),
              
              toGeocentric: async () => {
                if (centerStr === 'earth') return createResult(frameStr, centerStr, currentRawPos);
                // 获取地球在同一时刻的 J2000 坐标
                const earthRes = await this.position('ear', time);
                const earthRaw = earthRes.toJ2000Equatorial().xyz;
                // 矢量减法: 目标地心 = 目标日心 - 地球日心
                const geoRawPos: Vec3 = [
                  currentRawPos[0] - earthRaw[0],
                  currentRawPos[1] - earthRaw[1],
                  currentRawPos[2] - earthRaw[2]
                ];
                return createResult(frameStr, 'earth', geoRawPos);
              },
              
              toHeliocentric: async () => {
                if (centerStr === 'sun') return createResult(frameStr, centerStr, currentRawPos);
                if (centerStr !== 'earth') throw new Error('Unsupported center conversion');
                
                const earthRes = await this.position('ear', time);
                const earthRaw = earthRes.toJ2000Equatorial().xyz;
                // 矢量加法: 目标日心 = 目标地心 + 地球日心
                const helioRawPos: Vec3 = [
                  currentRawPos[0] + earthRaw[0],
                  currentRawPos[1] + earthRaw[1],
                  currentRawPos[2] + earthRaw[2]
                ];
                return createResult(frameStr, 'sun', helioRawPos);
              }
            };
          };

          // 引擎默认返回当期真黄道坐标 (大多数现代历法和占星应用的默认选择)
          return createResult('True Ecliptic of Date', result.center, rawXyz);
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
   * 获取指定时刻的岁差矩阵
   */
  getPrecessionMatrix(jdTT: number): number[][] {
    return this.precessionProvider.getMatrix(jdTT);
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
