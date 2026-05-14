import type { BodyTag, EphemerisResult, Vec3, StateVec, GeocentricEclipticState } from './types.js';
import { EphemerisTime } from './time.js';
import type { EphemerisTimeOptions } from './time.js';
import type { PositionResolver, DeltaTProvider, PrecessionProvider, NutationProvider } from './manifest/types.js';
import type { DataLoader } from './loader/interface.js';
import type { RemoteManifest } from './manifest/remote.js';
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
import { applyLightTime } from './corrections/light-time.js';
import { applyAberration } from './corrections/aberration.js';
import { applyDeflection } from './corrections/deflection.js';

/**
 * 天体测量学修正选项 (用于 geocentricState)
 */
export interface AstrometricOptions {
  /** 是否开启光行时修正，默认: true */
  lightTime?: boolean;
  /** 是否开启光行差修正，默认: true */
  aberration?: boolean;
  /** 是否开启引力偏折修正，默认: false (占星应用通常不需要) */
  deflection?: boolean;
  /** 是否应用形心修正 (COB)，将系统质心转为行星本体位置。需要配置 COB 数据源。 */
  cob?: boolean;
}

export interface EphemerisOptions {
  /** 数据 CDN 基础路径 */
  baseUrl?: string;
  /** 自定义数据加载器（与 baseUrl 二选一，loader 优先） */
  loader?: DataLoader;
  /** 远程数据 manifest（描述远程可用数据的时间范围和路径） */
  remoteManifest?: RemoteManifest;
  /** COB (形心修正) 数据 manifest */
  cobManifest?: import('./corrections/cob.js').COBManifest;
  /** LRU 缓存容量，默认 32 */
  cacheSize?: number;
  /** 自定义 Delta-T 提供者 */
  deltaTProvider?: DeltaTProvider;
  /** 初始解析器列表 */
  resolvers?: PositionResolver[];
  /** 岁差模型提供者 */
  precessionProvider?: PrecessionProvider;
  /** 章动模型提供者 */
  nutationProvider?: NutationProvider;
  /** geocentricState 的默认修正选项 */
  astrometric?: AstrometricOptions;
}

/**
 * js-ephemeris 主引擎（调度器）
 */
export class Ephemeris {
  private resolvers: PositionResolver[] = [];
  private deltaTProvider: DeltaTProvider;
  private precessionProvider: PrecessionProvider;
  private nutationProvider: NutationProvider;
  private cobProvider: import('./corrections/cob.js').COBProvider | null = null;
  private engineOptions: EphemerisOptions | undefined;
  private astrometricDefaults: Required<AstrometricOptions>;

  constructor(options?: EphemerisOptions) {
    this.deltaTProvider = options?.deltaTProvider ?? deltaTByJD;
    this.precessionProvider = options?.precessionProvider ?? new Vondrak2011Provider();
    this.nutationProvider = options?.nutationProvider ?? new IAU2000BProvider();
    this.engineOptions = options;
    this.astrometricDefaults = {
      lightTime: true,
      aberration: true,
      deflection: false,
      cob: false,
      ...options?.astrometric
    };
    
    if (options?.resolvers) {
      options.resolvers.forEach(r => this.registerResolver(r));
    }

    // 默认注册内置解析器
    this.registerResolver(new BuiltinResolver());

    // 注册开普勒轨道 fallback（最低优先级，小行星兜底）
    import('./manifest/keplerian.js').then(({ KeplerianResolver }) => {
      this.registerResolver(new KeplerianResolver());
    });

    // 如果提供了 loader 或 baseUrl，注册远程解析器
    if (options?.loader || options?.baseUrl) {
      this.setupRemoteResolver(options);
    }
  }

