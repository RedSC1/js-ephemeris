// @ts-nocheck
import type { NutationProvider, NutationResult } from '../../manifest/types.js';
import { NUT_LS, NUT_PL } from './iau2000a-data.js';

const AS2R = 4.848136811095359935899141e-6; // 角秒转弧度
const ASEC360 = 1296000.0; // 360度的角秒数
const D2PI = 6.283185307179586476925287;

/**
 * IAU 2000A 章动模型提供者
 * 包含完整 1365 项 (Lunisolar 678, Planetary 687)，精度可达 ~0.01 mas。
 * 建议对精度有极致要求的场景使用。
 */
export class IAU2000AProvider implements NutationProvider {
  name = 'IAU2000A';

  getNutation(jdTT: number): NutationResult {
    const t = (jdTT - 2451545.0) / 36525.0;

    // ── Luni-solar Delaunay arguments (IERS 2003) ──
    const el = (((((0.0000000656 * t - 0.000064487) * t + 0.001990) * t - 0.000020) * t + 1717915923.2178) * t + 485868.249036) % ASEC360 * AS2R;
    const elp = (((((-0.00001149 * t + 0.000136) * t - 0.5532) * t + 129596581.0481) * t + 1287104.79305) % ASEC360) * AS2R;
    const f = (((((0.0000000752 * t + 0.000034496) * t - 0.006730) * t - 0.000038) * t + 1739527262.8478) * t + 335779.526232) % ASEC360 * AS2R;
    const d = (((((-0.00003169 * t + 0.006593) * t - 6.3706) * t + 1602961601.2090) * t + 1072260.70369) % ASEC360) * AS2R;
    const om = (((((-0.0000001052 * t + 0.000024983) * t + 0.007743) * t - 0.000014) * t - 6962890.5431) * t + 450160.398036) % ASEC360 * AS2R;

    let dp = 0, de = 0;

    // ── Luni-solar summation (units: 0.1 μas) ──
    for (let i = NUT_LS.length - 1; i >= 0; i--) {
      const r = NUT_LS[i];
      const arg = r[0]*el + r[1]*elp + r[2]*f + r[3]*d + r[4]*om;
      const s = Math.sin(arg), c = Math.cos(arg);
      dp += (r[5] + r[6] * t) * s + r[7] * c;
      de += (r[8] + r[9] * t) * c + r[10] * s;
    }

    // ── Planetary Delaunay arguments (MHB2000) ──
    const al  = (2.35555598 + 8328.6914269554 * t) % D2PI;
    const af  = (1.627905234 + 8433.466158131 * t) % D2PI;
    const ad  = (5.198466741 + 7771.3771468121 * t) % D2PI;
    const aom = (2.18243920 - 33.757045 * t) % D2PI;

    // General accumulated precession in longitude (IERS 2003) = eraFapa03
    const apa = (0.02438175 + 0.00000538691 * t) * t;

    // Planetary longitudes, Mercury through Neptune (IERS 2003)
    const alme = this.eraFame03(t);
    const alve = this.eraFave03(t);
    const alea = this.eraFae03(t);
    const alma = this.eraFama03(t);
    const alju = this.eraFaju03(t);
    const alsa = this.eraFasa03(t);
    const alur = this.eraFaur03(t);
    const alne = this.eraFane03(t);

    // ── Planetary summation (units: 0.1 μas) ──
    for (let i = NUT_PL.length - 1; i >= 0; i--) {
      const r = NUT_PL[i];
      const arg = r[0]*al + r[1]*af + r[2]*ad + r[3]*aom
                + r[4]*alme + r[5]*alve + r[6]*alea + r[7]*alma
                + r[8]*alju + r[9]*alsa + r[10]*alur + r[11]*alne + r[12]*apa;
      const s = Math.sin(arg), c = Math.cos(arg);
      dp += r[13] * s + r[14] * c;
      de += r[15] * s + r[16] * c;
    }

    // Convert from 0.1 μas to arcseconds (×1e-7)
    const dpsi_arcsec = -0.000135 + dp * 1e-7;
    const deps_arcsec = +0.000388 + de * 1e-7;

    // IAU 2006 (P03) 平黄赤交角
    const asec = (((((-0.0000000434 * t - 0.000000576) * t + 0.00200340) * t - 0.0001831) * t - 46.836769) * t + 84381.406);
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

  private eraFame03(t: number): number { return (((((-0.0000001107 * t - 0.000034151) * t + 0.010150) * t - 0.000352) * t + 908103.259872) * t + 538101628.68898) % ASEC360 * AS2R; }
  private eraFave03(t: number): number { return (((((0.0000004431 * t - 0.000125027) * t + 0.008978) * t - 0.000518) * t + 210664.136199) * t + 210664136.43655) % ASEC360 * AS2R; }
  private eraFae03(t: number): number { return (((((-0.0000002939 * t - 0.000000526) * t + 0.017663) * t - 0.000351) * t + 689050.772564) * t + 689050770.94610) % ASEC360 * AS2R; }
  private eraFama03(t: number): number { return (((((0.0000000780 * t + 0.000059644) * t - 0.004806) * t - 0.000365) * t + 1279542.339554) * t + 1279542082.26518) % ASEC360 * AS2R; }
  private eraFaju03(t: number): number { return (((((-0.0000000599 * t - 0.000031803) * t + 0.002327) * t - 0.000263) * t + 109256.600994) * t + 109256603.77991) % ASEC360 * AS2R; }
  private eraFasa03(t: number): number { return (((((0.0000000463 * t - 0.000017504) * t + 0.002027) * t - 0.000189) * t + 43996.065568) * t + 43996098.55732) % ASEC360 * AS2R; }
  private eraFaur03(t: number): number { return (((((-0.0000000490 * t - 0.000037313) * t + 0.014618) * t - 0.000186) * t + 15424.802028) * t + 15424811.93949) % ASEC360 * AS2R; }
  private eraFane03(t: number): number { return (((((0.0000000685 * t - 0.000017206) * t + 0.001274) * t - 0.000133) * t + 7865.534728) * t + 7865473.41058) % ASEC360 * AS2R; }
}
