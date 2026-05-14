import type { BodyTag, Observer, Vec3 } from './types.js';
import type { Ephemeris } from './engine.js';
import type { RefractionProvider } from './manifest/types.js';
import { getObserverGeocentricVector, earthRotationAngle } from './math/topocentric.js';
import { rotY, rotZ, mulMatVec, matMul, rectToSpherical } from './math/coords.js';
import { StandardRefractionProvider } from './corrections/refraction/standard.js';
import { applyLightTime } from './corrections/light-time.js';
import { applyAberration } from './corrections/aberration.js';
import { applyDeflection } from './corrections/deflection.js';

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

// Earth/Moon mass ratio: M_earth / M_moon (DE441 EMRAT)
const EARTH_MOON_MASS_RATIO = 81.3005682;
// mu = M_moon / (M_earth + M_moon)
const MOON_MASS_FRACTION = 1.0 / (1.0 + EARTH_MOON_MASS_RATIO);

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
    
    if (tag === 'earth') {
      // 地球自身：地心位置为原点
      objPos = [0, 0, 0];
      distanceAu = 0;
    } else {
      // 所有天体（含太阳、月球）都走光行时修正
      const getTargetState = async (jd: number) => {
        const rawRes = await this.engine.position(tag, jd);
        const rawPosJ2000 = rawRes.toJ2000Equatorial().xyz;
        
        // applyLightTime 期望日心位置，月球数据是地心的需要转换
        if (rawRes.center === 'earth') {
          // 地心 → 伪日心: 加上观测时刻的地球位置
          return [
            rawPosJ2000[0] + earthPos[0],
            rawPosJ2000[1] + earthPos[1],
            rawPosJ2000[2] + earthPos[2],
            0, 0, 0
          ] as [number, number, number, number, number, number];
        }
        return [rawPosJ2000[0], rawPosJ2000[1], rawPosJ2000[2], 0, 0, 0] as [number, number, number, number, number, number];
      };

      const ltResult = await applyLightTime(
        earthPos, earthVel, getTargetState, jdObs, opt.lightTime
      );
      objPos = ltResult.pos;
      distanceAu = ltResult.distance;
    }

    // ----------------------------------------------------
    // 第二招：引力偏折 (Gravitational Deflection)
    // ----------------------------------------------------
    if (opt.deflection && tag !== 'earth' && tag !== 'sun') {
      const targetHelio: Vec3 = [
        objPos[0] + earthPos[0],
        objPos[1] + earthPos[1],
        objPos[2] + earthPos[2]
      ];
      objPos = applyDeflection(objPos, earthPos, targetHelio, distanceAu);
    }

    // ----------------------------------------------------
    // 第三招：光行差 (Aberration) -> 获取视位置 (Apparent Place in J2000)
    // ----------------------------------------------------
    if (opt.aberration && tag !== 'earth') {
      objPos = applyAberration(objPos, earthVel, distanceAu);
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
