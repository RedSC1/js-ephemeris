/**
 * OPV2 (Outer Planet V2) 解码器和求值器
 * 
 * 用于冥王星及未来可能的小行星数据。
 * 格式特点：Per-century 固定 PCA frame + per-segment scaled Chebyshev 系数。
 */
import { chebEval, chebDeriv } from '../math/chebyshev.js';
import { BinaryReader } from './reader.js';
import type { Vec3, StateVec } from '../types.js';

const AU_KM = 149597870.7;

/** JD 参考点（OPV2 格式中 jdStart/jdEnd 相对于此偏移存储） */
const JD_REFERENCE = 2461076;

export interface OPV2Segment {
  /** segment 起始 JD */
  a: number;
  /** segment 结束 JD */
  b: number;
  /** 三个分量的 Chebyshev 系数 [cx, cy, cz] (km) */
  coeffs: [Float64Array, Float64Array, Float64Array];
}

export interface OPV2CenturyData {
  magic: 'OPV2';
  bodyId: number;
  jdStart: number;
  jdEnd: number;
  /** 固定 PCA frame: u 向量 (J2000 equatorial) */
  uFix: Vec3;
  /** 固定 PCA frame: v 向量 (J2000 equatorial) */
  vFix: Vec3;
  /** 固定 PCA frame: w 向量 (J2000 equatorial) */
  wFix: Vec3;
  segments: OPV2Segment[];
}

/**
 * 解码一个分量的 scaled 系数
 * 格式: [float64 scale] [width_bytes] [mixed-width integers]
 * 真实系数 = integer / scale
 */
function decodeScaledComponent(reader: BinaryReader, nCoeffs: number): Float64Array {
  const scale = reader.readFloat64();

  // 宽度字节：每 4 个系数共享 1 字节（每个系数 2 bit）
  const nWidthBytes = Math.ceil(nCoeffs / 4);
  const widthBytes = new Uint8Array(nWidthBytes);
  for (let i = 0; i < nWidthBytes; i++) {
    widthBytes[i] = reader.readUint8();
  }

  const coeffs = new Float64Array(nCoeffs);
  for (let i = 0; i < nCoeffs; i++) {
    const widthCode = (widthBytes[i >> 2]! >> ((i & 3) * 2)) & 0x03;
    let intVal: number;

    if (widthCode === 0) {
      intVal = reader.readInt8();
    } else if (widthCode === 1) {
      intVal = reader.readInt16();
    } else if (widthCode === 2) {
      const b0 = reader.readUint8();
      const b1 = reader.readUint8();
      const b2 = reader.readUint8();
      let val = b0 | (b1 << 8) | (b2 << 16);
      if (val & 0x800000) val -= 0x1000000;
      intVal = val;
    } else {
      intVal = reader.readInt32();
    }

    coeffs[i] = intVal / scale;
  }

  return coeffs;
}

/**
 * 解析 OPV2 二进制数据
 */
export function parseOPV2(buffer: ArrayBuffer): OPV2CenturyData {
  const reader = new BinaryReader(buffer);

  // Magic: 'OPV2'
  const magic = String.fromCharCode(
    reader.readUint8(), reader.readUint8(), reader.readUint8(), reader.readUint8()
  );
  if (magic !== 'OPV2') throw new Error(`Bad magic: expected 'OPV2', got '${magic}'`);

  // Version
  const version = reader.readUint8();
  if (version !== 1) throw new Error(`Unsupported OPV2 version: ${version}`);

  // Body ID
  const bodyId = reader.readUint8();

  // JD range (stored as int32 offset from JD_REFERENCE)
  const jdStart = JD_REFERENCE + reader.readInt32();
  const jdEnd = JD_REFERENCE + reader.readInt32();

  // Number of segments
  const nSeg = reader.readUint32();

  // Fixed PCA frame vectors (3 × 3 float64)
  const uFix: Vec3 = [reader.readFloat64(), reader.readFloat64(), reader.readFloat64()];
  const vFix: Vec3 = [reader.readFloat64(), reader.readFloat64(), reader.readFloat64()];
  const wFix: Vec3 = [reader.readFloat64(), reader.readFloat64(), reader.readFloat64()];

  // Segment boundaries (nSeg × 2 float64)
  const boundaries: [number, number][] = [];
  for (let i = 0; i < nSeg; i++) {
    boundaries.push([reader.readFloat64(), reader.readFloat64()]);
  }

  // Segment degrees (nSeg × 3 uint8: degX, degY, degZ)
  const degrees: [number, number, number][] = [];
  for (let i = 0; i < nSeg; i++) {
    degrees.push([reader.readUint8(), reader.readUint8(), reader.readUint8()]);
  }

  // Segment coefficients
  const segments: OPV2Segment[] = [];
  for (let i = 0; i < nSeg; i++) {
    const [degX, degY, degZ] = degrees[i]!;
    const [a, b] = boundaries[i]!;

    const cx = decodeScaledComponent(reader, degX);
    const cy = decodeScaledComponent(reader, degY);
    const cz = decodeScaledComponent(reader, degZ);

    segments.push({ a, b, coeffs: [cx, cy, cz] });
  }

  return { magic: 'OPV2', bodyId, jdStart, jdEnd, uFix, vFix, wFix, segments };
}

/**
 * 二分查找 segment
 */
function findSegment(segments: OPV2Segment[], jd: number): OPV2Segment {
  let lo = 0, hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid]!;
    if (jd < seg.a) hi = mid - 1;
    else if (jd > seg.b) lo = mid + 1;
    else return seg;
  }
  // Clamp to nearest segment
  const idx = Math.max(0, Math.min(segments.length - 1, lo));
  return segments[idx]!;
}

/**
 * OPV2 求值：给定 JD 和世纪数据，返回 J2000 equatorial 坐标 (AU)
 * 
 * @param computeVelocity 是否同时计算速度 (AU/day)
 */
export function evalOPV2(
  jd: number,
  century: OPV2CenturyData,
  computeVelocity: boolean = false
): Vec3 | StateVec {
  const seg = findSegment(century.segments, jd);
  const dt = seg.b - seg.a;
  const x = (2 * jd - seg.a - seg.b) / dt;

  const { uFix, vFix, wFix } = century;
  const [cx, cy, cz] = seg.coeffs;

  // Local frame position (km)
  const lx = chebEval(cx, x);
  const ly = chebEval(cy, x);
  const lz = chebEval(cz, x);

  // Rotate to J2000 equatorial and convert to AU
  const pos: Vec3 = [
    (lx * uFix[0] + ly * vFix[0] + lz * wFix[0]) / AU_KM,
    (lx * uFix[1] + ly * vFix[1] + lz * wFix[1]) / AU_KM,
    (lx * uFix[2] + ly * vFix[2] + lz * wFix[2]) / AU_KM,
  ];

  if (!computeVelocity) return pos;

  // Velocity: dP/dt = dP/dx * dx/dt, where dx/dt = 2 / (b - a)
  const invDt2 = 2 / dt;
  const lvx = chebDeriv(cx, x) * invDt2;
  const lvy = chebDeriv(cy, x) * invDt2;
  const lvz = chebDeriv(cz, x) * invDt2;

  const vel: Vec3 = [
    (lvx * uFix[0] + lvy * vFix[0] + lvz * wFix[0]) / AU_KM,
    (lvx * uFix[1] + lvy * vFix[1] + lvz * wFix[1]) / AU_KM,
    (lvx * uFix[2] + lvy * vFix[2] + lvz * wFix[2]) / AU_KM,
  ];

  return [...pos, ...vel] as StateVec;
}