  /**
   * 延迟设置远程解析器（避免构造函数中 import 循环）
   */
  private async setupRemoteResolver(options: EphemerisOptions): Promise<void> {
    const { RemoteResolver } = await import('./manifest/remote.js');

    let loader: DataLoader;
    if (options.loader) {
      loader = options.loader;
    } else if (options.baseUrl) {
      const { FetchLoader } = await import('./loader/fetch.js');
      loader = new FetchLoader(options.baseUrl);
    } else {
      return;
    }

    if (options.remoteManifest) {
      const resolverOpts: import('./manifest/remote.js').RemoteResolverOptions = {
        loader,
        manifest: options.remoteManifest,
        ...(options.cacheSize !== undefined ? { cacheSize: options.cacheSize } : {})
      };
      this.registerResolver(new RemoteResolver(resolverOpts));
    }
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
    
    // 太阳：日心坐标系下为原点，直接构造结果
    if (tag === 'sun') {
      return this.buildSunResult(time);
    }

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
            if (targetFrame === 'True Ecliptic of Date') return mulMatVec(rotX(-nut.tobl), trueEqPos);
            
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
              source: result.source,
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

    // 太阳：日心坐标系下恒为原点，速度为零
    if (tag === 'sun') {
      return [0, 0, 0, 0, 0, 0];
    }

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
   * 获取天体的地心真黄道状态 (位置 + 速度)
   * 占星应用的核心方法：返回黄经、黄纬、距离及其变化率
   * 
   * 默认包含光行时和光行差修正，返回"视"(apparent) 结果。
   */
  async geocentricState(
    tag: BodyTag,
    timeInput: number | Date | EphemerisTime,
    options?: AstrometricOptions
  ): Promise<GeocentricEclipticState> {
    const opt: Required<AstrometricOptions> = {
      ...this.astrometricDefaults,
      ...options
    };

    const time = this.normalizeTime(timeInput);
    
    // EMB → Earth 修正: 获取地球真实的日心状态
    const earthState = await this.state('ear', time, { computeVelocity: true });
    const moonState = await this.state('moon', time, { computeVelocity: true });
    const MU = 1.0 / (1.0 + 81.3005682); // M_moon / (M_earth + M_moon), DE441 EMRAT
    
    const earthPos: Vec3 = [
      earthState[0] - moonState[0] * MU,
      earthState[1] - moonState[1] * MU,
      earthState[2] - moonState[2] * MU
    ];
    const earthVel: Vec3 = [
      earthState[3] - moonState[3] * MU,
      earthState[4] - moonState[4] * MU,
      earthState[5] - moonState[5] * MU
    ];

    // ----------------------------------------------------
    // 光行时修正: 迭代求解 τ，取目标在 t-τ 时刻的状态
    // ----------------------------------------------------
    const applyCOB = opt.cob === true;
    const getTargetState = async (jd: number): Promise<StateVec> => {
      const s = await this.state(tag, jd, { computeVelocity: true });
      if (applyCOB) {
        const cobOffset = await this.getCOBOffset(tag, jd);
        if (cobOffset) {
          return [
            s[0] - cobOffset[0], s[1] - cobOffset[1], s[2] - cobOffset[2],
            s[3] - (cobOffset[3] ?? 0), s[4] - (cobOffset[4] ?? 0), s[5] - (cobOffset[5] ?? 0)
          ];
        }
      }
      return s;
    };

    const ltResult = await applyLightTime(
      earthPos, earthVel, getTargetState, time.jdTT, opt.lightTime
    );

    let geoPos = ltResult.pos;
    let geoVel = ltResult.vel;
    let distance = ltResult.distance;

    // ----------------------------------------------------
    // 引力偏折修正: 太阳引力导致光线弯曲 (最大 ~1.75")
    // ----------------------------------------------------
    if (opt.deflection && tag !== 'sun') {
      // 目标日心位置 = 地心位置 + 地球日心位置
      const targetHelio: Vec3 = [
        geoPos[0] + earthPos[0],
        geoPos[1] + earthPos[1],
        geoPos[2] + earthPos[2]
      ];
      geoPos = applyDeflection(geoPos, earthPos, targetHelio, distance);
    }

    // ----------------------------------------------------
    // 光行差修正: 经典一阶 P' = P + V_earth/c
    // 对所有太阳系天体适用 (IAU standard: planetary aberration = light-time + stellar aberration)
    // ----------------------------------------------------
    if (opt.aberration) {
      geoPos = applyAberration(geoPos, earthVel, distance);
      // 光行差对速度的影响是二阶小量，主要修正已通过光行时体现
      // (取 t-τ 时刻的目标速度而非 t 时刻)
    }

    // ----------------------------------------------------
    // 岁差+章动矩阵 (J2000 → True Equator of Date)
    // ----------------------------------------------------
    const pMat = this.precessionProvider.getMatrix(time.jdTT);
    const nut = this.nutationProvider.getNutation(time.jdTT);
    
    const cobm = Math.cos(nut.mobl), sobm = Math.sin(nut.mobl);
    const cobt = Math.cos(nut.tobl), sobt = Math.sin(nut.tobl);
    const cpsi = Math.cos(nut.dpsi), spsi = Math.sin(nut.dpsi);
    const nMat = [
      [cpsi,        -spsi * cobm,                     -spsi * sobm],
      [spsi * cobt,  cpsi * cobm * cobt + sobm * sobt, cpsi * sobm * cobt - cobm * sobt],
      [spsi * sobt,  cpsi * cobm * sobt - sobm * cobt, cpsi * sobm * sobt + cobm * cobt]
    ];
    const npMat = matMul(nMat, pMat);
    
    // True Equator → True Ecliptic (绕 x 轴转 -tobl)
    const rEcl = rotX(-nut.tobl);
    
    // 完整变换矩阵: J2000 → True Ecliptic of Date
    const fullMat = matMul(rEcl, npMat);
    
    // 变换位置和速度 (线性变换，矩阵对速度同样适用)
    const eclPos = mulMatVec(fullMat, geoPos);
    const eclVel = mulMatVec(fullMat, geoVel);
    
    // 直角坐标 → 球坐标 + 速度
    const [x, y, z] = eclPos;
    const [vx, vy, vz] = eclVel;
    
    const rxy2 = x * x + y * y;
    const rxy = Math.sqrt(rxy2);
    const r = Math.sqrt(rxy2 + z * z);
    
    // 黄经、黄纬、距离
    let lon = Math.atan2(y, x) * (180 / Math.PI);
    if (lon < 0) lon += 360;
    const lat = Math.atan2(z, rxy) * (180 / Math.PI);
    
    // 黄经速度: d/dt[atan2(y,x)] = (x*vy - y*vx) / (x² + y²)
    const lonSpeed = ((x * vy - y * vx) / rxy2) * (180 / Math.PI); // deg/day
    
    // 黄纬速度: d/dt[atan2(z, sqrt(x²+y²))] = (rxy*vz - z*(x*vx+y*vy)/rxy) / r²
    const latSpeed = ((rxy * vz - z * (x * vx + y * vy) / rxy) / (r * r)) * (180 / Math.PI);
    
    // 径向速度: d/dt[r] = (x*vx + y*vy + z*vz) / r
    const distSpeed = (x * vx + y * vy + z * vz) / r;
    
    return {
      lon,
      lat,
      distance: r,
      lonSpeed,
      latSpeed,
      distSpeed,
      retrograde: lonSpeed < 0
    };
  }

  /**
   * 构造太阳的 EphemerisResult
   * 太阳在日心坐标系下恒为原点，但支持 toGeocentric 等转换
   */
  private buildSunResult(time: EphemerisTime): EphemerisResult {
    const zeroPos: Vec3 = [0, 0, 0];

    const createSunResult = (frameStr: string, centerStr: string, currentRawPos: Vec3): EphemerisResult => {
      return {
        xyz: currentRawPos,
        body: 'sun',
        jdTT: time.jdTT,
        jdUT: time.jdUT,
        deltaT: time.deltaT,
        center: centerStr,
        frame: frameStr,
        source: 'opm2',
        precision: 'milliarcsec',
        lbr: () => rectToSpherical(currentRawPos),
        toTrueEcliptic: () => createSunResult('True Ecliptic of Date', centerStr, currentRawPos),
        toTrueEquatorial: () => createSunResult('True Equator of Date', centerStr, currentRawPos),
        toJ2000Ecliptic: () => createSunResult('J2000 Ecliptic', centerStr, currentRawPos),
        toJ2000Equatorial: () => createSunResult('ICRF / J2000 Equatorial', centerStr, currentRawPos),
        toJ2000MeanEquatorial: () => createSunResult('J2000 Mean Equatorial', centerStr, currentRawPos),

        toGeocentric: async () => {
          if (centerStr === 'earth') return createSunResult(frameStr, centerStr, currentRawPos);
          // 地心太阳 = -地球日心位置
          const earthRes = await this.position('ear', time);
          const earthRaw = earthRes.toJ2000Equatorial().xyz;
          const geoSunPos: Vec3 = [-earthRaw[0], -earthRaw[1], -earthRaw[2]];
          return createSunResult(frameStr, 'earth', geoSunPos);
        },

        toHeliocentric: async () => {
          if (centerStr === 'sun') return createSunResult(frameStr, centerStr, currentRawPos);
          // 日心太阳 = [0,0,0]
          return createSunResult(frameStr, 'sun', zeroPos);
        }
      };
    };

    return createSunResult('True Ecliptic of Date', 'sun', zeroPos);
  }

  /**
   * 获取 COB 偏移（延迟初始化 COB provider）
   * @returns 偏移向量，或 null（如果该天体不支持 COB）
   * @throws 如果用户请求了 COB 但没有配置数据源
   */
  private async getCOBOffset(tag: BodyTag, jd: number): Promise<StateVec | null> {
    const { COBProvider } = await import('./corrections/cob.js');

    if (!COBProvider.hasCOB(tag)) {
      throw new Error(`No COB data exists for '${tag}'. Only jupiter, saturn, uranus, neptune, pluto have COB corrections.`);
    }

    // 延迟初始化 COB provider
    if (!this.cobProvider) {
      const opts = this.engineOptions;
      if (!opts?.loader && !opts?.baseUrl) {
        throw new Error(`COB correction requires a DataLoader. Configure 'baseUrl' or 'loader' in EphemerisOptions.`);
      }

      let loader: DataLoader;
      if (opts.loader) {
        loader = opts.loader;
      } else {
        const { FetchLoader } = await import('./loader/fetch.js');
        loader = new FetchLoader(opts.baseUrl!);
      }

      const { generateDefaultCOBManifest } = await import('./corrections/cob.js');
      const manifest = opts.cobManifest ?? generateDefaultCOBManifest();

      this.cobProvider = new COBProvider({ loader, manifest });
    }

    const offset = await this.cobProvider.getOffset(tag, jd, true);
    return offset as StateVec;
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
