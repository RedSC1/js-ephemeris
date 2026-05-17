/**
 * Moshier PLAN404 半解析星历算法 (TypeScript 移植)
 *
 * 原始代码: Steve Moshier, "Astronomical Algorithms" (aa-56), 1996
 * 基于 DE404 拟合的三角级数展开，输出 J2000 黄道日心坐标 (L, B, R)
 *
 * 核心优势：不发散（T 只出现在振幅多项式中，不在角频率中）
 * 精度：±1500年内 0.07" peak，±5000年内 ~2" (加多项式修正后)
 *
 * 算法概要：
 * 1. 计算9颗行星的平均经度 (基本角)
 * 2. 用递推公式预计算 sin(k*L), cos(k*L) 的倍角表
 * 3. 遍历参数表，组合角度并累加三角级数
 * 4. 输出黄经(rad)、黄纬(rad)、日心距(AU)
 */

/*
 * 注意：本文件大量使用数组索引访问进行数值计算，
 * 所有索引都在已知范围内，不会越界。
 */
/* eslint-disable */
// @ts-nocheck — 纯数值计算代码，所有数组索引都在已知范围内

/** 弧秒转弧度 */
const STR = 4.8481368110953599359e-6;

/** J2000.0 儒略日 */
const J2000 = 2451545.0;

/** 将角秒值归约到 [0, 1296000) 范围 */
function mods3600(x: number): number {
  return x - 1.296e6 * Math.floor(x / 1.296e6);
}

/**
 * 行星表数据结构
 */
export interface PlanetTable {
  maxargs: number;
  max_harmonic: number[];
  max_power_of_t: number;
  arg_tbl: number[];
  lon_tbl: number[];
  lat_tbl: number[];
  rad_tbl: number[];
  distance: number;
  timescale: number;
  trunclvl: number;
}

/**
 * 9颗行星的平均角速度 (角秒/万儒略年)
 * 来源: Simon et al (1994)
 */
const freqs = [
  53810162868.8982,   // Mercury
  21066413643.3548,   // Venus
  12959774228.3429,   // Earth
  6890507749.3988,    // Mars
  1092566037.7991,    // Jupiter
  439960985.5372,     // Saturn
  154248119.3933,     // Uranus
  78655032.0744,      // Neptune
  52272245.1795,      // Moon's mean longitude argument
];

/**
 * J2000.0 时刻的初始相位 (角秒)
 */
const phases = [
  252.25090552 * 3600,
  181.97980085 * 3600,
  100.46645683 * 3600,
  355.43299958 * 3600,
  34.35151874 * 3600,
  50.07744430 * 3600,
  314.05500511 * 3600,
  304.34866548 * 3600,
  860492.1546,
];

/** sin/cos 倍角查找表 [行星索引][谐波次数-1] */
const NARGS = 18;
const ss: number[][] = Array.from({ length: NARGS }, () => new Array(31).fill(0));
const cc: number[][] = Array.from({ length: NARGS }, () => new Array(31).fill(0));

/**
 * 预计算 sin(k*arg) 和 cos(k*arg)，k = 1, 2, ..., n
 * 使用递推公式：只需要一次 sin/cos 调用，后续全用乘法
 */
function sscc(k: number, arg: number, n: number): void {
  const su = Math.sin(arg);
  const cu = Math.cos(arg);
  ss[k][0] = su;
  cc[k][0] = cu;

  let sv = 2.0 * su * cu;
  let cv = cu * cu - su * su;
  ss[k][1] = sv;
  cc[k][1] = cv;

  for (let i = 2; i < n; i++) {
    const s = su * cv + cu * sv;
    cv = cu * cv - su * sv;
    sv = s;
    ss[k][i] = sv;
    cc[k][i] = cv;
  }
}

/**
 * 计算行星的日心黄道 J2000 坐标 (gplan 函数)
 *
 * 用于 Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
 * 这些行星的 arg_tbl 只引用前9个基本角 (行星平均经度)
 *
 * @param jd - 儒略日 (TDB)
 * @param plan - 行星数据表
 * @returns [longitude(rad), latitude(rad), radius(AU)]
 */
