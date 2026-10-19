import {
  AstroDateTime,
  JulianDate,
  type UtcJulianDate,
  type Ut1JulianDate,
  dateValues,
  jdValues,
  sameScale,
} from "./date.js";
import {
  integer,
  finite,
  result,
  ResultFlags,
  type OperationResult,
} from "./models.js";
import { ClosedContextError } from "./errors.js";
import type { ContextHost } from "./internal/wasm.js";
import type { Time } from "./time.js";
import {
  registerCalendar,
  ensureCalendarCanClose,
} from "./internal/calendar-access.js";

export enum ChineseCalendarMode {
  chinaStandardHistorical = 0,
  localAstronomical = 1,
  chinaStandardAstronomical = 2,
}
export enum ChineseCalendarDayBoundaryMode {
  fixedUtcOffset = 0,
  meanSolarMeridian = 1,
}
export enum ChineseCalendarMonthName {
  normal = 0,
  thirteen = 1,
  laterNine = 2,
  altTwelve = 3,
  altOne = 4,
  laterSameName = 5,
}
export enum RatHourMode {
  noSplit = 0,
  todayGan = 1,
  tomorrowGan = 2,
}
export interface ChineseCalendarConfiguration {
  mode?: ChineseCalendarMode;
  dayBoundaryMode?: ChineseCalendarDayBoundaryMode;
  utcOffsetMinutes?: number;
  calendarMeridianDegrees?: number;
}
export class ChineseCalendarConfig {
  readonly mode: ChineseCalendarMode;
  readonly dayBoundaryMode: ChineseCalendarDayBoundaryMode;
  readonly utcOffsetMinutes: number;
  readonly calendarMeridianDegrees: number;
  constructor(options: ChineseCalendarConfiguration = {}) {
    this.mode = integer(options.mode ?? 0, 0, 2, "calendar mode");
    this.dayBoundaryMode = integer(
      options.dayBoundaryMode ?? 0,
      0,
      1,
      "day boundary mode",
    );
    this.utcOffsetMinutes = integer(
      options.utcOffsetMinutes ?? 480,
      -2147483648,
      2147483647,
      "UTC offset minutes",
    );
    this.calendarMeridianDegrees = finite(
      options.calendarMeridianDegrees ?? 0,
      "calendar meridian",
    );
    Object.freeze(this);
  }
  static localAstronomicalUtcOffset(minutes: number): ChineseCalendarConfig {
    return new ChineseCalendarConfig({ mode: 1, utcOffsetMinutes: minutes });
  }
  static localAstronomicalMeridian(
    longitude: number,
    { utcOffsetMinutes = 480 } = {},
  ): ChineseCalendarConfig {
    return new ChineseCalendarConfig({
      mode: 1,
      dayBoundaryMode: 1,
      calendarMeridianDegrees: longitude,
      utcOffsetMinutes,
    });
  }
  static chinaStandardAstronomical({
    utcOffsetMinutes = 480,
  } = {}): ChineseCalendarConfig {
    return new ChineseCalendarConfig({ mode: 2, utcOffsetMinutes });
  }
}
export interface SolarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}
export interface LunarDate extends SolarDate {
  /** Calendar/ganzhi year; may differ from the historical written year. */
  readonly historicalYear?: number;
  readonly isLeap: boolean;
  readonly monthDays: number;
  readonly monthName: ChineseCalendarMonthName;
}
export interface FourPillars {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
}
/** Packed C ABI Ganzhi: high nibble = stem, low nibble = branch. */
export function ganzhi(packed: number): {
  readonly stem: number;
  readonly branch: number;
} {
  integer(packed, 0, 255, "Ganzhi");
  if (packed === 255 || packed >>> 4 > 9 || (packed & 15) > 11)
    throw new RangeError("Invalid packed Ganzhi");
  return Object.freeze({ stem: packed >>> 4, branch: packed & 15 });
}
export interface ChineseSolarTermEvent {
  readonly indexFromWinterSolstice: number;
  readonly targetLongitudeRad: number;
  readonly julianDateUt1: Ut1JulianDate;
  readonly civilDayNumber: number;
}
export interface ChineseCalendarMonth {
  readonly lunarYear: number;
  readonly historicalYear: number;
  readonly month: number;
  readonly isLeap: boolean;
  readonly dayCount: number;
  readonly monthName: ChineseCalendarMonthName;
  readonly monthBuildingBranch: number;
  readonly firstCivilDayNumber: number;
  readonly astronomicalNewMoonJulianDateUt1: Ut1JulianDate;
}
export interface ChineseCalendarYear {
  readonly solarTerms: readonly ChineseSolarTermEvent[];
  readonly newMoons: readonly {
    readonly julianDateUt1: Ut1JulianDate;
    readonly civilDayNumber: number;
  }[];
  readonly months: readonly ChineseCalendarMonth[];
  readonly leapMonthIndex: number;
  readonly firstWinterSolsticeDayNumber: number;
  readonly secondWinterSolsticeDayNumber: number;
}
function solar(value: SolarDate): number[] {
  return [
    integer(value.year, -2147483648, 2147483647, "year"),
    integer(value.month, 1, 12, "month"),
    integer(value.day, 1, 31, "day"),
  ];
}
function lunar(v: readonly number[]): LunarDate {
  return Object.freeze({
    year: v[1]!,
    historicalYear: v[7]!,
    month: v[2]!,
    day: v[3]!,
    isLeap: !!v[4],
    monthDays: v[5]!,
    monthName: v[6]!,
  });
}
function term(v: readonly number[], i: number): ChineseSolarTermEvent {
  return Object.freeze({
    indexFromWinterSolstice: v[i]!,
    targetLongitudeRad: v[i + 1]!,
    julianDateUt1: new JulianDate(v[i + 2]!, v[i + 3]!, "UT1"),
    civilDayNumber: v[i + 4]!,
  });
}

