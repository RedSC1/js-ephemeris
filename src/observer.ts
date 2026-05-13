import type { BodyTag, Observer, EphemerisResult, Vec3 } from './types.js';
import type { Ephemeris } from './engine.js';
import type { RefractionProvider } from './manifest/types.js';
import { getObserverGeocentricVector, earthRotationAngle } from './math/topocentric.js';
import { rotX, rotY, rotZ, mulMatVec, matMul, rectToSpherical } from './math/coords.js';
import { StandardRefractionProvider } from './corrections/refraction/standard.js';

export interface ObservationOptions {
  /** 是否开启光行时修正 (Light-time correction)，默认: true */
  lightTime?: boolean;
  /** 是否开启光行差修正 (Aberration)，默认: true */
  aberration?: boolean;
  /** 是否开启引力偏折修正 (Gravitational Deflection)，默认: true */
  deflection?: boolean;
  /** 是否开启站心视差修正 (Topocentric Parallax)，默认: true */
  topocentric?: boolean;
  /** 大气压 (毫巴/hPa)。如果不为 undefined 且 > 0，则开启大气折射修正。标准海平面为 1013.25 */
  pressure?: number;
  /** 温度 (摄氏度)。用于大气折射修正。默认 15 */
  temperature?: number;
  /** 大气折射模型提供者。默认使用 StandardRefractionProvider */
  refractionProvider?: RefractionProvider;
}

export interface ObservationResult {
  /** 目标天体 */
  body: BodyTag;
  /** 站心真赤经 (True Equator RA) */
  ra: number;
  /** 站心真赤纬 (True Equator Dec) */
  dec: number;
  /** 站心距离 (AU) */
  distance: number;
  /** 方位角 (Azimuth, 正南=0, 正西=90) */
  azimuth: number;
  /** 高度角 (Altitude, 已根据配置包含或未含大气折射) */
  altitude: number;
}

const LIGHT_TIME_DAYS_PER_AU = 0.00577551833; // 1 AU / C

// Earth/Moon mass ratio: M_earth / M_moon
const EARTH_MOON_MASS_RATIO = 81.30056;
// mu = M_moon / (M_earth + M_moon)
const MOON_MASS_FRACTION = 1.0 / (1.0 + EARTH_MOON_MASS_RATIO);

// Shapiro delay constant: 2 * GM_sun / c^3 (in days)
const SHAPIRO_CONST_DAYS = 9.8509e-6 / 86400; // ~9.85 μs converted to days

/**
 * 高级观测者类：包裹底层引擎，专门处理与地球表面观测者相关的天体测量学修正
 */
export class SkyObserver {
  private engine: Ephemeris;
  private observer: Observer;

  constructor(engine: Ephemeris, observer: Observer) {
    this.engine = engine;
    this.observer = observer;
  }