export function gplan(jd: number, plan: PlanetTable): [number, number, number] {
  const T = (jd - J2000) / plan.timescale;
  const n = plan.maxargs;

  // 1. 计算每颗行星的平均经度，预计算倍角 sin/cos
  for (let i = 0; i < n; i++) {
    const j = plan.max_harmonic[i];
    if (j > 0) {
      const sr = (mods3600(freqs[i] * T) + phases[i]) * STR;
      sscc(i, sr, j);
    }
  }

  // 2. 遍历参数表，累加三角级数
  const arg = plan.arg_tbl;
  const lonTbl = plan.lon_tbl;
  const latTbl = plan.lat_tbl;
  const radTbl = plan.rad_tbl;
  let pL = 0, pB = 0, pR = 0, pA = 0;
  let sl = 0.0, sb = 0.0, sr = 0.0;

  for (;;) {
    const np = arg[pA++];
    if (np < 0) break;

    if (np === 0) {
      // 多项式项 (非周期趋势)
      const nt = arg[pA++];
      let cuL = lonTbl[pL++];
      for (let ip = 0; ip < nt; ip++) cuL = cuL * T + lonTbl[pL++];
      sl += mods3600(cuL);

      let cuB = latTbl[pB++];
      for (let ip = 0; ip < nt; ip++) cuB = cuB * T + latTbl[pB++];
      sb += cuB;

      let cuR = radTbl[pR++];
      for (let ip = 0; ip < nt; ip++) cuR = cuR * T + radTbl[pR++];
      sr += cuR;
      continue;
    }

    // 组合角度
    let cv = 0.0, sv = 0.0, k1 = 0;
    for (let ip = 0; ip < np; ip++) {
      const j = arg[pA++];
      const m = arg[pA++] - 1;
      if (j !== 0) {
        const k = (j < 0 ? -j : j) - 1;
        let su = ss[m][k];
        if (j < 0) su = -su;
        const cu2 = cc[m][k];
        if (k1 === 0) { sv = su; cv = cu2; k1 = 1; }
        else { const t = su * cv + cu2 * sv; cv = cu2 * cv - su * sv; sv = t; }
      }
    }

    const nt = arg[pA++];

    // 经度: amplitude_cos * cos(angle) + amplitude_sin * sin(angle)
    let cuL = lonTbl[pL++], suL = lonTbl[pL++];
    for (let ip = 0; ip < nt; ip++) { cuL = cuL * T + lonTbl[pL++]; suL = suL * T + lonTbl[pL++]; }
    sl += cuL * cv + suL * sv;

    // 纬度
    let cuB = latTbl[pB++], suB = latTbl[pB++];
    for (let ip = 0; ip < nt; ip++) { cuB = cuB * T + latTbl[pB++]; suB = suB * T + latTbl[pB++]; }
    sb += cuB * cv + suB * sv;

    // 距离
    let cuR = radTbl[pR++], suR = radTbl[pR++];
    for (let ip = 0; ip < nt; ip++) { cuR = cuR * T + radTbl[pR++]; suR = suR * T + radTbl[pR++]; }
    sr += cuR * cv + suR * sv;
  }

  return [STR * sl, STR * sb, STR * plan.distance * sr + plan.distance];
}

/**
 * 计算行星的日心黄道 J2000 坐标 (g3plan 函数)
 *
 * 用于 Earth (ear404) — 需要完整的 mean_elements 计算所有18个基本角
 *
 * @param jd - 儒略日 (TDB)
 * @param plan - 行星数据表
 * @param objnum - 天体编号 (Earth=3)，用于加上平均经度
 * @returns [longitude(rad), latitude(rad), radius(AU)]
 */
