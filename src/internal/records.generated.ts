// Generated from the version-1 C++ field-wise Wasm bridge. Do not hand-edit.
import type { JulianDate, AstroDateTime } from "../date.js";
export interface LunarEclipseResultTt {
  readonly kind: number;
  readonly maximumJulianDateTt: JulianDate<"TT"> | null;
  readonly umbralMagnitude: number;
  readonly penumbralMagnitude: number;
  readonly axisDistanceRad: number;
  readonly umbraRadiusRad: number;
  readonly penumbraRadiusRad: number;
  readonly moonRadiusRad: number;
  readonly contactJulianDateTt: readonly (JulianDate<"TT"> | null)[];
}
export interface LunarEclipseResultUt1 {
  readonly kind: number;
  readonly maximumJulianDateUt1: JulianDate<"UT1"> | null;
  readonly deltaTSeconds: number;
  readonly umbralMagnitude: number;
  readonly penumbralMagnitude: number;
  readonly axisDistanceRad: number;
  readonly umbraRadiusRad: number;
  readonly penumbraRadiusRad: number;
  readonly moonRadiusRad: number;
  readonly contactJulianDateUt1: readonly (JulianDate<"UT1"> | null)[];
}
export interface LocalLunarEclipseResultTt {
  readonly eclipseKind: number;
  readonly visibilityFlags: number;
  readonly maximumJulianDateTt: JulianDate<"TT"> | null;
  readonly umbralMagnitude: number;
  readonly penumbralMagnitude: number;
  readonly contactJulianDateTt: readonly (JulianDate<"TT"> | null)[];
  readonly contactMoonAltitudeDeg: readonly number[];
  readonly contactMoonAzimuthDeg: readonly number[];
  readonly moonriseJulianDateTt: JulianDate<"TT"> | null;
  readonly moonsetJulianDateTt: JulianDate<"TT"> | null;
}
export interface LocalLunarEclipseResultUt1 {
  readonly eclipseKind: number;
  readonly visibilityFlags: number;
  readonly maximumJulianDateUt1: JulianDate<"UT1"> | null;
  readonly deltaTSeconds: number;
  readonly umbralMagnitude: number;
  readonly penumbralMagnitude: number;
  readonly contactJulianDateUt1: readonly (JulianDate<"UT1"> | null)[];
  readonly contactMoonAltitudeDeg: readonly number[];
  readonly contactMoonAzimuthDeg: readonly number[];
  readonly moonriseJulianDateUt1: JulianDate<"UT1"> | null;
  readonly moonsetJulianDateUt1: JulianDate<"UT1"> | null;
}
export interface SolarEclipseResultTt {
  readonly kind: number;
  readonly maximumJulianDateTt: JulianDate<"TT"> | null;
  readonly axisDistanceKm: number;
  readonly penumbraRadiusKm: number;
  readonly coreRadiusKm: number;
  readonly penumbralMarginKm: number;
  readonly centralMarginKm: number;
  readonly maximumLatitudeDeg: number;
  readonly maximumLongitudeDeg: number;
  readonly contactJulianDateTt: readonly (JulianDate<"TT"> | null)[];
}
export interface SolarEclipseResultUt1 {
  readonly kind: number;
  readonly maximumJulianDateUt1: JulianDate<"UT1"> | null;
  readonly deltaTSeconds: number;
  readonly axisDistanceKm: number;
  readonly penumbraRadiusKm: number;
  readonly coreRadiusKm: number;
  readonly penumbralMarginKm: number;
  readonly centralMarginKm: number;
  readonly maximumLatitudeDeg: number;
  readonly maximumLongitudeDeg: number;
  readonly contactJulianDateUt1: readonly (JulianDate<"UT1"> | null)[];
}
export interface LocalSolarEclipseCircumstancesTt {
  readonly julianDateTt: JulianDate<"TT"> | null;
  readonly magnitude: number;
  readonly obscuration: number;
  readonly centerSeparationDeg: number;
  readonly sunAngularRadiusDeg: number;
  readonly moonAngularRadiusDeg: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
}
export interface LocalSolarEclipseCircumstancesUt1 {
  readonly julianDateUt1: JulianDate<"UT1"> | null;
  readonly deltaTSeconds: number;
  readonly magnitude: number;
  readonly obscuration: number;
  readonly centerSeparationDeg: number;
  readonly sunAngularRadiusDeg: number;
  readonly moonAngularRadiusDeg: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
}
export interface LocalSolarEclipseResultTt {
  readonly kind: number;
  readonly maximumJulianDateTt: JulianDate<"TT"> | null;
  readonly magnitude: number;
  readonly obscuration: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
  readonly contactJulianDateTt: readonly (JulianDate<"TT"> | null)[];
  readonly positionAngleC1Deg: number;
  readonly positionAngleC4Deg: number;
  readonly vertexAngleC1Deg: number;
  readonly vertexAngleC4Deg: number;
  readonly sunriseMagnitude: number;
  readonly sunsetMagnitude: number;
  readonly durationSeconds: number;
  readonly moonSunRadiusRatio: number;
}
export interface LocalSolarEclipseResultUt1 {
  readonly kind: number;
  readonly maximumJulianDateUt1: JulianDate<"UT1"> | null;
  readonly deltaTSeconds: number;
  readonly magnitude: number;
  readonly obscuration: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
  readonly contactJulianDateUt1: readonly (JulianDate<"UT1"> | null)[];
  readonly positionAngleC1Deg: number;
  readonly positionAngleC4Deg: number;
  readonly vertexAngleC1Deg: number;
  readonly vertexAngleC4Deg: number;
  readonly sunriseMagnitude: number;
  readonly sunsetMagnitude: number;
  readonly durationSeconds: number;
  readonly moonSunRadiusRatio: number;
}
export interface LocalSolarEclipseBoundary {
  readonly centerLongitudeDeg: number;
  readonly centerLatitudeDeg: number;
  readonly centerKind: number;
  readonly umbraNorthLongitudeDeg: number;
  readonly umbraNorthLatitudeDeg: number;
  readonly umbraSouthLongitudeDeg: number;
  readonly umbraSouthLatitudeDeg: number;
  readonly penumbraNorthLongitudeDeg: number;
  readonly penumbraNorthLatitudeDeg: number;
  readonly penumbraSouthLongitudeDeg: number;
  readonly penumbraSouthLatitudeDeg: number;
  readonly umbraWidthKm: number;
}
export interface SolarEclipsePathPoint {
  readonly julianDateTt: JulianDate<"TT"> | null;
  readonly julianDateUt1: JulianDate<"UT1"> | null;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly elevationM: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
}
export interface SolarEclipseRouteRow {
  readonly julianDateTt: JulianDate<"TT"> | null;
  readonly julianDateUt1: JulianDate<"UT1"> | null;
  readonly centerLine: SolarEclipsePathPoint;
  readonly penumbralNorthLimit: SolarEclipsePathPoint;
  readonly penumbralSouthLimit: SolarEclipsePathPoint;
  readonly northLimit: SolarEclipsePathPoint;
  readonly southLimit: SolarEclipsePathPoint;
  readonly halfMagnitudeNorthLimit: SolarEclipsePathPoint;
  readonly halfMagnitudeSouthLimit: SolarEclipsePathPoint;
  readonly pathWidthKm: number;
  readonly durationSeconds: number;
  readonly sunAltitudeDeg: number;
  readonly sunAzimuthDeg: number;
}
export interface SolarEclipseWhere {
  readonly julianDateTt: JulianDate<"TT"> | null;
  readonly julianDateUt1: JulianDate<"UT1"> | null;
  readonly centerLine: SolarEclipsePathPoint;
  readonly penumbralNorthLimit: SolarEclipsePathPoint;
  readonly penumbralSouthLimit: SolarEclipsePathPoint;
  readonly northLimit: SolarEclipsePathPoint;
  readonly southLimit: SolarEclipsePathPoint;
  readonly magnitude: number;
  readonly obscuration: number;
  readonly centerSeparationDeg: number;
  readonly sunAngularRadiusDeg: number;
  readonly moonAngularRadiusDeg: number;
}
export interface SolarEclipseRouteCurvePoint {
  readonly julianDateTt: JulianDate<"TT"> | null;
  readonly julianDateUt1: JulianDate<"UT1"> | null;
  readonly curveKind: number;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
}
export interface SolarEclipseRouteProductPoint {
  readonly julianDateTt: JulianDate<"TT"> | null;
  readonly julianDateUt1: JulianDate<"UT1"> | null;
  readonly pointKind: number;
  readonly sourceCurveKind: number;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly unwrappedLongitudeDeg: number;
}
export interface SolarEclipseRouteProductSummary {
  readonly flags: number;
  readonly curvePointCount: number;
  readonly centerLineCount: number;
  readonly coreNorthCount: number;
  readonly coreSouthCount: number;
  readonly coreBeginHorizonCount: number;
  readonly coreEndHorizonCount: number;
  readonly penumbralNorthCount: number;
  readonly penumbralSouthCount: number;
  readonly halfMagnitudeNorthCount: number;
  readonly halfMagnitudeSouthCount: number;
  readonly corePolygonPointCount: number;
  readonly penumbralPolygonPointCount: number;
  readonly halfMagnitudePolygonPointCount: number;
  readonly polygonPointCount: number;
  readonly minLatitudeDeg: number;
  readonly maxLatitudeDeg: number;
  readonly minUnwrappedLongitudeDeg: number;
  readonly maxUnwrappedLongitudeDeg: number;
}
export interface SolarBesselianElements {
  readonly tHours: number;
  readonly x: number;
  readonly y: number;
  readonly zeta: number;
  readonly dDeg: number;
  readonly muDeg: number;
  readonly l1: number;
  readonly l2: number;
  readonly f1Deg: number;
  readonly f2Deg: number;
  readonly tanF1: number;
  readonly tanF2: number;
  readonly gamma: number;
}
export interface SolarBesselianPolynomial {
  readonly t0JulianDateTt: JulianDate<"TT"> | null;
  readonly spanHours: number;
  readonly sampleStepHours: number;
  readonly degree: number;
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly zeta: readonly number[];
  readonly dDeg: readonly number[];
  readonly muDeg: readonly number[];
  readonly l1: readonly number[];
  readonly l2: readonly number[];
  readonly f1Deg: number;
  readonly f2Deg: number;
  readonly tanF1: number;
  readonly tanF2: number;
  readonly center: SolarBesselianElements;
  readonly maxResidual: SolarBesselianElements;
}
export interface GanzhiFourPillars {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
}
export interface BaziContextConfig {
  readonly earthPalaceMode: number;
  readonly qiyunDirectionMode: number;
  readonly qiyunTimeModel: number;
  readonly dayunBoundaryModel: number;
}
export interface BaziChart {
  readonly yearPillar: number;
  readonly monthPillar: number;
  readonly dayPillar: number;
  readonly hourPillar: number;
  readonly mingGong: number;
  readonly shenGong: number;
  readonly taiYuan: number;
  readonly taiXi: number;
  readonly hiddenStemCount: readonly number[];
  readonly hiddenStems: readonly (readonly number[])[];
  readonly visibleTenGods: readonly number[];
  readonly hiddenTenGods: readonly (readonly number[])[];
  readonly lifeStages: readonly number[];
  readonly nayinIds: readonly number[];
}
export interface BaziRelation {
  readonly kind: number;
  readonly pillarMask: number;
  readonly combinedElementId: number;
}
export interface BaziQiyunResult {
  readonly direction: number;
  readonly timeModel: number;
  readonly referenceJieIndex: number;
  readonly jieIntervalDays: number;
  readonly startAgeYears: number;
  readonly offsetYears: number;
  readonly offsetMonths: number;
  readonly offsetDays: number;
  readonly offsetHours: number;
  readonly offsetMinutes: number;
  readonly offsetSeconds: number;
  readonly referenceJieJulianDateUt1: JulianDate<"UT1"> | null;
  readonly startJulianDateUt1: JulianDate<"UT1"> | null;
  readonly startCivilTime: AstroDateTime;
}
export interface BaziDayun {
  readonly index: number;
  readonly ganzhi: number;
  readonly startVirtualAge: number;
  readonly endVirtualAge: number;
  readonly startJulianDateUt1: JulianDate<"UT1"> | null;
  readonly endJulianDateUt1: JulianDate<"UT1"> | null;
  readonly startCivilTime: AstroDateTime;
  readonly endCivilTime: AstroDateTime;
}
export interface BaziXiaoyun {
  readonly age: number;
  readonly ganzhi: number;
}
export interface BaziRenyuanSilingSegment {
  readonly stemId: number;
  readonly originKind: number;
  readonly segmentIndex: number;
  readonly startDay: number;
  readonly endDay: number;
}
export interface BaziRenyuanSilingResult {
  readonly tableModel: number;
  readonly timeModel: number;
  readonly monthBranchId: number;
  readonly stemId: number;
  readonly originKind: number;
  readonly segmentIndex: number;
  readonly previousJieIndex: number;
  readonly daysSinceJie: number;
  readonly segmentStartDay: number;
  readonly segmentEndDay: number;
  readonly previousJieJulianDateUt1: JulianDate<"UT1"> | null;
}
export interface BaziReverseCandidate {
  readonly startJdUt1: JulianDate<"UT1"> | null;
  readonly endJdUt1: JulianDate<"UT1"> | null;
  readonly startVirtualTime: AstroDateTime;
  readonly endVirtualTime: AstroDateTime;
  readonly pillars: GanzhiFourPillars;
}
export interface ZiweiChartClock {
  readonly mode: number;
  readonly longitudeRad: number;
}
export interface ZiweiPlacementInput {
  readonly yearStem: number;
  readonly yearBranch: number;
  readonly month: number;
  readonly day: number;
  readonly hourBranch: number;
}
export interface ZiweiPlacementPatch {
  readonly yearStem: number;
  readonly yearBranch: number;
  readonly month: number;
  readonly day: number;
  readonly hourBranch: number;
  readonly updateBureau: number;
}
export interface ZiweiCastingOptions {
  readonly gender: number;
  readonly chartMode: number;
  readonly fixedBureau: number;
}
export interface ZiweiCastingSummary {
  readonly input: ZiweiPlacementInput;
  readonly originalInput: ZiweiPlacementInput;
  readonly overrides: ZiweiPlacementPatch;
  readonly index: number;
  readonly method: number;
  readonly gender: number;
  readonly chartMode: number;
  readonly bureau: number;
  readonly originalBureau: number;
  readonly bodyPalace: number;
  readonly updateBureau: number;
  readonly lifePalaceShift: number;
  readonly yearTransformStem: number;
  readonly palaceBranches: readonly number[];
  readonly palaceStems: readonly number[];
  readonly lifeMaster: number;
  readonly bodyMaster: number;
  readonly yearLu: number;
  readonly yearQuan: number;
  readonly yearKe: number;
  readonly yearJi: number;
}
export interface ZiweiOmittedPlacement {
  readonly starId: number;
  readonly missingInputs: number;
}
export interface ZiweiBirthOptions {
  readonly ratHourMode: number;
  readonly leapMonthStrategy: number;
  readonly chartMode: number;
  readonly wuHuDunYearBoundary: number;
  readonly sihuaYearBoundary: number;
  readonly bodyMasterYearBoundary: number;
}
export interface ZiweiFlowOptions {
  readonly boundary: number;
  readonly ratHourMode: number;
  readonly childhoodStrategy: number;
  readonly flowMonthPalaceStrategy: number;
}
export interface ZiweiTransformSet {
  readonly lu: number;
  readonly quan: number;
  readonly ke: number;
  readonly ji: number;
}
export interface ZiweiFlowSummary {
  readonly effectiveBirthYear: number;
  readonly effectiveTargetYear: number;
  readonly targetMonth: number;
  readonly targetMonthSequence: number;
  readonly targetDay: number;
  readonly targetHourIndex: number;
  readonly targetRatHourSegment: number;
  readonly targetMonthIsLeap: number;
  readonly decadeIndex: number;
  readonly decadeStartAge: number;
  readonly decadeEndAge: number;
  readonly smallLimitVirtualAge: number;
  readonly smallLimitStem: number;
  readonly smallLimitBranch: number;
  readonly targetMonthBuildingBranch: number;
  readonly targetEffectiveMonth: number;
  readonly targetMonthName: number;
  readonly targetPalaceMonthIndex: number;
  readonly targetLunarYear: number;
}
export interface ZiweiReverseQuery {
  readonly lucunBranch: number;
  readonly hongluanBranch: number;
  readonly zuofuBranch: number;
  readonly youbiBranch: number;
  readonly wenchangBranch: number;
  readonly wenquBranch: number;
  readonly santaiBranch: number;
  readonly bazuoBranch: number;
  readonly ziweiBranch: number;
}
export interface ZiweiReverseRequest {
  readonly startInstantUtc: JulianDate<"UTC"> | null;
  readonly endInstantUtc: JulianDate<"UTC"> | null;
  readonly startVirtualTime: AstroDateTime;
  readonly gender: number;
  readonly birthOptions: ZiweiBirthOptions;
  readonly query: ZiweiReverseQuery;
}
export interface ZiweiReverseCandidate {
  readonly instantUtc: JulianDate<"UTC"> | null;
  readonly virtualTime: AstroDateTime;
  readonly lunarYear: number;
  readonly lunarMonth: number;
  readonly lunarDay: number;
  readonly lunarIsLeap: number;
  readonly hourBranch: number;
  readonly ratHourSegment: number;
}
export const recordSchemas = {
  taiyin_split_julian_date: [
    {
      key: "dayNumber",
      type: "int64_t",
      shape: [],
    },
    {
      key: "dayFraction",
      type: "double",
      shape: [],
    },
  ],
  taiyin_lunar_eclipse_result_tt: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "umbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "penumbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "axisDistanceRad",
      type: "double",
      shape: [],
    },
    {
      key: "umbraRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "moonRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [7],
    },
  ],
  taiyin_lunar_eclipse_result_ut: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "deltaTSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "umbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "penumbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "axisDistanceRad",
      type: "double",
      shape: [],
    },
    {
      key: "umbraRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "moonRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [7],
    },
  ],
  taiyin_local_lunar_eclipse_result_tt: [
    {
      key: "eclipseKind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "visibilityFlags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "umbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "penumbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [7],
    },
    {
      key: "contactMoonAltitudeDeg",
      type: "double",
      shape: [7],
    },
    {
      key: "contactMoonAzimuthDeg",
      type: "double",
      shape: [7],
    },
    {
      key: "moonriseJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "moonsetJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
  ],
  taiyin_local_lunar_eclipse_result_ut: [
    {
      key: "eclipseKind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "visibilityFlags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "deltaTSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "umbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "penumbralMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [7],
    },
    {
      key: "contactMoonAltitudeDeg",
      type: "double",
      shape: [7],
    },
    {
      key: "contactMoonAzimuthDeg",
      type: "double",
      shape: [7],
    },
    {
      key: "moonriseJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "moonsetJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_result_tt: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "axisDistanceKm",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraRadiusKm",
      type: "double",
      shape: [],
    },
    {
      key: "coreRadiusKm",
      type: "double",
      shape: [],
    },
    {
      key: "penumbralMarginKm",
      type: "double",
      shape: [],
    },
    {
      key: "centralMarginKm",
      type: "double",
      shape: [],
    },
    {
      key: "maximumLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "maximumLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [5],
    },
  ],
  taiyin_solar_eclipse_result_ut: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "deltaTSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "axisDistanceKm",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraRadiusKm",
      type: "double",
      shape: [],
    },
    {
      key: "coreRadiusKm",
      type: "double",
      shape: [],
    },
    {
      key: "penumbralMarginKm",
      type: "double",
      shape: [],
    },
    {
      key: "centralMarginKm",
      type: "double",
      shape: [],
    },
    {
      key: "maximumLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "maximumLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [5],
    },
  ],
  taiyin_local_solar_eclipse_circumstances_tt: [
    {
      key: "julianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "magnitude",
      type: "double",
      shape: [],
    },
    {
      key: "obscuration",
      type: "double",
      shape: [],
    },
    {
      key: "centerSeparationDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAngularRadiusDeg",
      type: "double",
      shape: [],
    },
    {
      key: "moonAngularRadiusDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_local_solar_eclipse_circumstances_ut: [
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "deltaTSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "magnitude",
      type: "double",
      shape: [],
    },
    {
      key: "obscuration",
      type: "double",
      shape: [],
    },
    {
      key: "centerSeparationDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAngularRadiusDeg",
      type: "double",
      shape: [],
    },
    {
      key: "moonAngularRadiusDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_local_solar_eclipse_result_tt: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "magnitude",
      type: "double",
      shape: [],
    },
    {
      key: "obscuration",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthDeg",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [5],
    },
    {
      key: "positionAngleC1Deg",
      type: "double",
      shape: [],
    },
    {
      key: "positionAngleC4Deg",
      type: "double",
      shape: [],
    },
    {
      key: "vertexAngleC1Deg",
      type: "double",
      shape: [],
    },
    {
      key: "vertexAngleC4Deg",
      type: "double",
      shape: [],
    },
    {
      key: "sunriseMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "sunsetMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "durationSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "moonSunRadiusRatio",
      type: "double",
      shape: [],
    },
  ],
  taiyin_local_solar_eclipse_result_ut: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "maximumJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "deltaTSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "magnitude",
      type: "double",
      shape: [],
    },
    {
      key: "obscuration",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthDeg",
      type: "double",
      shape: [],
    },
    {
      key: "contactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [5],
    },
    {
      key: "positionAngleC1Deg",
      type: "double",
      shape: [],
    },
    {
      key: "positionAngleC4Deg",
      type: "double",
      shape: [],
    },
    {
      key: "vertexAngleC1Deg",
      type: "double",
      shape: [],
    },
    {
      key: "vertexAngleC4Deg",
      type: "double",
      shape: [],
    },
    {
      key: "sunriseMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "sunsetMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "durationSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "moonSunRadiusRatio",
      type: "double",
      shape: [],
    },
  ],
  taiyin_local_solar_eclipse_boundary: [
    {
      key: "centerLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "centerLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "centerKind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "umbraNorthLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "umbraNorthLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "umbraSouthLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "umbraSouthLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraNorthLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraNorthLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraSouthLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "penumbraSouthLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "umbraWidthKm",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_path_point: [
    {
      key: "julianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "latitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "elevationM",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_route_row: [
    {
      key: "julianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "centerLine",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "penumbralNorthLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "penumbralSouthLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "northLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "southLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "halfMagnitudeNorthLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "halfMagnitudeSouthLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "pathWidthKm",
      type: "double",
      shape: [],
    },
    {
      key: "durationSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_where: [
    {
      key: "julianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "centerLine",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "penumbralNorthLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "penumbralSouthLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "northLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "southLimit",
      type: "taiyin_solar_eclipse_path_point",
      shape: [],
    },
    {
      key: "magnitude",
      type: "double",
      shape: [],
    },
    {
      key: "obscuration",
      type: "double",
      shape: [],
    },
    {
      key: "centerSeparationDeg",
      type: "double",
      shape: [],
    },
    {
      key: "sunAngularRadiusDeg",
      type: "double",
      shape: [],
    },
    {
      key: "moonAngularRadiusDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_route_curve_point: [
    {
      key: "julianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "curveKind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "latitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_route_product_point: [
    {
      key: "julianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "pointKind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "sourceCurveKind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "latitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "unwrappedLongitudeDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_eclipse_route_product_summary: [
    {
      key: "flags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "curvePointCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "centerLineCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "coreNorthCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "coreSouthCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "coreBeginHorizonCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "coreEndHorizonCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "penumbralNorthCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "penumbralSouthCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "halfMagnitudeNorthCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "halfMagnitudeSouthCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "corePolygonPointCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "penumbralPolygonPointCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "halfMagnitudePolygonPointCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "polygonPointCount",
      type: "size_t",
      shape: [],
    },
    {
      key: "minLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "maxLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "minUnwrappedLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "maxUnwrappedLongitudeDeg",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_besselian_elements: [
    {
      key: "tHours",
      type: "double",
      shape: [],
    },
    {
      key: "x",
      type: "double",
      shape: [],
    },
    {
      key: "y",
      type: "double",
      shape: [],
    },
    {
      key: "zeta",
      type: "double",
      shape: [],
    },
    {
      key: "dDeg",
      type: "double",
      shape: [],
    },
    {
      key: "muDeg",
      type: "double",
      shape: [],
    },
    {
      key: "l1",
      type: "double",
      shape: [],
    },
    {
      key: "l2",
      type: "double",
      shape: [],
    },
    {
      key: "f1Deg",
      type: "double",
      shape: [],
    },
    {
      key: "f2Deg",
      type: "double",
      shape: [],
    },
    {
      key: "tanF1",
      type: "double",
      shape: [],
    },
    {
      key: "tanF2",
      type: "double",
      shape: [],
    },
    {
      key: "gamma",
      type: "double",
      shape: [],
    },
  ],
  taiyin_solar_besselian_polynomial: [
    {
      key: "t0JulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "spanHours",
      type: "double",
      shape: [],
    },
    {
      key: "sampleStepHours",
      type: "double",
      shape: [],
    },
    {
      key: "degree",
      type: "int32_t",
      shape: [],
    },
    {
      key: "x",
      type: "double",
      shape: [8],
    },
    {
      key: "y",
      type: "double",
      shape: [8],
    },
    {
      key: "zeta",
      type: "double",
      shape: [8],
    },
    {
      key: "dDeg",
      type: "double",
      shape: [8],
    },
    {
      key: "muDeg",
      type: "double",
      shape: [8],
    },
    {
      key: "l1",
      type: "double",
      shape: [8],
    },
    {
      key: "l2",
      type: "double",
      shape: [8],
    },
    {
      key: "f1Deg",
      type: "double",
      shape: [],
    },
    {
      key: "f2Deg",
      type: "double",
      shape: [],
    },
    {
      key: "tanF1",
      type: "double",
      shape: [],
    },
    {
      key: "tanF2",
      type: "double",
      shape: [],
    },
    {
      key: "center",
      type: "taiyin_solar_besselian_elements",
      shape: [],
    },
    {
      key: "maxResidual",
      type: "taiyin_solar_besselian_elements",
      shape: [],
    },
  ],
  taiyin_calendar_datetime: [
    {
      key: "year",
      type: "int32_t",
      shape: [],
    },
    {
      key: "month",
      type: "int32_t",
      shape: [],
    },
    {
      key: "day",
      type: "int32_t",
      shape: [],
    },
    {
      key: "hour",
      type: "int32_t",
      shape: [],
    },
    {
      key: "minute",
      type: "int32_t",
      shape: [],
    },
    {
      key: "second",
      type: "double",
      shape: [],
    },
  ],
  taiyin_ganzhi_four_pillars: [
    {
      key: "year",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "month",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "day",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "hour",
      type: "taiyin_ganzhi",
      shape: [],
    },
  ],
  taiyin_bazi_context_config: [
    {
      key: "earthPalaceMode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "qiyunDirectionMode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "qiyunTimeModel",
      type: "int32_t",
      shape: [],
    },
    {
      key: "dayunBoundaryModel",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_bazi_chart: [
    {
      key: "yearPillar",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "monthPillar",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "dayPillar",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "hourPillar",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "mingGong",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "shenGong",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "taiYuan",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "taiXi",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "hiddenStemCount",
      type: "uint8_t",
      shape: [4],
    },
    {
      key: "hiddenStems",
      type: "uint8_t",
      shape: [4, 3],
    },
    {
      key: "visibleTenGods",
      type: "uint8_t",
      shape: [4],
    },
    {
      key: "hiddenTenGods",
      type: "uint8_t",
      shape: [4, 3],
    },
    {
      key: "lifeStages",
      type: "uint8_t",
      shape: [4],
    },
    {
      key: "nayinIds",
      type: "uint8_t",
      shape: [4],
    },
  ],
  taiyin_bazi_relation: [
    {
      key: "kind",
      type: "int32_t",
      shape: [],
    },
    {
      key: "pillarMask",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "combinedElementId",
      type: "uint8_t",
      shape: [],
    },
  ],
  taiyin_bazi_qiyun_result: [
    {
      key: "direction",
      type: "int32_t",
      shape: [],
    },
    {
      key: "timeModel",
      type: "int32_t",
      shape: [],
    },
    {
      key: "referenceJieIndex",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "jieIntervalDays",
      type: "double",
      shape: [],
    },
    {
      key: "startAgeYears",
      type: "double",
      shape: [],
    },
    {
      key: "offsetYears",
      type: "int32_t",
      shape: [],
    },
    {
      key: "offsetMonths",
      type: "int32_t",
      shape: [],
    },
    {
      key: "offsetDays",
      type: "int32_t",
      shape: [],
    },
    {
      key: "offsetHours",
      type: "int32_t",
      shape: [],
    },
    {
      key: "offsetMinutes",
      type: "int32_t",
      shape: [],
    },
    {
      key: "offsetSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "referenceJieJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "startJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "startCivilTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
  ],
  taiyin_bazi_dayun: [
    {
      key: "index",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "ganzhi",
      type: "taiyin_ganzhi",
      shape: [],
    },
    {
      key: "startVirtualAge",
      type: "int32_t",
      shape: [],
    },
    {
      key: "endVirtualAge",
      type: "int32_t",
      shape: [],
    },
    {
      key: "startJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "endJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "startCivilTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
    {
      key: "endCivilTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
  ],
  taiyin_bazi_xiaoyun: [
    {
      key: "age",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "ganzhi",
      type: "taiyin_ganzhi",
      shape: [],
    },
  ],
  taiyin_bazi_renyuan_siling_segment: [
    {
      key: "stemId",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "originKind",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "segmentIndex",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "startDay",
      type: "double",
      shape: [],
    },
    {
      key: "endDay",
      type: "double",
      shape: [],
    },
  ],
  taiyin_bazi_renyuan_siling_result: [
    {
      key: "tableModel",
      type: "int32_t",
      shape: [],
    },
    {
      key: "timeModel",
      type: "int32_t",
      shape: [],
    },
    {
      key: "monthBranchId",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "stemId",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "originKind",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "segmentIndex",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "previousJieIndex",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "daysSinceJie",
      type: "double",
      shape: [],
    },
    {
      key: "segmentStartDay",
      type: "double",
      shape: [],
    },
    {
      key: "segmentEndDay",
      type: "double",
      shape: [],
    },
    {
      key: "previousJieJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
  ],
  taiyin_bazi_reverse_candidate: [
    {
      key: "startJdUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "endJdUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "startVirtualTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
    {
      key: "endVirtualTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
    {
      key: "pillars",
      type: "taiyin_ganzhi_four_pillars",
      shape: [],
    },
  ],
  taiyin_ziwei_chart_clock: [
    {
      key: "mode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "longitudeRad",
      type: "double",
      shape: [],
    },
  ],
  taiyin_ziwei_placement_input: [
    {
      key: "yearStem",
      type: "int32_t",
      shape: [],
    },
    {
      key: "yearBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "month",
      type: "int32_t",
      shape: [],
    },
    {
      key: "day",
      type: "int32_t",
      shape: [],
    },
    {
      key: "hourBranch",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_placement_patch: [
    {
      key: "yearStem",
      type: "int32_t",
      shape: [],
    },
    {
      key: "yearBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "month",
      type: "int32_t",
      shape: [],
    },
    {
      key: "day",
      type: "int32_t",
      shape: [],
    },
    {
      key: "hourBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "updateBureau",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_casting_options: [
    {
      key: "gender",
      type: "int32_t",
      shape: [],
    },
    {
      key: "chartMode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "fixedBureau",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_casting_summary: [
    {
      key: "input",
      type: "taiyin_ziwei_placement_input",
      shape: [],
    },
    {
      key: "originalInput",
      type: "taiyin_ziwei_placement_input",
      shape: [],
    },
    {
      key: "overrides",
      type: "taiyin_ziwei_placement_patch",
      shape: [],
    },
    {
      key: "index",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "method",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "gender",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "chartMode",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "bureau",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "originalBureau",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "bodyPalace",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "updateBureau",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "lifePalaceShift",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "yearTransformStem",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "palaceBranches",
      type: "uint8_t",
      shape: [12],
    },
    {
      key: "palaceStems",
      type: "uint8_t",
      shape: [12],
    },
    {
      key: "lifeMaster",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "bodyMaster",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "yearLu",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "yearQuan",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "yearKe",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "yearJi",
      type: "uint16_t",
      shape: [],
    },
  ],
  taiyin_ziwei_omitted_placement: [
    {
      key: "starId",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "missingInputs",
      type: "uint32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_birth_options: [
    {
      key: "ratHourMode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "leapMonthStrategy",
      type: "int32_t",
      shape: [],
    },
    {
      key: "chartMode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "wuHuDunYearBoundary",
      type: "int32_t",
      shape: [],
    },
    {
      key: "sihuaYearBoundary",
      type: "int32_t",
      shape: [],
    },
    {
      key: "bodyMasterYearBoundary",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_flow_options: [
    {
      key: "boundary",
      type: "int32_t",
      shape: [],
    },
    {
      key: "ratHourMode",
      type: "int32_t",
      shape: [],
    },
    {
      key: "childhoodStrategy",
      type: "int32_t",
      shape: [],
    },
    {
      key: "flowMonthPalaceStrategy",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_transform_set: [
    {
      key: "lu",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "quan",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "ke",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "ji",
      type: "uint16_t",
      shape: [],
    },
  ],
  taiyin_ziwei_flow_summary: [
    {
      key: "effectiveBirthYear",
      type: "int32_t",
      shape: [],
    },
    {
      key: "effectiveTargetYear",
      type: "int32_t",
      shape: [],
    },
    {
      key: "targetMonth",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetMonthSequence",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetDay",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetHourIndex",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetRatHourSegment",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetMonthIsLeap",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "decadeIndex",
      type: "uint16_t",
      shape: [],
    },
    {
      key: "decadeStartAge",
      type: "int32_t",
      shape: [],
    },
    {
      key: "decadeEndAge",
      type: "int32_t",
      shape: [],
    },
    {
      key: "smallLimitVirtualAge",
      type: "int32_t",
      shape: [],
    },
    {
      key: "smallLimitStem",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "smallLimitBranch",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetMonthBuildingBranch",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetEffectiveMonth",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetMonthName",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetPalaceMonthIndex",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "targetLunarYear",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_reverse_query: [
    {
      key: "lucunBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "hongluanBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "zuofuBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "youbiBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "wenchangBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "wenquBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "santaiBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "bazuoBranch",
      type: "int32_t",
      shape: [],
    },
    {
      key: "ziweiBranch",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_ziwei_reverse_request: [
    {
      key: "startInstantUtc",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "endInstantUtc",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "startVirtualTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
    {
      key: "gender",
      type: "int32_t",
      shape: [],
    },
    {
      key: "birthOptions",
      type: "taiyin_ziwei_birth_options",
      shape: [],
    },
    {
      key: "query",
      type: "taiyin_ziwei_reverse_query",
      shape: [],
    },
  ],
  taiyin_ziwei_reverse_candidate: [
    {
      key: "instantUtc",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "virtualTime",
      type: "taiyin_calendar_datetime",
      shape: [],
    },
    {
      key: "lunarYear",
      type: "int32_t",
      shape: [],
    },
    {
      key: "lunarMonth",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "lunarDay",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "lunarIsLeap",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "hourBranch",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "ratHourSegment",
      type: "uint8_t",
      shape: [],
    },
  ],
} as const;
