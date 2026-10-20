import {
  AstroDateTime,
  UtcJulianDate,
  JulianDate,
  type Ut1JulianDate,
  dateValues,
  jdValues,
  sameScale,
} from "js-ephemeris/extension-host";
import {
  ChineseCalendar,
  RatHourMode,
  type FourPillars,
  type SolarDate,
  type LunarDate,
} from "js-ephemeris/extension-host";
import { ClosedContextError } from "js-ephemeris/extension-host";
import {
  result,
  ResultFlags,
  integer,
  finite,
  type OperationResult,
} from "js-ephemeris/extension-host";
import { withCalendar, retainCalendar } from "js-ephemeris/extension-host";
import { decode, encode, decodeText, width } from "js-ephemeris/extension-host";
import type * as R from "js-ephemeris/extension-host";
import type { ContextHost } from "js-ephemeris/extension-host";
import type { Time } from "js-ephemeris/extension-host";
import { SolarTime } from "js-ephemeris/extension-host";
export enum BaziGender {
  female = 0,
  male = 1,
}
export enum BaziClockMode {
  fixedOffset = 0,
  meanSolar = 1,
  apparentSolar = 2,
}
export interface BaziClock {
  mode?: BaziClockMode;
  longitudeRadians?: number;
}
export interface BaziCalculateOptions {
  gender: BaziGender;
  ratHourMode?: RatHourMode;
  clock?: BaziClock;
}
export interface BaziReverseOptions {
  ratHourMode?: RatHourMode;
  clock?: BaziClock;
}
export interface BaziCivilOptions extends BaziCalculateOptions {
  hour: number;
  minute?: number;
  second?: number;
  nanosecond?: number;
}
export interface BaziRelationResult {
  readonly flags: number;
  readonly combinedElementId: number;
}
export interface BaziConfiguration {
  earthPalaceMode?: number;
  qiyunDirectionMode?: number;
  qiyunTimeModel?: number;
  dayunBoundaryModel?: number;
}
export interface BaziCalculation {
  readonly instantUtc: UtcJulianDate;
  readonly chartTime: AstroDateTime;
  readonly clockTime: AstroDateTime;
  readonly pillars: FourPillars;
  readonly chart: R.BaziChart;
  readonly qiyun: R.BaziQiyunResult;
}
function packed(v: number): number {
  integer(v, 0, 255, "Ganzhi");
  if (v === 255 || v >>> 4 > 9 || (v & 15) > 11)
    throw new RangeError("Invalid Ganzhi");
  return v;
}
function pillars(p: FourPillars): number[] {
  return [
    packed(p.year),
    packed(p.month),
    packed(p.day),
    p.hour === 255 ? 255 : packed(p.hour),
  ];
}