export function g3plan(jd: number, plan: PlanetTable, objnum: number): [number, number, number] {
  const T = (jd - J2000) / plan.timescale;
  const n = plan.maxargs;

  // 1. 计算所有基本角 (包括月球参数)
  const Args = meanElements(jd);

  // 2. 预计算倍角
  for (let i = 0; i < n; i++) {
    const j = plan.max_harmonic[i];
    if (j > 0) {
      sscc(i, Args[i], j);
    }
  }

  // 3. 遍历参数表
  const arg = plan.arg_tbl;
  const lonTbl = plan.lon_tbl;
  const latTbl = plan.lat_tbl;
  const radTbl = plan.rad_tbl;
  let pL = 0, pB = 0, pR = 0, pA = 0;
  let sl = 0.0, sb = 0.0, sr = 0.0;

  for (;;) {
    const np = arg[pA++];
    if (np < 0) break;

    if (np === 0) {
      const nt = arg[pA++];
      // g3plan 的多项式项不做 mods3600
      let cuL = lonTbl[pL++];
      for (let ip = 0; ip < nt; ip++) cuL = cuL * T + lonTbl[pL++];
      sl += cuL;

      let cuB = latTbl[pB++];
      for (let ip = 0; ip < nt; ip++) cuB = cuB * T + latTbl[pB++];
      sb += cuB;

      let cuR = radTbl[pR++];
      for (let ip = 0; ip < nt; ip++) cuR = cuR * T + radTbl[pR++];
      sr += cuR;
      continue;
    }

    let cv = 0.0, sv = 0.0, k1 = 0;
    for (let ip = 0; ip < np; ip++) {
      const j = arg[pA++];
      const m = arg[pA++] - 1;
      if (j !== 0) {
        const k = (j < 0 ? -j : j) - 1;
        let su = ss[m][k];
        if (j < 0) su = -su;
        const cu2 = cc[m][k];
        if (k1 === 0) { sv = su; cv = cu2; k1 = 1; }
        else { const t = su * cv + cu2 * sv; cv = cu2 * cv - su * sv; sv = t; }
      }
    }

    const nt = arg[pA++];

    let cuL = lonTbl[pL++], suL = lonTbl[pL++];
    for (let ip = 0; ip < nt; ip++) { cuL = cuL * T + lonTbl[pL++]; suL = suL * T + lonTbl[pL++]; }
    sl += cuL * cv + suL * sv;

    let cuB = latTbl[pB++], suB = latTbl[pB++];
    for (let ip = 0; ip < nt; ip++) { cuB = cuB * T + latTbl[pB++]; suB = suB * T + latTbl[pB++]; }
    sb += cuB * cv + suB * sv;

    let cuR = radTbl[pR++], suR = radTbl[pR++];
    for (let ip = 0; ip < nt; ip++) { cuR = cuR * T + radTbl[pR++]; suR = suR * T + radTbl[pR++]; }
    sr += cuR * cv + suR * sv;
  }

  // 4. g3plan 输出：加上天体自身的平均经度
  const t = plan.trunclvl;
  return [
    Args[objnum - 1] + STR * t * sl,
    STR * t * sb,
    plan.distance * (1.0 + STR * t * sr),
  ];
}

/**
 * 计算所有18个基本角 (mean_elements)
 *
 * [0-7]  8颗行星平均经度 (Mercury ~ Neptune)
 * [9]    月球平均角距 D
 * [10]   月球升交点距离 F
 * [11]   太阳平均近点角 l'
 * [12]   月球平均近点角 l
 * [13]   月球平均经度 L
 * [14-17] 自由天平动参数
 *
 * @returns 18个基本角 (弧度)
 */