  /**
   * 观测指定天体，返回包含地平坐标和站心赤道坐标的结果
   */
  async observe(tag: BodyTag, date: Date | number, options?: ObservationOptions): Promise<ObservationResult> {
    const opt = {
      lightTime: true,
      aberration: true,
      deflection: true,
      topocentric: true,
      temperature: 15,
      ...options
    };

    const jdObs = typeof date === 'number' ? date : (date.getTime() / 86400000 + 2440587.5);
    
    // ----------------------------------------------------
    // 第零步：获取观测时刻 (jdObs) 的地球真实状态 (位置 + 速度)
    // EMB → Earth 修正: Earth = EMB - Moon_geocentric * M_moon/(M_earth+M_moon)
    // ----------------------------------------------------
    const earthState = await this.engine.state('ear', jdObs);
    const moonState = await this.engine.state('moon', jdObs);
    
    const earthPos: Vec3 = [
      earthState[0] - moonState[0] * MOON_MASS_FRACTION,
      earthState[1] - moonState[1] * MOON_MASS_FRACTION,
      earthState[2] - moonState[2] * MOON_MASS_FRACTION
    ];
    const earthVel: Vec3 = [
      earthState[3] - moonState[3] * MOON_MASS_FRACTION,
      earthState[4] - moonState[4] * MOON_MASS_FRACTION,
      earthState[5] - moonState[5] * MOON_MASS_FRACTION
    ];

    // ----------------------------------------------------
    // 第一招：光行时修正 (Light-Time Iteration) -> 获取星表位置 (Astrometric Place)
    // ----------------------------------------------------
    let objPos: Vec3 = [0, 0, 0];
    let distanceAu = 0;
    
    if (tag === 'earth' || tag === 'moon') {
      // 地月系内通常忽略光行时和周年光行差（对于极致月食计算，月球光行时<2秒，视需处理）
      // 这里简化处理，直接取几何位置
      const rawPos = await this.engine.position(tag, jdObs);
      const geoPos = await rawPos.toGeocentric();
      objPos = geoPos.toJ2000Equatorial().xyz;
      distanceAu = Math.sqrt(objPos[0]*objPos[0] + objPos[1]*objPos[1] + objPos[2]*objPos[2]);
    } else {
      let dt = 0;
      let iterations = 0;
      do {
        const jdEval = jdObs - dt;
        const rawRes = await this.engine.position(tag, jdEval);
        const rawPosJ2000 = rawRes.toJ2000Equatorial().xyz;
        
        // 星表向量 = 目标在(t-dt)的日心位置 - 地球在(t)的日心位置
        objPos = [
          rawPosJ2000[0] - earthPos[0],
          rawPosJ2000[1] - earthPos[1],
          rawPosJ2000[2] - earthPos[2]
        ];
        
        const newDist = Math.sqrt(objPos[0]*objPos[0] + objPos[1]*objPos[1] + objPos[2]*objPos[2]);
        const newDt = newDist * LIGHT_TIME_DAYS_PER_AU;
        
        if (!opt.lightTime) {
          distanceAu = newDist;
          break; // 如果没开启光行时，算一次几何距离就退出
        }
        
        // Shapiro delay (relativistic gravitational time delay)
        const rEarth = Math.sqrt(earthPos[0]*earthPos[0] + earthPos[1]*earthPos[1] + earthPos[2]*earthPos[2]);
        const rTarget = Math.sqrt(rawPosJ2000[0]*rawPosJ2000[0] + rawPosJ2000[1]*rawPosJ2000[1] + rawPosJ2000[2]*rawPosJ2000[2]);
        const shapiroDelay = SHAPIRO_CONST_DAYS * Math.log((rEarth + rTarget + newDist) / (rEarth + rTarget - newDist));
        const newDtTotal = newDt + shapiroDelay;
        
        if (Math.abs(newDtTotal - dt) < 1e-6 || iterations > 3) {
          distanceAu = newDist;
          break;
        }
        dt = newDtTotal;
        iterations++;
      } while (true);
    }

    // ----------------------------------------------------
    // 第二招：引力偏折 (Gravitational Deflection)
    // ----------------------------------------------------
    if (opt.deflection && tag !== 'earth' && tag !== 'sun') {
      // 太阳引力偏折常数 (2 * G * M_sun / c^2) ，单位：AU
      const SCHWARZSCHILD_RADIUS_AU = 1.97412574336e-8; 
      
      // 因为 OPM2 数据除月球外都是日心的，所以 earthPos 就是地球相对于太阳的坐标
      // 观测者(地球)到太阳的向量就是 -earthPos
      const sunVec: Vec3 = [-earthPos[0], -earthPos[1], -earthPos[2]];
      const E = Math.sqrt(sunVec[0]*sunVec[0] + sunVec[1]*sunVec[1] + sunVec[2]*sunVec[2]);
      const q: Vec3 = [sunVec[0]/E, sunVec[1]/E, sunVec[2]/E]; // 指向太阳的单位向量
      
      const p: Vec3 = [objPos[0]/distanceAu, objPos[1]/distanceAu, objPos[2]/distanceAu]; // 指向目标的单位向量
      
      const pDotQ = p[0]*q[0] + p[1]*q[1] + p[2]*q[2];
      
      // 太阳圆盘视半径约为 0.26 度。在这个边缘，pDotQ 约为 -0.9999897
      // 为了防止 1.75" 的瞬移，我们在太阳圆盘内部应用一个线性的衰减系数
      const GRAZING_THRESHOLD = -0.9999897;
      
      if (pDotQ > -0.99999999) {
        // 计算平滑系数：在太阳外部为 1.0，在太阳内部从边缘的 1.0 线性衰减到中心的 0
        let attenuationFactor = 1.0;
        if (pDotQ < GRAZING_THRESHOLD) {
          attenuationFactor = (1.0 + pDotQ) / (1.0 + GRAZING_THRESHOLD);
        }

        const factor = (SCHWARZSCHILD_RADIUS_AU / E / (1.0 + pDotQ)) * attenuationFactor;
        
        const dp: Vec3 = [
          factor * (q[0] - pDotQ * p[0]),
          factor * (q[1] - pDotQ * p[1]),
          factor * (q[2] - pDotQ * p[2])
        ];
        
        // 加上偏折修正，并重新恢复原始距离
        const pDeflected: Vec3 = [p[0] + dp[0], p[1] + dp[1], p[2] + dp[2]];
        const pDefLen = Math.sqrt(pDeflected[0]*pDeflected[0] + pDeflected[1]*pDeflected[1] + pDeflected[2]*pDeflected[2]);
        
        objPos = [
          (pDeflected[0] / pDefLen) * distanceAu,
          (pDeflected[1] / pDefLen) * distanceAu,
          (pDeflected[2] / pDefLen) * distanceAu
        ];
      }
    }

    // ----------------------------------------------------
    // 第三招：光行差 (Aberration) -> 获取视位置 (Apparent Place in J2000)
    // ----------------------------------------------------
    if (opt.aberration && tag !== 'earth' && tag !== 'moon') {
      // 经典光行差矢量加法: P' = P + V_earth / c
      const c_au_day = 1.0 / LIGHT_TIME_DAYS_PER_AU; // 约 173.14 AU/day
      
      // 先将目标向量归一化为单位方向向量
      const u: Vec3 = [objPos[0]/distanceAu, objPos[1]/distanceAu, objPos[2]/distanceAu];
      const ve: Vec3 = [earthVel[0]/c_au_day, earthVel[1]/c_au_day, earthVel[2]/c_au_day];
      
      // 合成视方向向量 P' = u + v_e
      const apparentU: Vec3 = [u[0] + ve[0], u[1] + ve[1], u[2] + ve[2]];
      
      // 将合成后的方向向量拉长回原来的物理距离 (光行差只改变方向，不改变距离的定义)
      const apparentLen = Math.sqrt(apparentU[0]*apparentU[0] + apparentU[1]*apparentU[1] + apparentU[2]*apparentU[2]);
      objPos = [
        (apparentU[0] / apparentLen) * distanceAu,
        (apparentU[1] / apparentLen) * distanceAu,
        (apparentU[2] / apparentLen) * distanceAu
      ];
    }

    // ----------------------------------------------------
    // 坐标系转换：J2000 -> 当期真赤道 (True Equator of Date)
    // ----------------------------------------------------
    const pMat = (this.engine as any).precessionProvider.getMatrix(jdObs);
    const nut = (this.engine as any).nutationProvider.getNutation(jdObs);
    
    // 章动矩阵 (直接三角函数展开)
    const cobm = Math.cos(nut.mobl), sobm = Math.sin(nut.mobl);
    const cobt = Math.cos(nut.tobl), sobt = Math.sin(nut.tobl);
    const cpsi = Math.cos(nut.dpsi), spsi = Math.sin(nut.dpsi);
    const nMat = [
      [cpsi,            -spsi * cobm,                    -spsi * sobm],
      [spsi * cobt,      cpsi * cobm * cobt + sobm * sobt, cpsi * sobm * cobt - cobm * sobt],
      [spsi * sobt,      cpsi * cobm * sobt - sobm * cobt, cpsi * sobm * sobt + cobm * cobt]
    ];
    const npMat = matMul(nMat, pMat);

    const geoTrueEq = mulMatVec(npMat, objPos);

    // ----------------------------------------------------
    // 视差修正 (目标站心 = 目标地心真赤道 - 观测者地心真赤道)
    // ----------------------------------------------------
    const deltaT = (this.engine as any).deltaTProvider(jdObs);
    const jdUT = jdObs - (deltaT / 86400.0);

    let topoTrueEq: Vec3;
    if (opt.topocentric) {
      const obsVector = getObserverGeocentricVector(this.observer, jdUT);
      
      topoTrueEq = [
        geoTrueEq[0] - obsVector[0],
        geoTrueEq[1] - obsVector[1],
        geoTrueEq[2] - obsVector[2]
      ];
    } else {
      topoTrueEq = geoTrueEq;
    }

    const [ra, dec, distance] = rectToSpherical(topoTrueEq);

    // ----------------------------------------------------
    // 地平坐标系转换
    // ----------------------------------------------------
    const nutation = (this.engine as any).nutationProvider.getNutation(jdObs);
    const ee = nutation ? nutation.ee : 0;

    const era = earthRotationAngle(jdUT);
    const lonRad = this.observer.lon * (Math.PI / 180.0);
    const last = era + lonRad - ee; 

    const rZ_horiz = rotZ(-last);
    const latRad = this.observer.lat * (Math.PI / 180.0);
    const rY = rotY(-(Math.PI / 2.0 - latRad));
    
    const horMat = matMul(rY, rZ_horiz);
    const horPos = mulMatVec(horMat, topoTrueEq);
    let [azimuth, altitude, _] = rectToSpherical(horPos);

    // ----------------------------------------------------
    // 第四招：大气折射修正 (Refraction)
    // ----------------------------------------------------
    if (opt.pressure !== undefined && opt.pressure > 0) {
      const refProvider = opt.refractionProvider ?? new StandardRefractionProvider();
      altitude = refProvider.getApparentAltitude(altitude, opt.pressure, opt.temperature);
    }

    return {
      body: tag,
      ra,
      dec,
      distance,
      azimuth,
      altitude
    };
  }
}
