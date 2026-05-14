/**
 * Auer & Standish (2000) 大气折射模型
 * 
 * "Astronomical Refraction: Computational Method for All Zenith Angles"
 * AJ 119, 2472-2474
 * 
 * 使用 Garfinkel (1944) 球面分段多方大气模型。
 * 积分变量代换 s = sqrt(t0 - t) 解决地平线处采样问题。
 */
import type { RefractionProvider } from '../../manifest/types.js';

// ===== 物理常数 =====
const A_GLADSTONE = 0.00029241;      // Gladstone-Dale 常数
const R_EARTH = 6378390;             // 地球半径 (m)
const G_ACCEL = 9.80655;             // 重力加速度 (m/s²)
const R_GAS = 287.053;               // 比气体常数 (J/(kg·K))
const N_POLY = 5;                    // 对流层多方指数
const H_TROPOPAUSE = 11019;          // 对流层顶高度 (m)

/**
 * Auer & Standish (2000) 大气折射 Provider
 */
export class AuerStandishRefractionProvider implements RefractionProvider {
  name = 'Auer-Standish (2000)';

  getApparentAltitude(altRad: number, pressure: number, temp: number): number {
    if (altRad < -2.0 * (Math.PI / 180.0)) return altRad;

    // 不动点迭代求解视高度
    let apparentRad = altRad + (altRad < 0.1 ? 0.01 : 0.0);
    for (let iter = 0; iter < 10; iter++) {
      let z_app = Math.PI / 2.0 - apparentRad;
      if (z_app > Math.PI / 2.0) z_app = Math.PI / 2.0;

      const refraction = this.computeRefraction(z_app, pressure, temp, 0);
      const newApparentRad = altRad + refraction;

      if (Math.abs(newApparentRad - apparentRad) < 1e-8) {
        return newApparentRad;
      }
      apparentRad = newApparentRad;
    }
    return apparentRad;
  }

  private computeRefraction(z_app: number, pressure: number, temp: number, altitude: number): number {
    const T_w = temp + 273.15;
    const P_mmHg = pressure * 760.0 / 1013.25;

    const rho_w = (P_mmHg / 760.0) * (273.15 / T_w);
    const k_w = 1.0 + A_GLADSTONE * rho_w;

    const r_w = R_EARTH + altitude;
    const r_B = R_EARTH + H_TROPOPAUSE;

    // Garfinkel 球面大气模型参数
    const beta_w = (G_ACCEL * R_EARTH) / (R_GAS * T_w * (1.0 + N_POLY));

    // 对流层顶参数
    const arg_B = 1.0 + beta_w * (R_EARTH / r_B - R_EARTH / r_w);
    const T_B = T_w * arg_B;
    const rho_B = rho_w * Math.pow(Math.max(0, arg_B), N_POLY);

    // 平流层参数 (等温)
    const gamma_B = (G_ACCEL * R_EARTH) / (R_GAS * T_B);

    // Snell 不变量
    const t0 = z_app;
    const S = k_w * r_w * Math.sin(t0);

    // 变量代换: s = sqrt(t0 - t)
    const s_max = Math.sqrt(t0);
    const N = 400;
    const ds = s_max / N;
    if (ds <= 0) return 0;

    let sum = 0;
    for (let i = 0; i <= N; i++) {
      const s = i * ds;
      const t = t0 - s * s;

      const f = this.integrand(t, S, r_w, rho_w, beta_w, r_B, rho_B, gamma_B);
      const f_transformed = f * 2.0 * s;

      let w: number;
      if (i === 0 || i === N) w = 1.0;
      else if (i % 2 === 1) w = 4.0;
      else w = 2.0;
      sum += w * f_transformed;
    }

    return sum * ds / 3.0;
  }

  private integrand(
    t: number, S: number,
    r_w: number, rho_w: number, beta_w: number,
    r_B: number, rho_B: number, gamma_B: number
  ): number {
    const sinT = Math.sin(t);
    if (sinT < 1e-15) return 0;

    // Newton-Raphson 求 r
    let r = S / sinT;
    for (let iter = 0; iter < 10; iter++) {
      const { k, dkdr } = this.kAndDk(r, r_w, rho_w, beta_w, r_B, rho_B, gamma_B);
      const F = k * r * sinT - S;
      const Fp = (dkdr * r + k) * sinT;
      if (Math.abs(Fp) < 1e-30) break;
      const dr = -F / Fp;
      r += dr;
      if (Math.abs(dr) < 1e-12 * r) break;
    }

    const { k, dkdr } = this.kAndDk(r, r_w, rho_w, beta_w, r_B, rho_B, gamma_B);
    const dlnk_dlnr = (dkdr * r) / k;

    const denom = 1.0 + dlnk_dlnr;
    if (Math.abs(denom) < 1e-15) return 0;

    return -(dlnk_dlnr / denom);
  }

  /**
   * Garfinkel 球面大气模型: k(r) 和 dk/dr
   */
  private kAndDk(
    r: number,
    r_w: number, rho_w: number, beta_w: number,
    r_B: number, rho_B: number, gamma_B: number
  ): { k: number; dkdr: number } {
    let rho: number;
    let drho_dr: number;

    if (r <= r_B) {
      // 对流层 (球面多方): ρ = ρ_w * (1 + β*(R/r - R/r_w))^n
      const arg = 1.0 + beta_w * (R_EARTH / r - R_EARTH / r_w);
      if (arg <= 0) return { k: 1.0, dkdr: 0 };
      rho = rho_w * Math.pow(arg, N_POLY);
      // d(arg)/dr = β * (-R/r²)
      drho_dr = rho_w * N_POLY * Math.pow(arg, N_POLY - 1.0) * (-beta_w * R_EARTH / (r * r));
    } else {
      // 平流层 (球面等温): ρ = ρ_B * exp(γ*(R/r - R/r_B))
      const expArg = gamma_B * (R_EARTH / r - R_EARTH / r_B);
      if (expArg < -50) return { k: 1.0, dkdr: 0 };
      rho = rho_B * Math.exp(expArg);
      // d(expArg)/dr = γ * (-R/r²)
      drho_dr = rho * (-gamma_B * R_EARTH / (r * r));
    }

    return {
      k: 1.0 + A_GLADSTONE * rho,
      dkdr: A_GLADSTONE * drho_dr
    };
  }
}