export function meanElements(jd: number): number[] {
  const T = (jd - J2000) / 36525.0;
  const T2 = T * T;
  const Args = new Array<number>(NARGS).fill(0);
  let x: number;

  // Mercury
  x = mods3600(538101628.6889819 * T + 908103.213);
  x += (6.39e-6 * T - 0.0192789) * T2;
  Args[0] = STR * x;

  // Venus
  x = mods3600(210664136.4335482 * T + 655127.236);
  x += (-6.27e-6 * T + 0.0059381) * T2;
  Args[1] = STR * x;

  // Earth
  x = mods3600(129597742.283429 * T + 361679.198);
  x += (-5.23e-6 * T - 2.04411e-2) * T2;
  Args[2] = STR * x;

  // Mars
  x = mods3600(68905077.493988 * T + 1279558.751);
  x += (-1.043e-5 * T + 0.0094264) * T2;
  Args[3] = STR * x;

  // Jupiter
  x = mods3600(10925660.377991 * T + 123665.420);
  x += ((((-3.4e-10 * T + 5.91e-8) * T + 4.667e-6) * T + 5.706e-5) * T - 3.060378e-1) * T2;
  Args[4] = STR * x;

  // Saturn
  x = mods3600(4399609.855372 * T + 180278.752);
  x += ((((8.3e-10 * T - 1.452e-7) * T - 1.1484e-5) * T - 1.6618e-4) * T + 7.561614e-1) * T2;
  Args[5] = STR * x;

  // Uranus
  x = mods3600(1542481.193933 * T + 1130597.971) + (0.00002156 * T - 0.0175083) * T2;
  Args[6] = STR * x;

  // Neptune
  x = mods3600(786550.320744 * T + 1095655.149) + (-0.00000895 * T + 0.0021103) * T2;
  Args[7] = STR * x;

  // Mean elongation of moon = D
  x = mods3600(1.6029616009939659e+09 * T + 1.0722612202445078e+06);
  x += (((((-3.207663637426e-13 * T + 2.555243317839e-11) * T + 2.560078201452e-9) * T
    - 3.702060118571e-5) * T + 6.9492746836058421e-3) * T - 6.7352202374457519e+0) * T2;
  Args[9] = STR * x;

  // Mean distance of moon from ascending node = F
  x = mods3600(1.7395272628437717e+09 * T + 3.3577951412884740e+05);
  x += (((((4.474984866301e-13 * T + 4.189032191814e-11) * T - 2.790392351314e-9) * T
    - 2.165750777942e-6) * T - 7.5311878482337989e-4) * T - 1.3117809789650071e+1) * T2;
  Args[10] = STR * x;

  // Mean anomaly of sun = l'
  x = mods3600(1.2959658102304320e+08 * T + 1.2871027407441526e+06);
  x += ((((((((1.62e-20 * T - 1.0390e-17) * T - 3.83508e-15) * T + 4.237343e-13) * T
    + 8.8555011e-11) * T - 4.77258489e-8) * T - 1.1297037031e-5) * T
    + 8.7473717367324703e-5) * T - 5.5281306421783094e-1) * T2;
  Args[11] = STR * x;

  // Mean anomaly of moon = l
  x = mods3600(1.7179159228846793e+09 * T + 4.8586817465825332e+05);
  x += (((((-1.755312760154e-12 * T + 3.452144225877e-11) * T - 2.506365935364e-8) * T
    - 2.536291235258e-4) * T + 5.2099641302735818e-2) * T + 3.1501359071894147e+1) * T2;
  Args[12] = STR * x;

  // Mean longitude of moon (re ecliptic and equinox of date) = L
  x = mods3600(1.7325643720442266e+09 * T + 7.8593980921052420e+05);
  x += (((((7.200592540556e-14 * T + 2.235210987108e-10) * T - 1.024222633731e-8) * T
    - 6.073960534117e-5) * T + 6.9017248528380490e-3) * T - 5.6550460027471399e+0) * T2;
  Args[13] = STR * x;

  // Free librations
  x = mods3600(4.48175409e7 * T + 8.060457e5);
  Args[14] = STR * x;

  x = mods3600(5.36486787e6 * T - 391702.8);
  Args[15] = STR * x;

  x = mods3600(1.73573e6 * T);
  Args[17] = STR * x;

  return Args;
}


// ─── Moon (g2plan + g1plan + gmoon) ─────────────────────────────────────────

/**
 * 月球经度+距离数据表 (g2plan 格式)
 * lon_tbl 和 rad_tbl 是 long (整数)，没有 lat_tbl
 */
