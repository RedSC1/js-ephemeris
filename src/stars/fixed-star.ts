/**
 * 恒星（Fixed Star）天体测量计算
 *
 * J2000 赤道坐标 + 自行 → 任意历元的黄道位置。
 *
 * 自行模型: Hipparcos 半刚性公式 (ESA 1997, Vol.1, §1.5.5),
 * 含视角加速度 (perspective acceleration)。
 *
 * 岁差旋转和赤道→黄道转换由调用者提供矩阵和真黄赤交角,
 * FixedStar 不依赖引擎实例。
 */

const J2000 = 2451545.0;
const DAYS_PER_YEAR = 365.25;

// arcsec, mas, deg 转换
const ASEC2RAD = Math.PI / (180 * 3600);
const MAS2RAD = ASEC2RAD / 1000;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Av = 4.740470446 km·yr/s (天文单位 / 儒略年秒数)
// 用于视角加速度公式中的 vr·π/Av 项
const AV = 4.740470446;

export interface FixedStarData {
  /** J2000 赤经 (度) */
  raJ2000: number;
  /** J2000 赤纬 (度) */
  decJ2000: number;
  /** 赤经自行 (mas/yr), 已含 cos(dec) 因子 */
  pmRa: number;
  /** 赤纬自行 (mas/yr) */
  pmDec: number;
  /** 视差 (mas) */
  parallax: number;
  /** 视向速度 (km/s, 正=远离) */
  radialVelocity: number;
}

export interface EclipticPosition {
  lon: number;  // 黄经 (度)
  lat: number;  // 黄纬 (度)
}

export class FixedStar {
  // J2000 历元值 (弧度)
  private ra0: number;
  private dec0: number;
  private ma0: number;    // pmRA* (rad/yr)
  private md0: number;    // pmDec (rad/yr)
  private plx: number;    // parallax (rad)
  private rv: number;     // km/s

  // 视角加速度 (rad/yr²)
  private dMa: number;
  private dMd: number;

  constructor(data: FixedStarData) {
    this.ra0  = data.raJ2000  * DEG2RAD;
    this.dec0 = data.decJ2000 * DEG2RAD;
    this.ma0  = data.pmRa     * MAS2RAD;
    this.md0  = data.pmDec    * MAS2RAD;
    this.plx  = data.parallax * MAS2RAD;
    this.rv   = data.radialVelocity;

    // 预计算视角加速度 (Hipparcos ESA 1997 Vol.1 §1.5.5)
    // d(μα*)/dt = μα*·μδ·tan(δ) − 2·μα*·vᵣ·π/Av
    // d(μδ)/dt  = −½·μα*²·tan(δ) − 2·μδ·vᵣ·π/Av
    const tanD = Math.tan(this.dec0);
    const factor = this.plx <= 0 || this.rv === 0
      ? 0
      : (2 * this.rv * this.plx) / AV;

    this.dMa = this.ma0 * this.md0 * tanD - this.ma0 * factor;
    this.dMd = -0.5 * this.ma0 * this.ma0 * tanD - this.md0 * factor;
  }

  /**
   * J2000 赤道坐标推进到目标历元（含视角加速度）
   *
   * @param jdTT - 目标历元 (TT)
   * @returns [ra, dec] 弧度, J2000 赤道坐标系
   */
  equatorialAtEpoch(jdTT: number): [number, number] {
    const dt = (jdTT - J2000) / DAYS_PER_YEAR;
    const ra  = this.ra0  + (this.ma0 + 0.5 * this.dMa * dt) * dt;
    const dec = this.dec0 + (this.md0 + 0.5 * this.dMd * dt) * dt;
    return [ra, dec];
  }

  /**
   * 任意历元的黄道位置
   *
   * @param jdTT - 目标历元 (TT)
   * @param P - 岁差矩阵 (3×3), J2000 equatorial → of-date equatorial
   * @param eps - 真黄赤交角 (弧度)
   * @returns { lon, lat } 黄经/黄纬 (度)
   */
  eclipticPosition(
    jdTT: number,
    P: number[][],
    eps: number,
  ): EclipticPosition {
    // 1. 自行推进 → J2000 赤道
    const [ra, dec] = this.equatorialAtEpoch(jdTT);

    // 2. J2000 赤道 → of-date 赤道 (岁差旋转)
    const cosR = Math.cos(ra), sinR = Math.sin(ra);
    const cosD = Math.cos(dec), sinD = Math.sin(dec);
    const x0 = cosD * cosR;
    const y0 = cosD * sinR;
    const z0 = sinD;

    const r0 = P[0]!, r1 = P[1]!, r2 = P[2]!;
    const x = r0[0]! * x0 + r0[1]! * y0 + r0[2]! * z0;
    const y = r1[0]! * x0 + r1[1]! * y0 + r1[2]! * z0;
    const z = r2[0]! * x0 + r2[1]! * y0 + r2[2]! * z0;

    // 3. 赤道 → 黄道 (绕 x 轴旋转 eps)
    const cosE = Math.cos(eps), sinE = Math.sin(eps);
    const yEcl = y * cosE + z * sinE;
    const zEcl = -y * sinE + z * cosE;

    const lon = Math.atan2(yEcl, x) * RAD2DEG;
    const lat = Math.atan2(zEcl, Math.sqrt(x * x + yEcl * yEcl)) * RAD2DEG;

    return { lon: (lon + 360) % 360, lat };
  }
}

// ─── 常用恒星数据 ────────────────────────────────────────

/** 角宿一 Spica (α Vir, HIP 65474) — SIMBAD/Hipparcos 2007 */
export const SPICA: FixedStarData = {
  raJ2000:        201.298247375, // 13h 25m 11.57937s
  decJ2000:       -11.161319472, // −11° 09′ 40.7501″
  pmRa:           -42.35,        // mas/yr
  pmDec:          -30.67,        // mas/yr
  parallax:        13.06,        // mas
  radialVelocity:  -3.31,        // km/s
};

/** J2000 银心方向锚点，用于 Galactic Center = 0 Sagittarius ayanamsa */
export const J2000_GALACTIC_CENTER_DIRECTION: FixedStarData = {
  raJ2000:        266.4168371,  // 17h 45m 40.0409s
  decJ2000:       -29.0078106,  // −29° 00′ 28.118″
  pmRa:             0,
  pmDec:            0,
  parallax:         0,
  radialVelocity:   0,
};

/** Sgr A* apparent radio source — Reid & Brunthaler (2004) */
export const SGR_A_APPARENT: FixedStarData = {
  raJ2000:        266.4168371,  // 17h 45m 40.0409s
  decJ2000:       -29.0078106,  // −29° 00′ 28.118″
  pmRa:            -3.151,      // mas/yr east, i.e. μα*cosδ
  pmDec:           -5.547,      // mas/yr north
  parallax:         0,
  radialVelocity:   0,
};

export const GALACTIC_CENTER = J2000_GALACTIC_CENTER_DIRECTION;
