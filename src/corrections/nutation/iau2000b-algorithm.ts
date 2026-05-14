// @ts-nocheck
import type { NutationProvider, NutationResult } from '../../manifest/types.js';
import { NUT2000B } from './iau2000b-data.js';

const AS2R = 4.848136811095359935899141e-6; // 角秒转弧度
const ASEC360 = 1296000.0; // 360度的角秒数

/**
 * IAU 2000B 章动模型提供者
 * 包含 77 个周期项，精度极高，且计算量远小于 IAU 2000A。
 */
export class IAU2000BProvider implements NutationProvider {
  name = 'IAU2000B';

  getNutation(jdTT: number): NutationResult {
    const t = (jdTT - 2451545.0) / 36525.0;
    
    // 基础参数 (Delaunay arguments)
    // l, l', F, D, Omega
    const fa = [
      ((485868.249036 + t * 1717915923.2178) % ASEC360) * AS2R,
      ((1287104.79305 + t * 129596581.0481) % ASEC360) * AS2R,
      ((335779.526232 + t * 1739527262.8478) % ASEC360) * AS2R,
      ((1072260.70369 + t * 1602961601.2090) % ASEC360) * AS2R,
      ((450160.398036 - t * 6962890.5431) % ASEC360) * AS2R,
    ];

    let dp = 0, de = 0;
    for (let i = NUT2000B.length - 1; i >= 0; i--) {
      const r = NUT2000B[i];
      const arg = r[0]*fa[0] + r[1]*fa[1] + r[2]*fa[2] + r[3]*fa[3] + r[4]*fa[4];
      const s = Math.sin(arg), c = Math.cos(arg);
      dp += (r[5] + r[6] * t) * s + r[7] * c;
      de += (r[8] + r[9] * t) * c + r[10] * s;
    }

    // 转换为弧度
    // 论文中的常数偏移量
    const dpsi_arcsec = -0.000135 + dp * 1.0e-7;
    const deps_arcsec = +0.000388 + de * 1.0e-7;

    // IAU 2006 (P03) 平黄赤交角
    const asec = (((((-0.0000000434 * t - 0.000000576) * t + 0.00200340) * t
      - 0.0001831) * t - 46.836769) * t + 84381.406);
    const mobl = asec * AS2R;
    const dpsi = dpsi_arcsec * AS2R;
    const deps = deps_arcsec * AS2R;
    const ee = dpsi * Math.cos(mobl); // 分点差

    return {
      dpsi,
      deps,
      mobl,
      tobl: mobl + deps,
      ee
    };
  }
}