export interface MoonLRTable {
  maxargs: number;
  max_harmonic: number[];
  max_power_of_t: number;
  arg_tbl: number[];
  lon_tbl: number[];  // 整数振幅
  rad_tbl: number[];  // 整数振幅
  distance: number;
  timescale: number;
  trunclvl: number;
}

/**
 * 月球纬度数据表 (g1plan 格式)
 * 只有 lon_tbl (整数)
 */
export interface MoonLatTable {
  maxargs: number;
  max_harmonic: number[];
  max_power_of_t: number;
  arg_tbl: number[];
  lon_tbl: number[];  // 整数振幅
  distance: number;
  timescale: number;
  trunclvl: number;
}

/** 月球平均经度 (角秒, ecliptic of date) — 由 meanElements 计算 */
let LP_equinox = 0;
/** 岁差 (弧度) — 由 meanElements 计算 */
let pA_precession = 0;

/**
 * 扩展版 meanElements，同时保存 LP_equinox 和 pA_precession
 * (供 gmoon 使用)
 */
function meanElementsMoon(jd: number): number[] {
  const T = (jd - J2000) / 36525.0;
  const T2 = T * T;
  const Args = new Array<number>(NARGS).fill(0);
  let x: number;

  // Mercury ~ Neptune (同 meanElements)
  x = mods3600(538101628.6889819 * T + 908103.213);
  x += (6.39e-6 * T - 0.0192789) * T2;
  Args[0] = STR * x;

  x = mods3600(210664136.4335482 * T + 655127.236);
  x += (-6.27e-6 * T + 0.0059381) * T2;
  Args[1] = STR * x;

  x = mods3600(129597742.283429 * T + 361679.198);
  x += (-5.23e-6 * T - 2.04411e-2) * T2;
  Args[2] = STR * x;

  x = mods3600(68905077.493988 * T + 1279558.751);
  x += (-1.043e-5 * T + 0.0094264) * T2;
  Args[3] = STR * x;

  x = mods3600(10925660.377991 * T + 123665.420);
  x += ((((-3.4e-10 * T + 5.91e-8) * T + 4.667e-6) * T + 5.706e-5) * T - 3.060378e-1) * T2;
  Args[4] = STR * x;

  x = mods3600(4399609.855372 * T + 180278.752);
  x += ((((8.3e-10 * T - 1.452e-7) * T - 1.1484e-5) * T - 1.6618e-4) * T + 7.561614e-1) * T2;
  Args[5] = STR * x;

  x = mods3600(1542481.193933 * T + 1130597.971) + (0.00002156 * T - 0.0175083) * T2;
  Args[6] = STR * x;

  x = mods3600(786550.320744 * T + 1095655.149) + (-0.00000895 * T + 0.0021103) * T2;
  Args[7] = STR * x;

  // D
  x = mods3600(1.6029616009939659e+09 * T + 1.0722612202445078e+06);
  x += (((((-3.207663637426e-13 * T + 2.555243317839e-11) * T + 2.560078201452e-9) * T
    - 3.702060118571e-5) * T + 6.9492746836058421e-3) * T - 6.7352202374457519e+0) * T2;
  Args[9] = STR * x;

  // F
  x = mods3600(1.7395272628437717e+09 * T + 3.3577951412884740e+05);
  x += (((((4.474984866301e-13 * T + 4.189032191814e-11) * T - 2.790392351314e-9) * T
    - 2.165750777942e-6) * T - 7.5311878482337989e-4) * T - 1.3117809789650071e+1) * T2;
  Args[10] = STR * x;

  // l'
  x = mods3600(1.2959658102304320e+08 * T + 1.2871027407441526e+06);
  x += ((((((((1.62e-20 * T - 1.0390e-17) * T - 3.83508e-15) * T + 4.237343e-13) * T
    + 8.8555011e-11) * T - 4.77258489e-8) * T - 1.1297037031e-5) * T
    + 8.7473717367324703e-5) * T - 5.5281306421783094e-1) * T2;
  Args[11] = STR * x;

  // l
  x = mods3600(1.7179159228846793e+09 * T + 4.8586817465825332e+05);
  x += (((((-1.755312760154e-12 * T + 3.452144225877e-11) * T - 2.506365935364e-8) * T
    - 2.536291235258e-4) * T + 5.2099641302735818e-2) * T + 3.1501359071894147e+1) * T2;
  Args[12] = STR * x;

  // L (Moon mean longitude) — 保存到 LP_equinox
  x = mods3600(1.7325643720442266e+09 * T + 7.8593980921052420e+05);
  x += (((((7.200592540556e-14 * T + 2.235210987108e-10) * T - 1.024222633731e-8) * T
    - 6.073960534117e-5) * T + 6.9017248528380490e-3) * T - 5.6550460027471399e+0) * T2;
  LP_equinox = x;
  Args[13] = STR * x;

  // Precession
  x = (((((((((- 8.66e-20 * T - 4.759e-17) * T + 2.424e-15) * T + 1.3095e-12) * T
    + 1.7451e-10) * T - 1.8055e-8) * T - 0.0000235316) * T + 0.000076) * T
    + 1.105414) * T + 5028.791959) * T;
  pA_precession = STR * x;

  // Free librations
  x = mods3600(4.48175409e7 * T + 8.060457e5);
  Args[14] = STR * x;
  x = mods3600(5.36486787e6 * T - 391702.8);
  Args[15] = STR * x;
  x = mods3600(1.73573e6 * T);
  Args[17] = STR * x;

  return Args;
}

