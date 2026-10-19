import {
  AstroDateTime,
  JulianDate,
  civil,
  dateValues,
  jdValues,
  sameScale,
  type TimeScale,
  type UtcJulianDate,
  type TaiJulianDate,
  type TtJulianDate,
  type Ut1JulianDate,
  type TdbJulianDate,
} from "./date.js";
import {
  finite,
  integer,
  result,
  ResultFlags,
  TdbModel,
  type OperationResult,
} from "./models.js";
import {
  LeapSecondDataError,
  TimeScaleConvergenceError,
  UtcLeapSecondRepresentationError,
} from "./errors.js";
import type { ContextHost } from "./internal/wasm.js";

export interface PreciseTimeScales {
  readonly utc: UtcJulianDate;
  readonly tai: TaiJulianDate;
  readonly tt: TtJulianDate;
  readonly ut1: Ut1JulianDate;
  readonly tdb: TdbJulianDate;
  readonly taiMinusUtcSeconds: number;
  readonly dut1Seconds: number;
  readonly deltaTSeconds: number;
}
export interface TimeScaleDiagnostic {
  readonly route: number;
  readonly fallbackReason: number;
  readonly flags: number;
  readonly tdbModel: number;
  readonly deltaTModel: number;
  readonly ephemerisFamily: number;
}
export interface TimeScaleResult {
  readonly value: PreciseTimeScales;
  readonly diagnostic: TimeScaleDiagnostic;
}
export interface EstimatedTimeScales {
  readonly ut1: Ut1JulianDate;
  readonly tt: TtJulianDate;
  readonly tdb: TdbJulianDate;
  readonly deltaTSeconds: number;
}
const coordinateSeconds = (a: JulianDate, b: JulianDate) =>
  (a.dayNumber - b.dayNumber + a.dayFraction - b.dayFraction) * 86400;
const label = <S extends TimeScale>(jd: JulianDate, scale: S) =>
  new JulianDate(jd.dayNumber, jd.dayFraction, scale);

