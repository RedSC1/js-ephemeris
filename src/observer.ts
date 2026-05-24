import type { BodyTag, Observer, StateVec, Vec3 } from './types.js';
import type { Ephemeris } from './engine.js';
import { EphemerisTime } from './time.js';
import type { RefractionProvider } from './manifest/types.js';
import { earthRotationAngle, getObserverGeocentricVector, getObserverGeocentricVelocity } from './math/topocentric.js';
import { matMul, mulMatVec, rectToSpherical, rotY, rotZ, transposeMat } from './math/coords.js';
import { StandardRefractionProvider } from './corrections/refraction/standard.js';
import { applyLightTime } from './corrections/light-time.js';
import { applyAberrationWithVelocity } from './corrections/aberration.js';
import { applyDeflectionWithVelocity } from './corrections/deflection.js';

const DERIVATIVE_STEP_DAYS = 1e-3;

function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function normVec(a: Vec3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

function dotVec(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function radialSpeed(pos: Vec3, vel: Vec3): number {
  return dotVec(pos, vel) / normVec(pos);
}

function sphericalRates(pos: Vec3, vel: Vec3): { lonSpeed: number; latSpeed: number; distSpeed: number } {
  const [x, y, z] = pos;
  const [vx, vy, vz] = vel;
  const rxy2 = x * x + y * y;
  const rxy = Math.sqrt(rxy2);
  const r2 = rxy2 + z * z;
  const r = Math.sqrt(r2);
  return {
    lonSpeed: (x * vy - y * vx) / rxy2,
    latSpeed: (rxy * vz - z * (x * vx + y * vy) / rxy) / r2,
    distSpeed: (x * vx + y * vy + z * vz) / r,
  };
}

function refractionDerivative(
  provider: RefractionProvider,
  altitude: number,
  pressure: number,
  temperature: number,
): number {
  const h = 1e-6;
  return (
    provider.getApparentAltitude(altitude + h, pressure, temperature)
    - provider.getApparentAltitude(altitude - h, pressure, temperature)
  ) / (2 * h);
}

export interface ObservationOptions {
  /** 是否开启光行时修正 (Light-time correction)，默认: true */
  lightTime?: boolean;
  /** 是否开启光行差修正 (Aberration)，默认: true；站心观测时包含日周光行差 */
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

export interface ObservationVelocityResult extends ObservationResult {
  /** 赤经速度 (rad/day) */
  raSpeed: number;
  /** 赤纬速度 (rad/day) */
  decSpeed: number;
  /** 距离速度 (AU/day) */
  distanceSpeed: number;
  /** 方位角速度 (rad/day) */
  azimuthSpeed: number;
  /** 高度角速度 (rad/day)，如果启用折射则为折射后视高度速度 */
  altitudeSpeed: number;
}

interface ObserverState {
  pos: Vec3;
  vel: Vec3;
}

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

  private trueEquatorialMatrix(jdTT: number): number[][] {
    const pMat = this.engine.precessionProvider.getMatrix(jdTT);
    const nut = this.engine.nutationProvider.getNutation(jdTT);

    const cobm = Math.cos(nut.mobl), sobm = Math.sin(nut.mobl);
    const cobt = Math.cos(nut.tobl), sobt = Math.sin(nut.tobl);
    const cpsi = Math.cos(nut.dpsi), spsi = Math.sin(nut.dpsi);
    const nMat = [
      [cpsi,            -spsi * cobm,                     -spsi * sobm],
      [spsi * cobt,      cpsi * cobm * cobt + sobm * sobt, cpsi * sobm * cobt - cobm * sobt],
      [spsi * sobt,      cpsi * cobm * sobt - sobm * cobt, cpsi * sobm * sobt + cobm * cobt]
    ];
    return matMul(nMat, pMat);
  }

  private trueEquatorialMatrixDerivative(jdTT: number, h = DERIVATIVE_STEP_DAYS): number[][] {
    const plus = this.trueEquatorialMatrix(jdTT + h);
    const minus = this.trueEquatorialMatrix(jdTT - h);
    return SkyObserver.matrixDifference(plus, minus, h);
  }

  private static matrixDifference(plus: number[][], minus: number[][], h: number): number[][] {
    const scale = 1 / (2 * h);
    return [
      [
        (plus[0]![0]! - minus[0]![0]!) * scale,
        (plus[0]![1]! - minus[0]![1]!) * scale,
        (plus[0]![2]! - minus[0]![2]!) * scale,
      ],
      [
        (plus[1]![0]! - minus[1]![0]!) * scale,
        (plus[1]![1]! - minus[1]![1]!) * scale,
        (plus[1]![2]! - minus[1]![2]!) * scale,
      ],
      [
        (plus[2]![0]! - minus[2]![0]!) * scale,
        (plus[2]![1]! - minus[2]![1]!) * scale,
        (plus[2]![2]! - minus[2]![2]!) * scale,
      ],
    ];
  }

  private horizontalMatrix(jdTT: number, jdUT: number): number[][] {
    const nutation = this.engine.nutationProvider.getNutation(jdTT);
    const ee = nutation ? nutation.ee : 0;
    const era = earthRotationAngle(jdUT);
    const lonRad = this.observer.lon * (Math.PI / 180.0);
    const last = era + lonRad - ee;
    const rZHoriz = rotZ(-last);
    const latRad = this.observer.lat * (Math.PI / 180.0);
    const rY = rotY(-(Math.PI / 2.0 - latRad));
    return matMul(rY, rZHoriz);
  }

  private horizontalMatrixDerivative(jdTT: number, jdUT: number, h = DERIVATIVE_STEP_DAYS): number[][] {
    return SkyObserver.matrixDifference(
      this.horizontalMatrix(jdTT + h, jdUT + h),
      this.horizontalMatrix(jdTT - h, jdUT - h),
      h,
    );
  }

  private async earthState(jdTT: number): Promise<ObserverState> {
    const state = await this.engine.state('ear', EphemerisTime.fromTT(jdTT, { deltaTProvider: this.engine.deltaTProvider }), { computeVelocity: true });
    return {
      pos: [state[0], state[1], state[2]],
      vel: [state[3], state[4], state[5]],
    };
  }

  private observerSiteState(jdTT: number, jdUT: number): ObserverState {
    const trueEqPos = getObserverGeocentricVector(this.observer, jdUT);
    const trueEqVel = getObserverGeocentricVelocity(this.observer, jdUT);
    const trueEqToJ2000 = transposeMat(this.trueEquatorialMatrix(jdTT));
    const trueEqToJ2000Dot = transposeMat(this.trueEquatorialMatrixDerivative(jdTT));
    return {
      pos: mulMatVec(trueEqToJ2000, trueEqPos),
      vel: addVec(mulMatVec(trueEqToJ2000, trueEqVel), mulMatVec(trueEqToJ2000Dot, trueEqPos)),
    };
  }

  private async observerHeliocentricState(jdTT: number, jdUT: number, topocentric: boolean): Promise<ObserverState> {
    const earth = await this.earthState(jdTT);
    if (!topocentric) return earth;
    const site = this.observerSiteState(jdTT, jdUT);
    return {
      pos: addVec(earth.pos, site.pos),
      vel: addVec(earth.vel, site.vel),
    };
  }

  private async observerAcceleration(jdTT: number, jdUT: number, topocentric: boolean, h = DERIVATIVE_STEP_DAYS): Promise<Vec3> {
    const before = await this.observerHeliocentricState(jdTT - h, jdUT - h, topocentric);
    const after = await this.observerHeliocentricState(jdTT + h, jdUT + h, topocentric);
    return [
      (after.vel[0] - before.vel[0]) / (2 * h),
      (after.vel[1] - before.vel[1]) / (2 * h),
      (after.vel[2] - before.vel[2]) / (2 * h),
    ];
  }

  private async targetState(tag: BodyTag, jdTT: number): Promise<StateVec> {
    return this.engine.state(tag, EphemerisTime.fromTT(jdTT, { deltaTProvider: this.engine.deltaTProvider }), { computeVelocity: true });
  }

  /**
   * 观测指定天体，返回包含地平坐标和站心赤道坐标的结果
   */
  async observe(tag: BodyTag, date: Date | number, options?: ObservationOptions): Promise<ObservationResult> {
    const result = await this.observeWithVelocity(tag, date, options);
    return {
      body: result.body,
      ra: result.ra,
      dec: result.dec,
      distance: result.distance,
      azimuth: result.azimuth,
      altitude: result.altitude,
    };
  }

  /**
   * 观测指定天体，返回位置和视觉速度。
   */
  async observeWithVelocity(
    tag: BodyTag,
    date: Date | number,
    options?: ObservationOptions,
  ): Promise<ObservationVelocityResult> {
    const opt = {
      lightTime: true,
      aberration: true,
      deflection: true,
      topocentric: true,
      temperature: 15,
      ...options
    };

    const jdUT = typeof date === 'number' ? date : (date.getTime() / 86400000 + 2440587.5);
    const jdTT = jdUT + this.engine.deltaTProvider(jdUT) / 86400.0;
    const observerState = await this.observerHeliocentricState(jdTT, jdUT, opt.topocentric);

    let objPos: Vec3 = [0, 0, 0];
    let objVel: Vec3 = [0, 0, 0];
    let distanceAu = 0;

    if (tag === 'earth' || tag === 'ear') {
      if (opt.topocentric) {
        const site = this.observerSiteState(jdTT, jdUT);
        objPos = [-site.pos[0], -site.pos[1], -site.pos[2]];
        objVel = [-site.vel[0], -site.vel[1], -site.vel[2]];
        distanceAu = normVec(objPos);
      }
    } else {
      const ltResult = await applyLightTime(
        observerState.pos,
        observerState.vel,
        jd => this.targetState(tag, jd),
        jdTT,
        opt.lightTime,
      );
      objPos = ltResult.pos;
      objVel = ltResult.vel;
      distanceAu = ltResult.distance;
    }

    if (opt.deflection && tag !== 'earth' && tag !== 'ear' && tag !== 'sun') {
      const targetHelio = addVec(objPos, observerState.pos);
      const targetHelioVel = addVec(objVel, observerState.vel);
      const deflected = applyDeflectionWithVelocity(
        objPos,
        objVel,
        observerState.pos,
        observerState.vel,
        targetHelio,
        targetHelioVel,
        distanceAu,
        radialSpeed(objPos, objVel),
      );
      objPos = deflected.pos;
      objVel = deflected.vel;
      distanceAu = normVec(objPos);
    }

    if (opt.aberration && tag !== 'earth' && tag !== 'ear') {
      const observerAcc = await this.observerAcceleration(jdTT, jdUT, opt.topocentric);
      const aberrated = applyAberrationWithVelocity(objPos, objVel, observerState.vel, observerAcc, distanceAu);
      objPos = aberrated.pos;
      objVel = aberrated.vel;
      distanceAu = normVec(objPos);
    }

    const trueEqMat = this.trueEquatorialMatrix(jdTT);
    const trueEqMatDot = this.trueEquatorialMatrixDerivative(jdTT);
    const trueEq = mulMatVec(trueEqMat, objPos);
    const trueEqVel = addVec(mulMatVec(trueEqMat, objVel), mulMatVec(trueEqMatDot, objPos));
    const [ra, dec, distance] = rectToSpherical(trueEq);
    const eqRates = sphericalRates(trueEq, trueEqVel);

    const horMat = this.horizontalMatrix(jdTT, jdUT);
    const horMatDot = this.horizontalMatrixDerivative(jdTT, jdUT);
    const horPos = mulMatVec(horMat, trueEq);
    const horVel = addVec(mulMatVec(horMat, trueEqVel), mulMatVec(horMatDot, trueEq));
    const [azimuth, trueAltitude] = rectToSpherical(horPos);
    const horRates = sphericalRates(horPos, horVel);

    let altitude = trueAltitude;
    let altitudeSpeed = horRates.latSpeed;
    if (opt.pressure !== undefined && opt.pressure > 0) {
      const refProvider = opt.refractionProvider ?? new StandardRefractionProvider();
      altitude = refProvider.getApparentAltitude(trueAltitude, opt.pressure, opt.temperature);
      altitudeSpeed *= refractionDerivative(refProvider, trueAltitude, opt.pressure, opt.temperature);
    }

    return {
      body: tag,
      ra,
      dec,
      distance,
      azimuth,
      altitude,
      raSpeed: eqRates.lonSpeed,
      decSpeed: eqRates.latSpeed,
      distanceSpeed: eqRates.distSpeed,
      azimuthSpeed: horRates.lonSpeed,
      altitudeSpeed,
    };
  }
}
