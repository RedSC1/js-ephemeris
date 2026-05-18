/**
 * 插值工具
 *
 * Catmull-Rom 样条 + 线性插值，纯函数。
 */

/**
 * Catmull-Rom 样条插值
 *
 * 四点 C¹ 连续插值。p1, p2 是区间端点，
 * p0, p3 仅用于计算端点切线方向。
 */
export function catmullRom(
  t0: number, t1: number, t2: number, t3: number,
  p0: number, p1: number, p2: number, p3: number,
  t: number,
): number {
  const dt1 = t2 - t1;
  const x = (t - t1) / dt1;
  const m1 = ((p2 - p0) / (t2 - t0)) * dt1;
  const m2 = ((p3 - p1) / (t3 - t1)) * dt1;
  const x2 = x * x;
  const x3 = x2 * x;
  return (
    (2 * x3 - 3 * x2 + 1) * p1 +
    (x3 - 2 * x2 + x) * m1 +
    (-2 * x3 + 3 * x2) * p2 +
    (x3 - x2) * m2
  );
}

/**
 * 线性插值
 *
 * xs, ys 分别是等长的 x 和 y 数组，x 单调增。
 * 目标在表外则线性外推。
 */
export function lerp(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  x: number,
): number {
  const n = xs.length;
  if (n === 0) return 0;

  if (x <= xs[0]!) {
    if (n === 1) return ys[0]!;
    const dx = xs[1]! - xs[0]!;
    if (dx === 0) return ys[0]!;
    return ys[0]! + (ys[1]! - ys[0]!) * (x - xs[0]!) / dx;
  }

  if (x >= xs[n - 1]!) {
    if (n === 1) return ys[0]!;
    const dx = xs[n - 1]! - xs[n - 2]!;
    if (dx === 0) return ys[n - 1]!;
    return ys[n - 1]! + (ys[n - 1]! - ys[n - 2]!) *
      (x - xs[n - 1]!) / dx;
  }

  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid]! <= x) lo = mid;
    else hi = mid;
  }

  const x0 = xs[lo]!, x1 = xs[hi]!;
  const y0 = ys[lo]!, y1 = ys[hi]!;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
