// @ts-nocheck
import type { Vec3 } from '../../types.js';
import type { PrecessionProvider } from '../../manifest/types.js';

import { 
  V11_ECLIPTIC_POLYNOMIAL, V11_ECLIPTIC_PERIODIC,
  V11_EQUATOR_POLYNOMIAL, V11_EQUATOR_PERIODIC 
} from './v11-data.js';

const AS2R = 4.848136811095359935899141e-6; 
const TWO_PI = 6.283185307179586476925287;
const EPS0 = 84381.406 * AS2R; 

// Frame bias parameters (IERS Conventions 2010, Eqs. 5.21 and 5.33)
// GCRS -> mean J2000.0 equator and equinox
const DX06 = -0.016617 * AS2R;
const DE06 = -0.0068192 * AS2R;
const DR06 = -0.0146 * AS2R;

/**
 * Vondrák 2011 岁差模型实现
 */
export class Vondrak2011Provider implements PrecessionProvider {
  name = 'Vondrak2011';

  getMatrix(jdTT: number): number[][] {
    const t = (jdTT - 2451545.0) / 36525.0;
    
    const peqr = this.getEquatorPole(t);
    const pecl = this.getEclipticPole(t);

    const v = this.cross(peqr, pecl);
    const eqx = this.normalize(v);
    const eqy = this.cross(peqr, eqx);

    // Precession matrix P (mean J2000 -> mean of date)
    const rp = [
      [eqx[0], eqx[1], eqx[2]],
      [eqy[0], eqy[1], eqy[2]],
      [peqr[0], peqr[1], peqr[2]]
    ];

    // Apply frame bias: RPB = RP * B (GCRS -> mean of date)
    // First-order bias matrix from ltp_PBMAT (sub-μas accuracy)
    return [
      [
        rp[0][0] - rp[0][1] * DR06 + rp[0][2] * DX06,
        rp[0][0] * DR06 + rp[0][1] + rp[0][2] * DE06,
        -rp[0][0] * DX06 - rp[0][1] * DE06 + rp[0][2]
      ],
      [
        rp[1][0] - rp[1][1] * DR06 + rp[1][2] * DX06,
        rp[1][0] * DR06 + rp[1][1] + rp[1][2] * DE06,
        -rp[1][0] * DX06 - rp[1][1] * DE06 + rp[1][2]
      ],
      [
        rp[2][0] - rp[2][1] * DR06 + rp[2][2] * DX06,
        rp[2][0] * DR06 + rp[2][1] + rp[2][2] * DE06,
        -rp[2][0] * DX06 - rp[2][1] * DE06 + rp[2][2]
      ]
    ];
  }

  private getEclipticPole(t: number): Vec3 {
    let p = 0, q = 0;
    for (const [P, paCos, qaCos, paSin, qaSin] of V11_ECLIPTIC_PERIODIC) {
      const arg = (TWO_PI * t) / P;
      const c = Math.cos(arg), s = Math.sin(arg);
      p += c * paCos + s * paSin;
      q += c * qaCos + s * qaSin;
    }
    let w = 1;
    for (let i = 0; i < 4; i++) {
      p += V11_ECLIPTIC_POLYNOMIAL.pa[i] * w;
      q += V11_ECLIPTIC_POLYNOMIAL.qa[i] * w;
      w *= t;
    }
    p *= AS2R; q *= AS2R;
    const sE = Math.sin(EPS0), cE = Math.cos(EPS0);
    const z = Math.sqrt(Math.max(1.0 - p * p - q * q, 0));
    return [p, -q * cE - z * sE, -q * sE + z * cE];
  }

  private getEquatorPole(t: number): Vec3 {
    let x = 0, y = 0;
    for (const [P, xaCos, yaCos, xaSin, yaSin] of V11_EQUATOR_PERIODIC) {
      const arg = (TWO_PI * t) / P;
      const c = Math.cos(arg), s = Math.sin(arg);
      x += c * xaCos + s * xaSin;
      y += c * yaCos + s * yaSin;
    }
    let w = 1;
    for (let i = 0; i < 4; i++) {
      x += V11_EQUATOR_POLYNOMIAL.xa[i] * w;
      y += V11_EQUATOR_POLYNOMIAL.ya[i] * w;
      w *= t;
    }
    x *= AS2R; y *= AS2R;
    const z = Math.sqrt(Math.max(1.0 - x * x - y * y, 0));
    return [x, y, z];
  }

  private normalize(v: Vec3): Vec3 {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  private cross(a: Vec3, b: Vec3): Vec3 {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }
}