/**
 * g2plan: 计算月球经度和距离 (两个变量的三角级数)
 * 振幅表是整数 (long)
 */
function g2plan(jd: number, plan: MoonLRTable): [number, number] {
  const T = (jd - J2000) / plan.timescale;
  const n = plan.maxargs;
  const Args = meanElementsMoon(jd);

  for (let i = 0; i < n; i++) {
    const j = plan.max_harmonic[i];
    if (j > 0) sscc(i, Args[i], j);
  }

  const arg = plan.arg_tbl;
  const lonTbl = plan.lon_tbl;
  const radTbl = plan.rad_tbl;
  let pL = 0, pR = 0, pA = 0;
  let sl = 0.0, sr = 0.0;

  for (;;) {
    const np = arg[pA++];
    if (np < 0) break;

    if (np === 0) {
      const nt = arg[pA++];
      let cu = lonTbl[pL++];
      for (let ip = 0; ip < nt; ip++) cu = cu * T + lonTbl[pL++];
      sl += cu;
      cu = radTbl[pR++];
      for (let ip = 0; ip < nt; ip++) cu = cu * T + radTbl[pR++];
      sr += cu;
      continue;
    }

    let cv = 0.0, sv = 0.0, k1 = 0;
    for (let ip = 0; ip < np; ip++) {
      const j = arg[pA++];
      const m = arg[pA++] - 1;
      if (j !== 0) {
        const k = (j < 0 ? -j : j) - 1;
        let su = ss[m][k];
        if (j < 0) su = -su;
        const cu2 = cc[m][k];
        if (k1 === 0) { sv = su; cv = cu2; k1 = 1; }
        else { const t2 = su * cv + cu2 * sv; cv = cu2 * cv - su * sv; sv = t2; }
      }
    }

    const nt = arg[pA++];
    let cuL = lonTbl[pL++], suL = lonTbl[pL++];
    for (let ip = 0; ip < nt; ip++) { cuL = cuL * T + lonTbl[pL++]; suL = suL * T + lonTbl[pL++]; }
    sl += cuL * cv + suL * sv;

    let cuR = radTbl[pR++], suR = radTbl[pR++];
    for (let ip = 0; ip < nt; ip++) { cuR = cuR * T + radTbl[pR++]; suR = suR * T + radTbl[pR++]; }
    sr += cuR * cv + suR * sv;
  }

  const t = plan.trunclvl;
  return [t * sl, t * sr];
}

