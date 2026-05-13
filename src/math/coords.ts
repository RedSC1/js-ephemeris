import { Vec3 } from '../types';

const ECL_TO_EQ = [
  [1.0, 0.00000044036, -0.000000190919],
  [-0.000000479966, 0.917482137087, -0.397776982902],
  [0.0, 0.397776982902, 0.917482137087],
] as const;

const EQ_TO_ECL = [
  [1.0, -0.000000479966, 0.0],
  [0.00000044036, 0.917482137087, 0.397776982902],
  [-0.000000190919, -0.397776982902, 0.917482137087],
] as const;

const PI2 = 2 * Math.PI;

export function eclipticJ2000ToEquatorialJ2000(position: Vec3): Vec3 {
  const [x, y, z] = position;
  return [
    ECL_TO_EQ[0][0] * x + ECL_TO_EQ[0][1] * y + ECL_TO_EQ[0][2] * z,
    ECL_TO_EQ[1][0] * x + ECL_TO_EQ[1][1] * y + ECL_TO_EQ[1][2] * z,
    ECL_TO_EQ[2][0] * x + ECL_TO_EQ[2][1] * y + ECL_TO_EQ[2][2] * z,
  ];
}

export function equatorialJ2000ToEclipticJ2000(position: Vec3): Vec3 {
  const [x, y, z] = position;
  return [
    EQ_TO_ECL[0][0] * x + EQ_TO_ECL[0][1] * y + EQ_TO_ECL[0][2] * z,
    EQ_TO_ECL[1][0] * x + EQ_TO_ECL[1][1] * y + EQ_TO_ECL[1][2] * z,
    EQ_TO_ECL[2][0] * x + EQ_TO_ECL[2][1] * y + EQ_TO_ECL[2][2] * z,
  ];
}

export function rectToSpherical(position: Vec3): Vec3 {
  const [x, y, z] = position;
  const radius = Math.hypot(x, y, z);
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(z, Math.hypot(x, y));
  return [lon, lat, radius];
}

export function sphericalToRect(lon: number, lat: number, radius: number): Vec3 {
  const rCosLat = radius * Math.cos(lat);
  return [
    rCosLat * Math.cos(lon),
    rCosLat * Math.sin(lon),
    radius * Math.sin(lat),
  ];
}

export function wrapAngleRad(angle: number): number {
  return ((angle + Math.PI) % PI2 + PI2) % PI2 - Math.PI;
}
