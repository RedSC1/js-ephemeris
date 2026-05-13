import type { RefractionProvider } from '../../manifest/types.js';

/**
 * 标准大气折射模型 (基于 Meeus / Saastamoinen)
 * 结合了 Smart 高空公式和 Bennett 低空拟合公式，
 * 在 14°~16° 之间进行线性平滑融合，消除 7" 跳变，
 * 且保证天顶 (90°) 误差严格为 0。
 */
export class StandardRefractionProvider implements RefractionProvider {
  name = 'StandardRefraction (Meeus Blended)';

  getApparentAltitude(altRad: number, pressure: number, temp: number): number {
    const altDeg = altRad * (180.0 / Math.PI);
    
    // 地平线以下太远不考虑折射
    if (altDeg < -2.0) return altRad; 

    // 公式A：Smart 高空公式 (天顶严格为0)
    const getSmartRefraction = (hDeg: number) => {
      const zDeg = 90.0 - hDeg;
      const tanZ = Math.tan(zDeg * Math.PI / 180.0);
      const rArcSec = 58.276 * tanZ - 0.0824 * Math.pow(tanZ, 3);
      return rArcSec / 60.0; // 返回角分
    };

    // 公式B：Bennett 低空公式 (0度不爆炸)
    const getBennettRefraction = (hDeg: number) => {
      return 1.02 / Math.tan((hDeg + 10.3 / (hDeg + 5.11)) * Math.PI / 180.0);
    };

    let rArcMin = 0;

    if (altDeg >= 16.0) {
      rArcMin = getSmartRefraction(altDeg);
    } else if (altDeg <= 14.0) {
      rArcMin = getBennettRefraction(altDeg);
    } else {
      // 14° ~ 16° 平滑过渡带
      const weight = (altDeg - 14.0) / 2.0; // 0 到 1 之间
      rArcMin = getBennettRefraction(altDeg) * (1.0 - weight) + getSmartRefraction(altDeg) * weight;
    }
    
    // 气象修正因子 (Meeus 标准: 1010 mb, 10°C)
    // 修正公式: (P / 1010) * (283 / (273 + T))
    const correction = (pressure / 1010.0) * (283.0 / (273.0 + temp));
    const finalRefractionDeg = (rArcMin * correction) / 60.0;

    return altRad + (finalRefractionDeg * Math.PI / 180.0);
  }
}