/**
 * g1plan: 计算月球纬度 (单变量三角级数)
 * 振幅表是整数 (long)
 */
function g1plan(jd: number, plan: MoonLatTable): number {
  const T = (jd - J2000) / plan.timescale;
  const Args = meanElementsMoon(jd);

  for (let i = 0; i < NARGS; i++) {
    const j = plan.max_harmonic[i];
    if (j > 0) sscc(i, Args[i], j);
  }

  const arg = plan.arg_tbl;
  const lonTbl = plan.lon_tbl;
  let pL = 0, pA = 0;
  let sl = 0.0;

  for (;;) {
    const np = arg[pA++];
    if (np < 0) break;

    if (np === 0) {
      const nt = arg[pA++];
      let cu = lonTbl[pL++];
      for (let ip = 0; ip < nt; ip++) cu = cu * T + lonTbl[pL++];
      sl += cu;
      continue;
    }

    let cv = 0.0, sv = 0.0, k1 = 0;
    for (let ip = 0; ip < np; ip++) {
      const j = arg[pA++];
      const m = arg[pA++] - 1;
      if (j !== 0) {
        const k = (j < 0 ? -j : j) - 1;
        let su = ss[m][k];
        if (j < 0) su = -su;
        const cu2 = cc[m][k];
        if (k1 === 0) { sv = su; cv = cu2; k1 = 1; }
        else { const t2 = su * cv + cu2 * sv; cv = cu2 * cv - su * sv; sv = t2; }
      }
    }

    const nt = arg[pA++];
    let cu = lonTbl[pL++], su = lonTbl[pL++];
    for (let ip = 0; ip < nt; ip++) { cu = cu * T + lonTbl[pL++]; su = su * T + lonTbl[pL++]; }
    sl += cu * cv + su * sv;
  }

  return plan.trunclvl * sl;
}

/**
 * 计算 obliquity of the ecliptic (黄赤交角)
 * Williams (1994) / DE403 公式
 */
function obliquity(jd: number): number {
  let T = (jd - J2000) / 36525.0;
  T /= 10.0; // 千年
  const eps = ((((((((( 2.45e-10*T + 5.79e-9)*T + 2.787e-7)*T
    + 7.12e-7)*T - 3.905e-5)*T - 2.4967e-3)*T
    - 5.138e-3)*T + 1.9989)*T - 0.0175)*T - 468.33960)*T
    + 84381.406173;
  return eps * STR; // radians
}

/**
 * 岁差旋转: equatorial of date → J2000 equatorial
 * 使用 Williams (1994) / DE403 岁差常数
 */
