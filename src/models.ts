/** Numeric IDs follow Taiyin's C ABI and the Dart camelCase names. */
export enum Body {
  solarSystemBarycenter = 0,
  mercuryBarycenter = 1,
  venusBarycenter = 2,
  earthMoonBarycenter = 3,
  marsBarycenter = 4,
  jupiterBarycenter = 5,
  saturnBarycenter = 6,
  uranusBarycenter = 7,
  neptuneBarycenter = 8,
  plutoBarycenter = 9,
  sun = 10,
  mercury = 199,
  venus = 299,
  moon = 301,
  earth = 399,
  phobos = 401,
  deimos = 402,
  mars = 499,
  io = 501,
  europa = 502,
  ganymede = 503,
  callisto = 504,
  jupiter = 599,
  mimas = 601,
  enceladus = 602,
  tethys = 603,
  dione = 604,
  rhea = 605,
  titan = 606,
  hyperion = 607,
  iapetus = 608,
  saturn = 699,
  ariel = 701,
  umbriel = 702,
  titania = 703,
  oberon = 704,
  miranda = 705,
  uranus = 799,
  triton = 801,
  neptune = 899,
  charon = 901,
  nix = 902,
  hydra = 903,
  kerberos = 904,
  styx = 905,
  pluto = 999,
}
export enum PositionFlag {
  speed = 1,
  xyz = 2,
  equatorial = 4,
  radians = 8,
  truePosition = 16,
  noAberration = 32,
  noGravitationalDeflection = 64,
  astrometric = 128,
  noNutation = 256,
  topocentric = 512,
  allowBarycenterApproximation = 1024,
}
export type PositionFlags = Iterable<PositionFlag> | number;
export enum ResultFlag {
  fallbackOccurred = 1,
  numericalDerivative = 2,
  barycenterApproximation = 4,
  timeScaleFallback = 8,
  historicalEventAssignmentApplied = 16,
  historicalCalendarRulesApplied = 32,
  historicalPillarTermsApplied = 64,
}
export class ResultFlags {
  static readonly none = new ResultFlags(0);
  constructor(readonly mask: number) {
    integer(mask, 0, 0xffffffff, "result flags");
    Object.freeze(this);
  }
  contains(flag: ResultFlag): boolean {
    return (BigInt(this.mask) & BigInt(flag)) !== 0n;
  }
  get isEmpty(): boolean {
    return this.mask === 0;
  }
  get values(): readonly ResultFlag[] {
    return Object.freeze(
      [1, 2, 4, 8, 16, 32, 64].filter((f) => this.contains(f)),
    );
  }
  union(other: ResultFlags): ResultFlags {
    return new ResultFlags(Number(BigInt(this.mask) | BigInt(other.mask)));
  }
}
export interface OperationResult<T> {
  readonly value: T;
  readonly flags: ResultFlags;
}
export function result<T>(
  value: T,
  flags: ResultFlags = ResultFlags.none,
): OperationResult<T> {
  return Object.freeze({ value, flags });
}
export enum RouteRule {
  automatic = 0,
  opm2 = 1,
  spk = 2,
  semiAnalytic = 3,
}
export enum ApparentFrame {
  icrf = 0,
  trueEquatorOfDate = 1,
  trueEclipticOfDate = 2,
  j2000MeanEquator = 3,
  j2000Ecliptic = 4,
  meanEquatorOfDate = 5,
  meanEclipticOfDate = 6,
  cirs = 7,
}
export enum TdbModel {
  fastPeriodic = 0,
  sofaFull = 1,
}
export interface EphemerisDiagnostic {
  readonly status: number;
  readonly targetId: number;
  readonly centerId: number;
  readonly frame: number;
  readonly jdTdb: readonly [number, number];
  readonly candidateCount: number;
  readonly attemptedMethodId: number;
  readonly nearestCoverageStart: number;
  readonly nearestCoverageEnd: number;
  readonly componentTargetId: number;
  readonly componentCenterId: number;
  readonly componentMethodId: number;
  readonly timeScaleRoute: number;
  readonly timeScaleFallbackReason: number;
  readonly timeScaleFlags: number;
  readonly taiMinusUtcSeconds: number;
  readonly dut1Seconds: number;
  readonly deltaTSeconds: number;
}
export class Position {
  readonly values: readonly number[];
  constructor(
    values: readonly number[],
    readonly flagMask: number,
  ) {
    if (values.length !== 6)
      throw new RangeError("Position must have six components");
    this.values = Object.freeze([...values]);
    Object.freeze(this);
  }
  get coordinates(): readonly number[] {
    return this.values.slice(0, 3);
  }
  get rates(): readonly number[] {
    return this.values.slice(3, 6);
  }
  get isCartesian(): boolean {
    return (this.flagMask & PositionFlag.xyz) !== 0;
  }
  get isEquatorial(): boolean {
    return (this.flagMask & PositionFlag.equatorial) !== 0;
  }
  get isRadians(): boolean {
    return (this.flagMask & PositionFlag.radians) !== 0;
  }
}
export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export interface CartesianState {
  readonly positionAu: Vector3;
  readonly velocityAuPerDay: Vector3;
  readonly accelerationAuPerDay2: Vector3;
}
export function vector(v: readonly number[], at: number): Vector3 {
  return Object.freeze({ x: v[at]!, y: v[at + 1]!, z: v[at + 2]! });
}
export function integer(
  value: number,
  min: number,
  max: number,
  name: string,
): number {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
}
export function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}
export function positionMask(flags: PositionFlags = []): number {
  let mask = 0n;
  if (typeof flags === "number")
    mask = BigInt(integer(flags, 0, 2047, "position flags"));
  else
    for (const f of flags) {
      integer(f, 1, 1024, "position flag");
      if ((f & (f - 1)) !== 0) throw new RangeError("Invalid position flag");
      mask |= BigInt(f);
    }
  return Number(mask);
}
export function text(value: string, name = "text", allowEmpty = false): string {
  if (
    typeof value !== "string" ||
    value.includes("\0") ||
    (!allowEmpty && !value)
  )
    throw new TypeError(
      `${name} must be a NUL-free ${allowEmpty ? "" : "nonempty "}string`,
    );
  return value;
}