/** Independent BaZi calculator borrowing one explicitly selected calendar. */
export class BaziContext {
  #closed = false;
  #release: () => void;
  #solarTime: SolarTime;
  /** @internal */
  constructor(
    private readonly host: ContextHost,
    private readonly time: Time,
    readonly chineseCalendar: ChineseCalendar,
    private readonly handle: number,
    private readonly onClose: () => void,
  ) {
    this.#release = retainCalendar(chineseCalendar, host);
    this.#solarTime = new SolarTime(host);
  }
  get isClosed(): boolean {
    return this.#closed;
  }
  private ensureOpen(): void {
    this.host.run(() => {
      if (this.#closed) throw new ClosedContextError("BaZi context is closed");
    });
  }
  private call(op: number, input: number[]): number[] {
    return this.host.run(() => {
      if (this.#closed) throw new ClosedContextError("BaZi context is closed");
      return withCalendar(this.chineseCalendar, this.host, (calendar) => {
        const reply = this.host.wire.structured(
          "_taiyin_web_bazi",
          [this.handle, calendar, op],
          input,
        );
        this.host.record(reply.values);
        return this.host.wire.checked(reply, 0);
      });
    });
  }
  close(): void {
    if (this.#closed) return;
    this.host.run(() => {
      this.host.wire.invoke("_taiyin_bazi_context_destroy", this.handle);
      this.#closed = true;
      this.#release();
      this.onClose();
    });
  }
  calcChart(p: FourPillars): OperationResult<R.BaziChart> {
    const v = this.call(8, pillars(p));
    return result(
      decode<R.BaziChart>("taiyin_bazi_chart", v),
      new ResultFlags(v[0]!),
    );
  }
  /** Find maximal matching [start,end) UT1 intervals. All four pillars are
   * required. FixedOffset adds this calendar's offset to UT1, not UTC;
   * solar clocks use longitude and are inverted at each endpoint. */
  reverseLookupAtUt1(
    p: FourPillars,
    start: Ut1JulianDate,
    end: Ut1JulianDate,
    options: BaziReverseOptions = {},
  ): OperationResult<readonly R.BaziReverseCandidate[]> {
    sameScale(start, "UT1");
    sameScale(end, "UT1");
    const values = pillars(p);
    if (p.hour === 255)
      throw new RangeError("Reverse lookup requires an hour pillar");
    const mode = integer(options.clock?.mode ?? 0, 0, 2, "clock mode");
    const longitude = finite(
      options.clock?.longitudeRadians ?? 0,
      "longitude radians",
    );
    if (mode !== 0 && Math.abs(longitude) > Math.PI)
      throw new RangeError("Longitude radians must be in [-pi,pi]");
    const v = this.call(29, [
      ...jdValues(start),
      ...jdValues(end),
      ...values,
      integer(options.ratHourMode ?? 0, 0, 2, "rat hour mode"),
      mode,
      longitude,
    ]);
    const count = v[2]!;
    const size = width("taiyin_bazi_reverse_candidate");
    return result(
      Object.freeze(
        Array.from({ length: count }, (_, i) =>
          decode<R.BaziReverseCandidate>(
            "taiyin_bazi_reverse_candidate",
            v,
            32 + i * size,
            this.time,
            "UT1",
          ),
        ),
      ),
      new ResultFlags(v[0]!),
    );
  }
  private resolved(
    utc: UtcJulianDate,
    civilTime: AstroDateTime,
    options: BaziCalculateOptions,
  ): OperationResult<BaziCalculation> {
    this.ensureOpen();
    integer(options.gender, 0, 1, "gender");
    const mode = integer(options.clock?.mode ?? 0, 0, 2, "clock mode");
    const longitude = finite(
      options.clock?.longitudeRadians ?? 0,
      "longitude radians",
    );
    if (mode !== 0 && Math.abs(longitude) > Math.PI)
      throw new RangeError("Longitude radians must be in [-pi,pi]");
    const physical = this.time.utcToUt1(utc);
    let chartTime = civilTime;
    let flags = physical.flags;
    if (mode !== 0) {
      let solar = new JulianDate(
        physical.value.dayNumber,
        physical.value.dayFraction + longitude / (2 * Math.PI),
        "LOCAL_MEAN",
      );
      if (mode === BaziClockMode.apparentSolar) {
        const apparent = this.#solarTime.localMeanToApparent(solar, longitude);
        const d = this.time.reverseJulianDay(apparent.value);
        chartTime = d.value;
        flags = flags.union(apparent.flags).union(d.flags);
      } else {
        const d = this.time.reverseJulianDay(solar);
        chartTime = d.value;
        flags = flags.union(d.flags);
      }
    }
    const p = this.chineseCalendar.fourPillars({
      instantUtc: utc,
      virtualTime: chartTime,
      ratHourMode: options.ratHourMode ?? RatHourMode.noSplit,
    });
    const chart = this.calcChart(p.value);
    const qiyun = this.calcQiyun(
      physical.value,
      chartTime,
      chart.value,
      options.gender,
    );
    return result(
      Object.freeze({
        instantUtc: utc,
        chartTime,
        clockTime: civilTime,
        pillars: p.value,
        chart: chart.value,
        qiyun: qiyun.value,
      }),
      flags.union(p.flags).union(chart.flags).union(qiyun.flags),
    );
  }
  calculateLocal(
    local: AstroDateTime,
    options: BaziCalculateOptions,
  ): OperationResult<BaziCalculation> {
    this.ensureOpen();
    const utc = this.chineseCalendar.instantFromLocal(local);
    const value = this.resolved(utc.value, local, options);
    return result(value.value, utc.flags.union(value.flags));
  }
  calculateInstant(
    instant: UtcJulianDate | Date,
    options: BaziCalculateOptions,
  ): OperationResult<BaziCalculation> {
    this.ensureOpen();
    const utc =
      instant instanceof Date ? UtcJulianDate.fromDate(instant) : instant;
    sameScale(utc, "UTC");
    const local = this.chineseCalendar.localFromInstant(utc);
    const value = this.resolved(utc, local.value, options);
    return result(value.value, local.flags.union(value.flags));
  }
  calculateUtc(
    instant: UtcJulianDate | Date,
    options: BaziCalculateOptions,
  ): OperationResult<BaziCalculation> {
    return this.calculateInstant(instant, options);
  }
  calculateSolarDay(
    day: SolarDate,
    options: BaziCivilOptions,
  ): OperationResult<BaziCalculation> {
    return this.calculateLocal(
      new AstroDateTime(
        day.year,
        day.month,
        day.day,
        options.hour,
        options.minute ?? 0,
        options.second ?? 0,
        options.nanosecond ?? 0,
      ),
      options,
    );
  }
  calculateLunarDay(
    day: LunarDate,
    options: BaziCivilOptions,
  ): OperationResult<BaziCalculation> {
    this.ensureOpen();
    const solar = this.chineseCalendar.fromLunar(day);
    const value = this.calculateSolarDay(solar.value, options);
    return result(value.value, solar.flags.union(value.flags));
  }
  calcQiyun(
    instantUt1: Ut1JulianDate,
    virtualTime: AstroDateTime,
    chart: R.BaziChart,
    gender: BaziGender,
  ): OperationResult<R.BaziQiyunResult> {
    sameScale(instantUt1, "UT1");
    const v = this.call(15, [
      ...jdValues(instantUt1),
      ...dateValues(virtualTime),
      ...encode("taiyin_bazi_chart", chart),
      integer(gender, 0, 1, "gender"),
    ]);
    return result(
      decode<R.BaziQiyunResult>("taiyin_bazi_qiyun_result", v, 32, this.time),
      new ResultFlags(v[0]!),
    );
  }
  fillDayun(
    birthTime: AstroDateTime,
    chart: R.BaziChart,
    qiyun: R.BaziQiyunResult,
    count = 10,
  ): OperationResult<readonly R.BaziDayun[]> {
    const v = this.call(16, [
      ...dateValues(birthTime),
      ...encode("taiyin_bazi_chart", chart),
      ...encode("taiyin_bazi_qiyun_result", qiyun),
      integer(count, 0, 10000, "dayun count"),
    ]);
    return result(
      Object.freeze(
        Array.from({ length: v[2]! }, (_, i) =>
          decode<R.BaziDayun>(
            "taiyin_bazi_dayun",
            v,
            32 + i * width("taiyin_bazi_dayun"),
            this.time,
          ),
        ),
      ),
      new ResultFlags(v[0]!),
    );
  }
  kongWang(pillar: number): OperationResult<readonly number[]> {
    const v = this.call(1, [packed(pillar)]);
    return result(Object.freeze(v.slice(32, 34)), new ResultFlags(v[0]!));
  }
  tenGod(dayStem: number, targetStem: number): OperationResult<number> {
    const v = this.call(2, [
      integer(dayStem, 0, 9, "day stem"),
      integer(targetStem, 0, 9, "target stem"),
    ]);
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  hiddenStems(branch: number): OperationResult<readonly number[]> {
    const v = this.call(3, [integer(branch, 0, 11, "branch")]);
    return result(
      Object.freeze(v.slice(33, 33 + v[32]!)),
      new ResultFlags(v[0]!),
    );
  }
  lifeStage(
    stem: number,
    branch: number,
    earthPalaceMode = 0,
  ): OperationResult<number> {
    const v = this.call(7, [
      integer(stem, 0, 9, "stem"),
      integer(branch, 0, 11, "branch"),
      integer(earthPalaceMode, 0, 1, "earth palace mode"),
    ]);
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  liunian(year: number): OperationResult<number> {
    const v = this.call(9, [integer(year, -2147483648, 2147483647, "year")]);
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  liuyue(yearPillar: number, branch: number): OperationResult<number> {
    const v = this.call(10, [
      packed(yearPillar),
      integer(branch, 0, 11, "branch"),
    ]);
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  liuri(date: AstroDateTime): OperationResult<number> {
    const v = this.call(11, dateValues(date));
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  liushi(dayPillar: number, branch: number): OperationResult<number> {
    const v = this.call(12, [
      packed(dayPillar),
      integer(branch, 0, 11, "branch"),
    ]);
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  private relation(
    op: number,
    input: number[],
  ): OperationResult<BaziRelationResult> {
    const v = this.call(op, input);
    return result(
      Object.freeze({ flags: v[32]!, combinedElementId: v[33]! }),
      new ResultFlags(v[0]!),
    );
  }
  calcStemRelation(a: number, b: number): OperationResult<BaziRelationResult> {
    return this.relation(4, [
      integer(a, 0, 9, "stem"),
      integer(b, 0, 9, "stem"),
    ]);
  }
  calcBranchRelation(
    a: number,
    b: number,
  ): OperationResult<BaziRelationResult> {
    return this.relation(5, [
      integer(a, 0, 11, "branch"),
      integer(b, 0, 11, "branch"),
    ]);
  }
  calcBranchTripleRelation(
    a: number,
    b: number,
    c: number,
  ): OperationResult<BaziRelationResult> {
    return this.relation(
      6,
      [a, b, c].map((v) => integer(v, 0, 11, "branch")),
    );
  }
  calcXiaoyun(
    chart: R.BaziChart,
    direction: number,
    age: number,
  ): OperationResult<number> {
    if (direction !== 1 && direction !== -1)
      throw new RangeError("direction must be -1 or 1");
    const v = this.call(13, [
      ...encode("taiyin_bazi_chart", chart),
      direction,
      integer(age, 1, 2147483647, "age"),
    ]);
    return result(v[32]!, new ResultFlags(v[0]!));
  }
  private records<T>(
    op: number,
    input: number[],
    type: string,
  ): OperationResult<readonly T[]> {
    const v = this.call(op, input);
    return result(
      Object.freeze(
        Array.from({ length: integer(v[2]!, 0, 1000000, "count") }, (_, i) =>
          decode<T>(type, v, 32 + i * width(type), this.time),
        ),
      ),
      new ResultFlags(v[0]!),
    );
  }
  fillXiaoyun(
    chart: R.BaziChart,
    {
      direction,
      startAge = 1,
      requestedCount = 10,
    }: { direction: number; startAge?: number; requestedCount?: number },
  ): OperationResult<readonly R.BaziXiaoyun[]> {
    if (direction !== 1 && direction !== -1)
      throw new RangeError("direction must be -1 or 1");
    return this.records(
      14,
      [
        ...encode("taiyin_bazi_chart", chart),
        direction,
        integer(startAge, 1, 2147483647, "start age"),
        integer(requestedCount, 0, 10000, "count"),
      ],
      "taiyin_bazi_xiaoyun",
    );
  }
  calcRenyuanSiling(
    instantUt1: Ut1JulianDate,
    chart: R.BaziChart,
    { tableModel = 0, timeModel = 0 } = {},
  ): OperationResult<R.BaziRenyuanSilingResult> {
    sameScale(instantUt1, "UT1");
    const v = this.call(17, [
      ...jdValues(instantUt1),
      ...encode("taiyin_bazi_chart", chart),
      integer(tableModel, 0, 1, "table model"),
      integer(timeModel, 0, 1, "time model"),
    ]);
    return result(
      decode<R.BaziRenyuanSilingResult>(
        "taiyin_bazi_renyuan_siling_result",
        v,
        32,
        this.time,
      ),
      new ResultFlags(v[0]!),
    );
  }
  getRenyuanSilingSegments(
    monthBranch: number,
    tableModel = 0,
  ): OperationResult<readonly R.BaziRenyuanSilingSegment[]> {
    return this.records(
      18,
      [
        integer(monthBranch, 0, 11, "month branch"),
        integer(tableModel, 0, 1, "table model"),
      ],
      "taiyin_bazi_renyuan_siling_segment",
    );
  }
  collectChartRelations(
    chart: R.BaziChart,
    { pillarMask = 0xff, relationMask = 0xffff } = {},
  ): OperationResult<readonly R.BaziRelation[]> {
    return this.records(
      19,
      [
        ...encode("taiyin_bazi_chart", chart),
        integer(pillarMask, 0, 0xffffffff, "pillar mask"),
        integer(relationMask, 0, 0xffffffff, "relation mask"),
      ],
      "taiyin_bazi_relation",
    );
  }
  collectTargetShenSha(
    chart: R.BaziChart,
    target: number,
    { targetKind = 0, gender = -1 } = {},
  ): OperationResult<readonly number[]> {
    const v = this.call(20, [
      ...encode("taiyin_bazi_chart", chart),
      packed(target),
      integer(targetKind, 0, 2147483647, "target kind"),
      integer(gender, -1, 1, "gender"),
    ]);
    return result(Object.freeze(v.slice(32)), new ResultFlags(v[0]!));
  }
  collectShenSha(
    chart: R.BaziChart,
    target: number,
    { kind = 0, gender = -1 } = {},
  ): OperationResult<
    readonly {
      readonly id: string;
      readonly name: string;
      readonly builtinId: number;
    }[]
  > {
    const v = this.call(21, [
      ...encode("taiyin_bazi_chart", chart),
      packed(target),
      integer(kind, 0, 2147483647, "target kind"),
      integer(gender, -1, 1, "gender"),
    ]);
    let cursor = 32;
    const matches = [];
    for (let i = 0; i < v[2]!; i++) {
      const builtinId = v[cursor++]!;
      const id = decodeText(v, cursor);
      const name = decodeText(v, id.next);
      cursor = name.next;
      matches.push(
        Object.freeze({ id: id.value, name: name.value, builtinId }),
      );
    }
    return result(Object.freeze(matches), new ResultFlags(v[0]!));
  }
}
/** @internal */
export function createBazi(
  host: ContextHost,
  time: Time,
  calendar: ChineseCalendar,
  config: BaziConfiguration,
  onClose: () => void,
): BaziContext {
  return withCalendar(calendar, host, (h) => {
    const payload = [
      integer(config.earthPalaceMode ?? 0, 0, 1, "earth palace mode"),
      integer(config.qiyunDirectionMode ?? 0, 0, 2147483647, "qiyun direction"),
      integer(config.qiyunTimeModel ?? 0, 0, 2147483647, "qiyun model"),
      integer(config.dayunBoundaryModel ?? 0, 0, 2147483647, "dayun boundary"),
    ];
    const v = host.wire.checked(
      host.wire.structured("_taiyin_web_bazi", [0, h, 0], payload),
    );
    return new BaziContext(host, time, calendar, v[32]!, onClose);
  });
}