export class ChineseCalendar {
  #closed = false;
  /** @internal */
  constructor(
    private readonly host: ContextHost,
    private readonly time: Time,
    private readonly handle: number,
    readonly config: ChineseCalendarConfig,
    private readonly onClose: () => void,
  ) {
    registerCalendar(this, host, (callback) => this.#use(callback));
  }
  #use<T>(callback: (handle: number) => T): T {
    return this.host.run(() => {
      if (this.#closed)
        throw new ClosedContextError("Chinese calendar is closed");
      return callback(this.handle);
    });
  }
  private call(op: number, input: readonly number[]): number[] {
    return this.#use((h) => {
      const reply = this.host.wire.fixed(
        "_taiyin_web_calendar",
        [h, op],
        input,
        512,
      );
      this.host.record(reply.values, 480);
      return this.host.wire.checked(reply, 480);
    });
  }
  close(): void {
    if (this.#closed) return;
    ensureCalendarCanClose(this);
    this.host.run(() => {
      this.host.wire.invoke(
        "_taiyin_chinese_calendar_context_destroy",
        this.handle,
      );
      this.#closed = true;
      this.onClose();
    });
  }
  fromSolar(value: SolarDate): OperationResult<LunarDate> {
    const v = this.call(8, solar(value));
    return result(lunar(v), new ResultFlags(v[0]!));
  }
  fromInstantUt1(jd: Ut1JulianDate): OperationResult<LunarDate> {
    sameScale(jd, "UT1");
    const v = this.call(9, jdValues(jd));
    return result(lunar(v), new ResultFlags(v[0]!));
  }
  fromLunar(value: LunarDate): OperationResult<SolarDate> {
    if (typeof value.isLeap !== "boolean")
      throw new TypeError("isLeap must be boolean");
    const v = this.call(10, [
      integer(value.year, -2147483648, 2147483647, "year"),
      integer(value.month, 1, 13, "lunar month"),
      integer(value.day, 1, 30, "lunar day"),
      +value.isLeap,
      integer(value.monthDays, 0, 30, "month days"),
      integer(value.monthName, 0, 5, "month name"),
    ]);
    return result(
      Object.freeze({ year: v[1]!, month: v[2]!, day: v[3]! }),
      new ResultFlags(v[0]!),
    );
  }
  getMonthDays(
    year: number,
    month: number,
    isLeap = false,
  ): OperationResult<number> {
    if (typeof isLeap !== "boolean")
      throw new TypeError("isLeap must be boolean");
    const v = this.call(11, [
      integer(year, -2147483648, 2147483647, "year"),
      integer(month, 1, 13, "month"),
      +isLeap,
    ]);
    return result(v[1]!, new ResultFlags(v[0]!));
  }
  instantFromLocal(local: AstroDateTime): OperationResult<UtcJulianDate> {
    return this.#use(() => {
      if (!(local instanceof AstroDateTime))
        throw new TypeError(
          "Local civil input must be AstroDateTime, not Date",
        );
      if (local.second === 60)
        throw new RangeError(
          "Local civil leap seconds require an explicit UTC calendar input",
        );
      const v = this.time.julianDay(local, "UTC");
      return result(
        v.value.addSeconds(-this.config.utcOffsetMinutes * 60),
        v.flags,
      );
    });
  }
  localFromInstant(utc: UtcJulianDate): OperationResult<AstroDateTime> {
    sameScale(utc, "UTC");
    return this.#use(() =>
      this.time.reverseJulianDay(
        utc.addSeconds(this.config.utcOffsetMinutes * 60),
      ),
    );
  }
  fourPillars(options: {
    instantUtc: UtcJulianDate;
    virtualTime: AstroDateTime;
    ratHourMode?: RatHourMode;
  }): OperationResult<FourPillars> {
    sameScale(options.instantUtc, "UTC");
    const v = this.call(12, [
      ...jdValues(options.instantUtc),
      integer(options.ratHourMode ?? 0, 0, 2, "rat hour mode"),
      ...dateValues(options.virtualTime),
    ]);
    return result(
      Object.freeze({ year: v[1]!, month: v[2]!, day: v[3]!, hour: v[4]! }),
      new ResultFlags(v[0]!),
    );
  }
  fourPillarsLocal(
    local: AstroDateTime,
    options: { ratHourMode?: RatHourMode } = {},
  ): OperationResult<FourPillars> {
    const utc = this.instantFromLocal(local);
    const p = this.fourPillars({
      instantUtc: utc.value,
      virtualTime: local,
      ...options,
    });
    return result(p.value, utc.flags.union(p.flags));
  }
  getSpecificJieQi(
    year: number,
    index: number,
  ): OperationResult<ChineseSolarTermEvent> {
    return this.event(1, [
      integer(year, -2147483648, 2147483647, "year"),
      integer(index, 0, 23, "solar term index"),
    ]);
  }
  private event(
    op: number,
    input: number[],
  ): OperationResult<ChineseSolarTermEvent> {
    const v = this.call(op, input);
    return result(term(v, 1), new ResultFlags(v[0]!));
  }
  previousJieQi(jd: Ut1JulianDate): OperationResult<ChineseSolarTermEvent> {
    sameScale(jd, "UT1");
    return this.event(2, jdValues(jd));
  }
  nextJieQi(jd: Ut1JulianDate): OperationResult<ChineseSolarTermEvent> {
    sameScale(jd, "UT1");
    return this.event(3, jdValues(jd));
  }
  previousJie(jd: Ut1JulianDate): OperationResult<ChineseSolarTermEvent> {
    sameScale(jd, "UT1");
    return this.event(4, jdValues(jd));
  }
  nextJie(jd: Ut1JulianDate): OperationResult<ChineseSolarTermEvent> {
    sameScale(jd, "UT1");
    return this.event(5, jdValues(jd));
  }
  previousQi(jd: Ut1JulianDate): OperationResult<ChineseSolarTermEvent> {
    sameScale(jd, "UT1");
    return this.event(6, jdValues(jd));
  }
  nextQi(jd: Ut1JulianDate): OperationResult<ChineseSolarTermEvent> {
    sameScale(jd, "UT1");
    return this.event(7, jdValues(jd));
  }
  calcYear(jd: Ut1JulianDate): OperationResult<ChineseCalendarYear> {
    sameScale(jd, "UT1");
    const v = this.call(0, jdValues(jd));
    return result(
      Object.freeze({
        solarTerms: Object.freeze(
          Array.from({ length: v[1]! }, (_, i) => term(v, 16 + 5 * i)),
        ),
        newMoons: Object.freeze(
          Array.from({ length: v[2]! }, (_, i) =>
            Object.freeze({
              julianDateUt1: new JulianDate(
                v[160 + 3 * i]!,
                v[161 + 3 * i]!,
                "UT1",
              ),
              civilDayNumber: v[162 + 3 * i]!,
            }),
          ),
        ),
        months: Object.freeze(
          Array.from({ length: v[3]! }, (_, i) => {
            const o = 224 + 10 * i;
            return Object.freeze({
              lunarYear: v[o]!,
              historicalYear: v[o + 9]!,
              month: v[o + 1]!,
              isLeap: !!v[o + 2],
              dayCount: v[o + 3]!,
              monthName: v[o + 4]!,
              monthBuildingBranch: v[o + 5]!,
              firstCivilDayNumber: v[o + 6]!,
              astronomicalNewMoonJulianDateUt1: new JulianDate(
                v[o + 7]!,
                v[o + 8]!,
                "UT1",
              ),
            });
          }),
        ),
        leapMonthIndex: v[4]!,
        firstWinterSolsticeDayNumber: v[5]!,
        secondWinterSolsticeDayNumber: v[6]!,
      }),
      new ResultFlags(v[0]!),
    );
  }
}
