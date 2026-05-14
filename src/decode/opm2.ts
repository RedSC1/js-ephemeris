import { chebEval, chebDeriv } from '../math/chebyshev.js';
import { BinaryReader } from './reader.js';
import type { Vec3, StateVec } from '../types.js';

const AU_KM = 149597870.7;

// Per-body quantization units (km)
const QUANT_UNITS: Record<number, number> = {
  1: 0.04,      // Mercury
  2: 0.08,      // Venus
  3: 0.08,      // Earth/EMB
  4: 0.13,      // Mars
  5: 0.55,      // Jupiter
  6: 1.0,       // Saturn
  7: 2.0,       // Uranus
  8: 3.2,       // Neptune
  9: 4.0,       // Pluto
  10: 0.0003,   // Moon (geocentric, 0.3 meters)
};
const DEFAULT_QUANT_UNIT = 0.04;

export interface OPM2ReferenceData {
  degXY: number;
  refCxInt: Int32Array;
  refCyInt: Int32Array;
}

export interface OPM2Segment {
  a: number; // segment start JD
  b: number; // segment end JD
  u: Vec3;
  v: Vec3;
  w: Vec3;
  resCxInt: Int32Array;
  resCyInt: Int32Array;
  fullCzInt: Int32Array;
}

export interface OPM2CenturyData {
  magic: 'OPM2';
  bodyId: number;
  jdStart: number;
  jdEnd: number;
  degXY: number;
  degZ: number;
  segments: OPM2Segment[];
}

function decodeFrameAngles(
  nodeLon: number,
  nodeLat: number,
  inPlaneAngle: number,
): { u: Vec3; v: Vec3; w: Vec3 } {
  const cosLat = Math.cos(nodeLat);
  const sinLat = Math.sin(nodeLat);
  const cosLon = Math.cos(nodeLon);
  const sinLon = Math.sin(nodeLon);

  const w: Vec3 = [
    cosLat * cosLon,
    cosLat * sinLon,
    sinLat,
  ];

  const useZ = Math.abs(w[2]) < 0.9;
  const refX = 0, refY = useZ ? 0 : 1, refZ = useZ ? 1 : 0;

  let bux = refY * w[2] - refZ * w[1];
  let buy = refZ * w[0] - refX * w[2];
  let buz = refX * w[1] - refY * w[0];
  let buLen = Math.sqrt(bux * bux + buy * buy + buz * buz);
  bux /= buLen; buy /= buLen; buz /= buLen;

  let bvx = w[1] * buz - w[2] * buy;
  let bvy = w[2] * bux - w[0] * buz;
  let bvz = w[0] * buy - w[1] * bux;
  let bvLen = Math.sqrt(bvx * bvx + bvy * bvy + bvz * bvz);
  bvx /= bvLen; bvy /= bvLen; bvz /= bvLen;

  const c = Math.cos(inPlaneAngle), s = Math.sin(inPlaneAngle);
  let ux = bux * c + bvx * s;
  let uy = buy * c + bvy * s;
  let uz = buz * c + bvz * s;
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  ux /= uLen; uy /= uLen; uz /= uLen;

  let vx = w[1] * uz - w[2] * uy;
  let vy = w[2] * ux - w[0] * uz;
  let vz = w[0] * uy - w[1] * ux;
  const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
  vx /= vLen; vy /= vLen; vz /= vLen;

  return { u: [ux, uy, uz], v: [vx, vy, vz], w };
}

function decodeMixedWidthIntegers(reader: BinaryReader, nCoeffs: number): Int32Array {
  const nWidthBytes = Math.ceil(nCoeffs / 4);
  const widthBytes = new Uint8Array(nWidthBytes);
  for (let i = 0; i < nWidthBytes; i++) widthBytes[i] = reader.readUint8();

  const integers = new Int32Array(nCoeffs);
  for (let i = 0; i < nCoeffs; i++) {
    const widthCode = (widthBytes[i >> 2]! >> ((i & 3) * 2)) & 0x03;
    if (widthCode === 0) integers[i] = reader.readInt8();
    else if (widthCode === 1) integers[i] = reader.readInt16();
    else if (widthCode === 2) {
      const b0 = reader.readUint8(), b1 = reader.readUint8(), b2 = reader.readUint8();
      let val = b0 | (b1 << 8) | (b2 << 16);
      if (val & 0x800000) val -= 0x1000000;
      integers[i] = val;
    } else integers[i] = reader.readInt32();
  }
  return integers;
}