/** Scale conversions use the same C++ implementation and strict UTC/EOP policy as Dart. */
export class Time {
  #model = TdbModel.fastPeriodic;
  constructor(private readonly host: ContextHost) {}
  get configuredTdbModel(): TdbModel {
    return this.host.run(() => this.#model);
  }
  /** @internal Clone synchronization; consumers use setTdbModel. */
  syncModel(model: TdbModel): void {
    this.#model = model;
  }
  private call(op: number, input: readonly number[] = []): number[] {
    return this.host.run(() =>
      this.host.wire.checked(
        this.host.wire.fixed("_taiyin_web_time", [this.host.handle, op], input),
      ),
    );
  }
  private wrap<T>(v: number[], value: T): OperationResult<T> {
    return result(value, new ResultFlags(v[0]!));
  }
  julianDay<S extends TimeScale>(
    value: AstroDateTime | Date,
    scale: S,
  ): OperationResult<JulianDate<S>> {
    const v = this.call(0, [0, 0, 0, 0, 0, ...dateValues(value)]);
    return this.wrap(v, new JulianDate(v[1]!, v[2]!, scale));
  }
  reverseJulianDay<S extends TimeScale>(
    value: JulianDate<S>,
  ): OperationResult<AstroDateTime> {
    const v = this.call(1, [0, ...jdValues(value)]);
    // Round the seconds only once. A carry is normalized by the core's own
    // calendar, including its historical Julian/Gregorian transition.
    const ns = Math.round(v[6]! * 1e9);
    let output: AstroDateTime;
    if (ns >= 60e9) {
      const base = this.julianDay(
        new AstroDateTime(v[1]!, v[2]!, v[3]!, v[4]!, v[5]!),
        value.scale,
      ).value;
      // Probe inside the next minute, not on another floating-point boundary.
      const n = this.call(1, [0, ...jdValues(base.addSeconds(61))]);
      output = new AstroDateTime(
        n[1]!,
        n[2]!,
        n[3]!,
        n[4]!,
        n[5]!,
        Math.floor((ns - 60e9) / 1e9),
        (ns - 60e9) % 1e9,
      );
    } else
      output = new AstroDateTime(
        v[1]!,
        v[2]!,
        v[3]!,
        v[4]!,
        v[5]!,
        Math.floor(ns / 1e9),
        ns % 1e9,
      );
    return this.wrap(v, output);
  }
  setAllowUtcOutOfRangeEstimate(allow: boolean): void {
    if (typeof allow !== "boolean")
      throw new TypeError("allow must be boolean");
    this.host.run(() =>
      this.host.wire.checked(
        this.host.wire.fixed(
          "_taiyin_web_configure",
          [this.host.handle, 1],
          [+allow],
        ),
      ),
    );
  }
  setTdbModel(model: TdbModel): void {
    integer(model, 0, 1, "TDB model");
    this.host.run(() =>
      this.host.wire.checked(
        this.host.wire.fixed(
          "_taiyin_web_configure",
          [this.host.handle, 12],
          [model],
        ),
      ),
    );
    this.#model = model;
  }
  private scalar(kind: number, x: number, y = 0): number {
    return finite(
      this.call(2, [kind, finite(x, "scalar"), finite(y, "scalar")])[1]!,
      "time scalar result",
    );
  }
  decimalYear(jd: JulianDate): number {
    return this.scalar(0, jd.toDouble());
  }
  julianCenturiesSinceJ2000(jd: JulianDate): number {
    return this.scalar(1, jd.toDouble());
  }
  julianMillenniaSinceJ2000(jd: JulianDate): number {
    return this.scalar(2, jd.toDouble());
  }
  estimatedDeltaTForDecimalYear(year: number): number {
    return this.scalar(3, year);
  }
  estimatedDeltaTFromUt1(jd: Ut1JulianDate): number {
    sameScale(jd, "UT1");
    return this.scalar(4, jd.toDouble());
  }
  estimatedDeltaTFromTt(jd: TtJulianDate): number {
    sameScale(jd, "TT");
    return this.scalar(5, jd.toDouble());
  }
  deltaTFromTaiMinusUtcAndDut1(tai: number, dut1: number): number {
    return this.scalar(6, tai, dut1);
  }
  private convert<S extends TimeScale>(
    op: number,
    jd: JulianDate,
    scale: S,
    offset = 0,
    model = this.#model,
  ): OperationResult<JulianDate<S>> {
    integer(model, 0, 1, "TDB model");
    const v = this.call(3, [
      op,
      ...jdValues(jd),
      finite(offset, "offset seconds"),
      model,
    ]);
    return this.wrap(v, new JulianDate(v[1]!, v[2]!, scale));
  }
  ttToTdb(
    jd: TtJulianDate,
    { model = this.#model }: { model?: TdbModel } = {},
  ): OperationResult<TdbJulianDate> {
    sameScale(jd, "TT");
    return this.convert(0, jd, "TDB", 0, model);
  }
  tdbToTt(
    jd: TdbJulianDate,
    { model = this.#model }: { model?: TdbModel } = {},
  ): OperationResult<TtJulianDate> {
    sameScale(jd, "TDB");
    return this.convert(1, jd, "TT", 0, model);
  }
  utcToTai(
    jd: UtcJulianDate,
    { taiMinusUtcSeconds }: { taiMinusUtcSeconds: number },
  ): OperationResult<TaiJulianDate> {
    sameScale(jd, "UTC");
    return this.convert(2, jd, "TAI", taiMinusUtcSeconds);
  }
  taiToTt(jd: TaiJulianDate): OperationResult<TtJulianDate> {
    sameScale(jd, "TAI");
    return this.convert(3, jd, "TT");
  }
  utcToTt(
    jd: UtcJulianDate,
    { taiMinusUtcSeconds }: { taiMinusUtcSeconds: number },
  ): OperationResult<TtJulianDate> {
    sameScale(jd, "UTC");
    return this.convert(4, jd, "TT", taiMinusUtcSeconds);
  }
  utcToUt1(
    jd: UtcJulianDate,
    { dut1Seconds }: { dut1Seconds?: number } = {},
  ): OperationResult<Ut1JulianDate> {
    sameScale(jd, "UTC");
    if (dut1Seconds === undefined) {
      const scales = this.scalesFromUtc(this.reverseJulianDay(jd).value);
      return result(scales.value.value.ut1, scales.flags);
    }
    return this.convert(5, jd, "UT1", dut1Seconds);
  }
  ttToUt1(
    jd: TtJulianDate,
    { deltaTSeconds }: { deltaTSeconds?: number } = {},
  ): OperationResult<Ut1JulianDate> {
    sameScale(jd, "TT");
    return deltaTSeconds === undefined
      ? this.inverse(jd, "tt", "UT1")
      : this.convert(6, jd, "UT1", deltaTSeconds);
  }
  ut1ToTt(
    jd: Ut1JulianDate,
    { deltaTSeconds }: { deltaTSeconds: number },
  ): OperationResult<TtJulianDate> {
    sameScale(jd, "UT1");
    return this.convert(7, jd, "TT", deltaTSeconds);
  }
  taiMinusUtc(utc: AstroDateTime | Date): OperationResult<number> {
    const v = this.call(4, [0, 0, 0, 0, 0, ...dateValues(utc)]);
    return this.wrap(v, v[1]!);
  }
  private scales(v: number[]): PreciseTimeScales {
    return Object.freeze({
      utc: new JulianDate(v[1]!, v[2]!, "UTC"),
      tai: new JulianDate(v[3]!, v[4]!, "TAI"),
      tt: new JulianDate(v[5]!, v[6]!, "TT"),
      ut1: new JulianDate(v[7]!, v[8]!, "UT1"),
      tdb: new JulianDate(v[9]!, v[10]!, "TDB"),
      taiMinusUtcSeconds: v[11]!,
      dut1Seconds: v[12]!,
      deltaTSeconds: v[13]!,
    });
  }
  scalesFromUtc(utc: AstroDateTime | Date): OperationResult<TimeScaleResult> {
    const v = this.call(6, [0, 0, 0, 0, 0, ...dateValues(utc)]);
    return this.wrap(
      v,
      Object.freeze({
        value: this.scales(v),
        diagnostic: Object.freeze({
          route: v[14]!,
          fallbackReason: v[15]!,
          flags: v[16]!,
          tdbModel: v[17]!,
          deltaTModel: v[18]!,
          ephemerisFamily: v[19]!,
        }),
      }),
    );
  }
  preciseScalesFromUtc(
    utc: AstroDateTime | Date,
    options: {
      taiMinusUtcSeconds: number;
      dut1Seconds: number;
      tdbModel?: TdbModel;
    },
  ): OperationResult<PreciseTimeScales> {
    const v = this.call(5, [
      0,
      0,
      0,
      0,
      integer(options.tdbModel ?? this.#model, 0, 1, "TDB model"),
      ...dateValues(utc),
      finite(options.taiMinusUtcSeconds, "TAI−UTC"),
      finite(options.dut1Seconds, "DUT1"),
    ]);
    return this.wrap(v, this.scales(v));
  }
  estimatedScalesFromUt1(
    ut1: AstroDateTime,
    options: { deltaTSeconds?: number; tdbModel?: TdbModel } = {},
  ): OperationResult<EstimatedTimeScales> {
    const v = this.call(7, [
      0,
      0,
      0,
      +(options.deltaTSeconds !== undefined),
      integer(options.tdbModel ?? this.#model, 0, 1, "TDB model"),
      ...dateValues(ut1),
      finite(options.deltaTSeconds ?? 0, "Delta-T"),
    ]);
    return this.wrap(
      v,
      Object.freeze({
        ut1: new JulianDate(v[1]!, v[2]!, "UT1"),
        tt: new JulianDate(v[3]!, v[4]!, "TT"),
        tdb: new JulianDate(v[5]!, v[6]!, "TDB"),
        deltaTSeconds: v[7]!,
      }),
    );
  }
  private inverse<S extends "UTC" | "UT1">(
    target: JulianDate,
    select: "tt" | "ut1",
    scale: S,
  ): OperationResult<JulianDate<S>> {
    let candidate = label(target, "UTC");
    let flags = ResultFlags.none;
    let firstError: unknown;
    let initial: OperationResult<TimeScaleResult> | undefined;
    for (const seconds of scale === "UTC"
      ? [0, -2, 2]
      : [0, -69.184, -42.184]) {
      candidate = label(target, "UTC").addSeconds(seconds);
      try {
        initial = this.scalesFromUtc(this.reverseJulianDay(candidate).value);
        break;
      } catch (e) {
        firstError ??= e;
      }
    }
    if (!initial) throw firstError;
    for (let i = 0; i < 12; i++) {
      const s =
        i === 0
          ? initial
          : this.scalesFromUtc(this.reverseJulianDay(candidate).value);
      flags = flags.union(s.flags);
      const correction = coordinateSeconds(target, s.value.value[select]);
      if (Math.abs(correction) <= 1e-8)
        return result(
          (scale === "UTC"
            ? candidate.addSeconds(correction)
            : s.value.value.ut1.addSeconds(correction)) as JulianDate<S>,
          flags,
        );
      candidate = candidate.addSeconds(correction);
    }
    // UTC JD cannot label second 60. For TT→UT1, probe that actual calendar
    // second rather than silently mapping the leap interval to its neighbor.
    for (const seconds of [-1, 0, 1]) {
      const d = this.reverseJulianDay(candidate.addSeconds(seconds)).value;
      try {
        const leap = this.scalesFromUtc(
          new AstroDateTime(d.year, d.month, d.day, 23, 59, 60),
        );
        if (leap.value.diagnostic.route !== 1) continue;
        const correction = coordinateSeconds(target, leap.value.value[select]);
        if (correction >= 0 && correction < 1) {
          if (scale === "UTC") throw new UtcLeapSecondRepresentationError();
          return result(
            leap.value.value.ut1.addSeconds(correction) as JulianDate<S>,
            flags.union(leap.flags),
          );
        }
      } catch (e) {
        if (e instanceof UtcLeapSecondRepresentationError) throw e;
      }
    }
    throw new TimeScaleConvergenceError();
  }
  ut1ToUtc(jd: Ut1JulianDate): OperationResult<UtcJulianDate> {
    sameScale(jd, "UT1");
    return this.inverse(jd, "ut1", "UTC");
  }
  taiToUtc(jd: TaiJulianDate): OperationResult<UtcJulianDate> {
    sameScale(jd, "TAI");
    let candidate = label(jd, "UTC");
    let flags = ResultFlags.none;
    try {
      for (let i = 0; i < 12; i++) {
        const offset = this.taiMinusUtc(this.reverseJulianDay(candidate).value);
        flags = flags.union(offset.flags);
        const correction = coordinateSeconds(
          jd,
          label(candidate, "TAI").addSeconds(offset.value),
        );
        candidate = candidate.addSeconds(correction);
        if (Math.abs(correction) <= 1e-8) return result(candidate, flags);
      }
      throw new UtcLeapSecondRepresentationError();
    } catch (e) {
      if (!(e instanceof LeapSecondDataError)) throw e;
      try {
        const tt = this.taiToTt(jd);
        const ut1 = this.ttToUt1(tt.value);
        const utc = this.ut1ToUtc(ut1.value);
        return result(utc.value, tt.flags.union(ut1.flags).union(utc.flags));
      } catch {
        throw e;
      }
    }
  }
  ttToUtc(jd: TtJulianDate): OperationResult<UtcJulianDate> {
    sameScale(jd, "TT");
    return this.taiToUtc(label(jd, "TAI").addSeconds(-32.184));
  }
  tdbToUtc(
    jd: TdbJulianDate,
    options: { model?: TdbModel } = {},
  ): OperationResult<UtcJulianDate> {
    const tt = this.tdbToTt(jd, options);
    const utc = this.ttToUtc(tt.value);
    return result(utc.value, tt.flags.union(utc.flags));
  }
  taiToUt1(jd: TaiJulianDate): OperationResult<Ut1JulianDate> {
    const tt = this.taiToTt(jd);
    const ut = this.ttToUt1(tt.value);
    return result(ut.value, tt.flags.union(ut.flags));
  }
  tdbToUt1(
    jd: TdbJulianDate,
    options: { model?: TdbModel } = {},
  ): OperationResult<Ut1JulianDate> {
    const tt = this.tdbToTt(jd, options);
    const ut = this.ttToUt1(tt.value);
    return result(ut.value, tt.flags.union(ut.flags));
  }
  calendarFromUt1(jd: Ut1JulianDate): OperationResult<AstroDateTime> {
    sameScale(jd, "UT1");
    return this.reverseJulianDay(jd);
  }
  utcCalendarFromUt1(jd: Ut1JulianDate): OperationResult<AstroDateTime> {
    const utc = this.ut1ToUtc(jd);
    const d = this.reverseJulianDay(utc.value);
    return result(d.value, utc.flags.union(d.flags));
  }
}
