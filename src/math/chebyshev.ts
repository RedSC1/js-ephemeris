// @ts-nocheck
/**
 * Chebyshev polynomial evaluation via Clenshaw recurrence.
 * Numerically stable for x in [-1, 1].
 */
export function chebEval(coeffs: Float64Array, x: number): number {
  const n = coeffs.length;
  if (n === 0) return 0;
  if (n === 1) return coeffs[0];

  let b1 = 0;
  let b0 = 0;
  for (let i = n - 1; i > 0; i--) {
    const b2 = b1;
    b1 = b0;
    b0 = 2 * x * b1 - b2 + coeffs[i];
  }
  return x * b0 - b1 + coeffs[0];
}

/**
 * Chebyshev polynomial derivative evaluation.
 * Returns d/dx of the polynomial at x.
 * 
 * Uses simultaneous Clenshaw recurrence for value and derivative:
 *   b_i = 2x * b_{i+1} - b_{i+2} + c_i
 *   d_i = 2x * d_{i+1} - d_{i+2} + 2 * b_{i+1}
 * Final result: P'(x) = x * d_0 - d_1 + b_0
 */
export function chebDeriv(coeffs: Float64Array, x: number): number {
  const n = coeffs.length;
  if (n < 2) return 0;

  let d1 = 0;
  let d0 = 0;
  let b1 = 0;
  let b0 = 0;

  for (let i = n - 1; i > 0; i--) {
    const d2 = d1;
    const b2 = b1;
    d1 = d0;
    b1 = b0;
    b0 = 2 * x * b1 - b2 + coeffs[i];
    d0 = 2 * x * d1 - d2 + 2 * b1;
  }
  return x * d0 - d1 + b0;
}