export function parseOPM2(buffer: ArrayBuffer): OPM2CenturyData {
  const reader = new BinaryReader(buffer);
  const magic = String.fromCharCode(reader.readUint8(), reader.readUint8(), reader.readUint8(), reader.readUint8());
  if (magic !== 'OPM2') throw new Error(`Bad magic: ${magic}`);
  
  const version = reader.readUint8();
  if (version !== 1) throw new Error(`Unsupported OPM2 version: ${version}`);
  
  const bodyId = reader.readUint8();
  const jdStart = reader.readFloat64();
  const jdEnd = reader.readFloat64();
  const nSeg = reader.readUint16();
  const degXY = reader.readUint8();
  const degZ = reader.readUint8();

  const segments: OPM2Segment[] = new Array(nSeg);
  for (let si = 0; si < nSeg; si++) {
    const a = reader.readFloat64();
    const b = reader.readFloat64();
    const frame = decodeFrameAngles(reader.readFloat64(), reader.readFloat64(), reader.readFloat64());
    segments[si] = {
      a, b, u: frame.u, v: frame.v, w: frame.w,
      resCxInt: decodeMixedWidthIntegers(reader, degXY + 1),
      resCyInt: decodeMixedWidthIntegers(reader, degXY + 1),
      fullCzInt: decodeMixedWidthIntegers(reader, degZ + 1),
    };
  }
  return { magic: 'OPM2', bodyId, jdStart, jdEnd, degXY, degZ, segments };
}

function findSegment(segments: OPM2Segment[], jd: number): OPM2Segment {
  let lo = 0, hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid]!;
    if (jd < seg.a) hi = mid - 1;
    else if (jd > seg.b) lo = mid + 1;
    else return seg;
  }
  return segments[Math.max(0, Math.min(segments.length - 1, lo))]!;
}

export function evalOPM2(
  jd: number,
  century: OPM2CenturyData,
  ref: OPM2ReferenceData | null,
  computeVelocity: boolean = false
): Vec3 | StateVec {
  const seg = findSegment(century.segments, jd);
  const dt = seg.b - seg.a;
  const x = (2 * jd - seg.a - seg.b) / dt;
  const unit = QUANT_UNITS[century.bodyId] ?? DEFAULT_QUANT_UNIT;

  const nXY = century.degXY + 1, nZ = century.degZ + 1;
  const cx = new Float64Array(nXY), cy = new Float64Array(nXY), cz = new Float64Array(nZ);

  for (let i = 0; i < nXY; i++) {
    cx[i] = (seg.resCxInt[i]! + (ref?.refCxInt[i] ?? 0)) * unit;
    cy[i] = (seg.resCyInt[i]! + (ref?.refCyInt[i] ?? 0)) * unit;
  }
  for (let i = 0; i < nZ; i++) cz[i] = seg.fullCzInt[i]! * unit;

  const lx = chebEval(cx, x), ly = chebEval(cy, x), lz = chebEval(cz, x);
  const [ux, uy, uz] = seg.u, [vx, vy, vz] = seg.v, [wx, wy, wz] = seg.w;

  const pos: Vec3 = [
    (lx * ux + ly * vx + lz * wx) / AU_KM,
    (lx * uy + ly * vy + lz * wy) / AU_KM,
    (lx * uz + ly * vz + lz * wz) / AU_KM,
  ];

  if (!computeVelocity) return pos;

  // Velocity in local frame (km/unit_time)
  // chebDeriv gives dP/dx, we need dP/dt = dP/dx * dx/dt
  // Since x = (2t - a - b) / (b - a), dx/dt = 2 / (b - a)
  const invDt2 = 2 / dt;
  const lvx = chebDeriv(cx, x) * invDt2;
  const lvy = chebDeriv(cy, x) * invDt2;
  const lvz = chebDeriv(cz, x) * invDt2;

  const vel: Vec3 = [
    (lvx * ux + lvy * vx + lvz * wx) / AU_KM,
    (lvx * uy + lvy * vy + lvz * wy) / AU_KM,
    (lvx * uz + lvy * vz + lvz * wz) / AU_KM,
  ];

  return [...pos, ...vel] as StateVec;
}