function precessToJ2000(rect: [number, number, number], jd: number): [number, number, number] {
  if (jd === J2000) return rect;

  let T = (jd - J2000) / 36525.0;

  // 1. Equatorial of date → Ecliptic of date (用 of-date obliquity)
  const epsDate = obliquity(jd);
  const cosEd = Math.cos(epsDate);
  const sinEd = Math.sin(epsDate);

  let x0 = rect[0];
  let x1 = cosEd * rect[1] + sinEd * rect[2];
  let x2 = -sinEd * rect[1] + cosEd * rect[2];

  // 2. 岁差旋转 (ecliptic of date → ecliptic of J2000)
  T /= 10.0; // 千年

  // pA: precession in longitude (Williams/DE403)
  const pAcof = [
    -8.66e-10, -4.759e-8, 2.424e-7, 1.3095e-5, 1.7451e-4, -1.8055e-3,
    -0.235316, 0.076, 110.5414, 50287.91959
  ];
  let pA = pAcof[0];
  for (let i = 1; i < 10; i++) pA = pA * T + pAcof[i];
  pA *= STR * T;

  // W: node of moving ecliptic on J2000 ecliptic
  const nodecof = [
    6.6402e-16, -2.69151e-15, -1.547021e-12, 7.521313e-12, 1.9e-10,
    -3.54e-9, -1.8103e-7, 1.26e-7, 7.436169e-5,
    -0.04207794833, 3.052115282424
  ];
  let W = nodecof[0];
  for (let i = 1; i < 11; i++) W = W * T + nodecof[i];

  // inclination of moving ecliptic
  const inclcof = [
    1.2147e-16, 7.3759e-17, -8.26287e-14, 2.503410e-13, 2.4650839e-11,
    -5.4000441e-11, 1.32115526e-9, -6.012e-7, -1.62442e-5,
    0.00227850649, 0.0
  ];
  let incl = inclcof[0];
  for (let i = 1; i < 11; i++) incl = incl * T + inclcof[i];

  // Rotate to the node (z-axis rotation by W + pA)
  let z = W + pA;
  let B = Math.cos(z);
  let A = Math.sin(z);
  z = B * x0 + A * x1;
  x1 = -A * x0 + B * x1;
  x0 = z;

  // Rotate about x-axis by -inclination
  B = Math.cos(-incl);
  A = Math.sin(-incl);
  z = B * x1 + A * x2;
  x2 = -A * x1 + B * x2;
  x1 = z;

  // Rotate back from node (z-axis rotation by -W)
  z = -W;
  B = Math.cos(z);
  A = Math.sin(z);
  z = B * x0 + A * x1;
  x1 = -A * x0 + B * x1;
  x0 = z;

  // 3. Ecliptic of J2000 → Equatorial of J2000
  const epsJ2000 = obliquity(J2000);
  const cosE0 = Math.cos(epsJ2000);
  const sinE0 = Math.sin(epsJ2000);

  z = cosE0 * x1 - sinE0 * x2;
  x2 = sinE0 * x1 + cosE0 * x2;
  x1 = z;

  return [x0, x1, x2];
}

/**
 * 计算月球地心 J2000 equatorial 坐标
 *
 * 算法：
 * 1. g2plan → 经度 + 距离 (ecliptic of date)
 * 2. g1plan → 纬度 (ecliptic of date)
 * 3. 转为 equatorial of date (用 of-date obliquity)
 * 4. precess 旋转到 J2000 equatorial
 *
 * @param jd - 儒略日 (TDB)
 * @param moonlrTbl - 月球经度+距离表
 * @param moonlatTbl - 月球纬度表
 * @returns [x, y, z] in AU (geocentric, J2000 equatorial)
 */
export function gmoon(
  jd: number,
  moonlrTbl: MoonLRTable,
  moonlatTbl: MoonLatTable,
): [number, number, number] {
  // 1. 计算经度和距离 (ecliptic of date)
  const [polLon, polRad] = g2plan(jd, moonlrTbl);

  // 经度 = g2plan 结果 + 月球平均经度 (LP_equinox)
  let lonAS = polLon + LP_equinox;
  if (lonAS < -6.48e5) lonAS += 1.296e6;
  if (lonAS > 6.48e5) lonAS -= 1.296e6;
  const lon = STR * lonAS; // radians, ecliptic of date

  // 2. 纬度 (ecliptic of date)
  const lat = STR * g1plan(jd, moonlatTbl);

  // 3. 距离 (AU)
  const dist = (1.0 + STR * polRad) * moonlrTbl.distance;

  // 4. Ecliptic of date → Equatorial of date
  const epsDate = obliquity(jd);
  const cosEps = Math.cos(epsDate);
  const sinEps = Math.sin(epsDate);

  const cosB = Math.cos(lat);
  const sinB = Math.sin(lat);
  const cosL = Math.cos(lon);
  const sinL = Math.sin(lon);

  const xEcl = dist * cosB * cosL;
  const yEcl = dist * cosB * sinL;
  const zEcl = dist * sinB;

  // Equatorial of date
  const xEq = xEcl;
  const yEq = cosEps * yEcl - sinEps * zEcl;
  const zEq = sinEps * yEcl + cosEps * zEcl;

  // 5. Precess from equatorial of date to J2000 equatorial
  return precessToJ2000([xEq, yEq, zEq], jd);
}

