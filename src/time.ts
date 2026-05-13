import { deltaTByJD } from './corrections/delta-t.js';
import { calendarToJD } from './math/julian.js';

export interface EphemerisTimeOptions {
  /** 手动指定 Delta-T（秒）。如果指定，将跳过内置模型计算。 */
  deltaT?: number;
  /** 自定义 Delta-T 提供者函数 */
  deltaTProvider?: (jdUT: number) => number;
}

/**
 * js-ephemeris 时间系统封装
 * 统一管理 UT (世界时), TT (力学时) 以及 Delta-T 修正
 */
export class EphemerisTime {
  /** 
   * 核心存储：UT 标尺下的儒略日 (JD in UTC/UT1)
   */
  public readonly jdUT: number;
  
  /** 
   * 缓存该时刻的 Delta-T (秒)
   */
  public readonly deltaT: number;

  constructor(jdUT: number, options?: EphemerisTimeOptions) {
    this.jdUT = jdUT;
    
    if (options?.deltaT !== undefined) {
      this.deltaT = options.deltaT;
    } else if (options?.deltaTProvider) {
      this.deltaT = options.deltaTProvider(jdUT);
    } else {
      this.deltaT = deltaTByJD(jdUT);
    }
  }

  /**
   * 力学时 (JDE)，引擎内部查找星历数据时使用
   */
  get jdTT(): number {
    return this.jdUT + (this.deltaT / 86400.0);
  }

  /**
   * 从普通日历时间创建
   * @param timezone 时区，例如北京时间为 8
   */
  static fromCalendar(
    year: number, month: number, day: number, 
    hour = 0, minute = 0, second = 0, 
    timezone = 0,
    options?: EphemerisTimeOptions
  ): EphemerisTime {
    const jdLocal = calendarToJD(year, month, day, hour, minute, second);
    const jdUT = jdLocal - (timezone / 24.0);
    return new EphemerisTime(jdUT, options);
  }

  /**
   * 从 JS Date 对象创建
   */
  static fromDate(date: Date, options?: EphemerisTimeOptions): EphemerisTime {
    const jdUTC = date.getTime() / 86400000 + 2440587.5;
    return new EphemerisTime(jdUTC, options);
  }
}
