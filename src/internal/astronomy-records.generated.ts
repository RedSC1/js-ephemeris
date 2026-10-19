// Generated field-wise C ABI records; no native layouts/pointers are public.
import type { JulianDate, AstroDateTime } from "../date.js";
export interface NativeEphemerisDiagnostic {
  readonly status: number;
  readonly targetId: number;
  readonly centerId: number;
  readonly frame: number;
  readonly julianDateTdb: JulianDate | null;
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
export interface NativeVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export interface NativeCartesianState {
  readonly positionAu: NativeVector3;
  readonly velocityAuPerDay: NativeVector3;
  readonly accelerationAuPerDay2: NativeVector3;
}
export interface ApparentPosition {
  readonly bodyId: number;
  readonly bodyMaskBit: number;
  readonly status: number;
  readonly diagnostic: NativeEphemerisDiagnostic;
  readonly geometricState: NativeCartesianState;
  readonly apparentState: NativeCartesianState;
  readonly longitudeRad: number;
  readonly latitudeRad: number;
  readonly distanceAu: number;
  readonly lightTimeDays: number;
  readonly cacheHit: number;
}
export interface HorizontalCoordinates {
  readonly azimuthRad: number;
  readonly altitudeRad: number;
  readonly distanceAu: number;
}
export interface HorizontalRates {
  readonly azimuthRateRadPerDay: number;
  readonly altitudeRateRadPerDay: number;
  readonly distanceRateAuPerDay: number;
}
export interface ObservedPosition {
  readonly bodyId: number;
  readonly status: number;
  readonly diagnostic: NativeEphemerisDiagnostic;
  readonly apparent: ApparentPosition;
  readonly horizontal: HorizontalCoordinates;
  readonly horizontalRates: HorizontalRates;
  readonly refractedHorizontal: HorizontalCoordinates;
  readonly refractedHorizontalRates: HorizontalRates;
}
export interface RuntimeRegisteredDataSource {
  readonly kind: number;
  readonly format: number;
  readonly flags: number;
  readonly itemCount: bigint;
  readonly jdStart: number;
  readonly jdEnd: number;
}
export interface BodyPhenomena {
  readonly phaseAngleRad: number;
  readonly illuminatedFraction: number;
  readonly solarElongationRad: number;
  readonly apparentDiameterRad: number;
  readonly apparentMagnitude: number;
  readonly horizontalParallaxRad: number;
}
export interface BodyOsculatingOrbit {
  readonly bodyId: number;
  readonly centerId: number;
  readonly referenceFrameId: number;
  readonly gravitationalParameterAu3PerDay2: number;
  readonly semiMajorAxisAu: number;
  readonly eccentricity: number;
  readonly inclinationRad: number;
  readonly longitudeOfAscendingNodeRad: number;
  readonly argumentOfPeriapsisRad: number;
  readonly trueAnomalyRad: number;
  readonly meanAnomalyRad: number;
  readonly periapsisDistanceAu: number;
  readonly apoapsisDistanceAu: number;
  readonly osculatingPeriodDays: number;
  readonly currentDistanceAu: number;
  readonly radialVelocityAuPerDay: number;
}
export interface BodyOrbitReferencePoint {
  readonly positionAu: NativeVector3;
  readonly longitudeRad: number;
  readonly latitudeRad: number;
  readonly distanceAu: number;
}
export interface BodyOrbitReferencePoints {
  readonly bodyId: number;
  readonly centerId: number;
  readonly referenceFrameId: number;
  readonly modelId: number;
  readonly ascendingNode: BodyOrbitReferencePoint;
  readonly descendingNode: BodyOrbitReferencePoint;
  readonly periapsis: BodyOrbitReferencePoint;
  readonly apoapsis: BodyOrbitReferencePoint;
  readonly secondFocus: BodyOrbitReferencePoint;
}
export interface BodyApsisSearchResult {
  readonly bodyId: number;
  readonly centerId: number;
  readonly kind: number;
  readonly jd: JulianDate | null;
  readonly distanceAu: number;
  readonly radialVelocityAuPerDay: number;
  readonly iterationCount: number;
  readonly evaluationCount: number;
}
export interface BodyNodeSearchResult {
  readonly bodyId: number;
  readonly centerId: number;
  readonly referenceFrameId: number;
  readonly kind: number;
  readonly jd: JulianDate | null;
  readonly referencePlaneAngleRad: number;
  readonly distanceAu: number;
  readonly iterationCount: number;
  readonly evaluationCount: number;
}
export interface AngularSeparationResult {
  readonly jd: JulianDate | null;
  readonly separationRad: number;
  readonly separationRateRadPerDay: number;
  readonly bodyAId: number;
  readonly bodyBId: number;
  readonly iterationCount: number;
  readonly evaluationCount: number;
}
export interface BodyStarAngularSeparationResult {
  readonly jd: JulianDate | null;
  readonly separationRad: number;
  readonly separationRateRadPerDay: number;
  readonly bodyId: number;
  readonly iterationCount: number;
  readonly evaluationCount: number;
}
export interface VisibilityEventResult {
  readonly altitudeState: number;
  readonly crossingDirection: number;
  readonly julianDateUt1: JulianDate | null;
  readonly residualRad: number;
  readonly minResidualRad: number;
  readonly maxResidualRad: number;
  readonly minResidualJulianDateUt1: JulianDate | null;
  readonly maxResidualJulianDateUt1: JulianDate | null;
  readonly sampleCount: number;
  readonly refineCount: number;
}
export interface SolarRiseSetFastResult {
  readonly altitudeState: number;
  readonly riseJulianDateTt: JulianDate | null;
  readonly setJulianDateTt: JulianDate | null;
  readonly sampleCount: number;
  readonly refineCount: number;
}
export interface SolarTransitFastResult {
  readonly transitJulianDateTt: JulianDate | null;
  readonly altitudeRad: number;
  readonly azimuthRad: number;
  readonly sampleCount: number;
  readonly refineCount: number;
}
export interface GreatestElongationResult {
  readonly julianDateUt1: JulianDate | null;
  readonly elongationRad: number;
  readonly relativeLongitudeRad: number;
  readonly kind: number;
  readonly bodyId: number;
  readonly iterationCount: number;
  readonly evaluationCount: number;
  readonly phenomena: BodyPhenomena;
}
export interface SolarTransitResult {
  readonly bodyId: number;
  readonly kind: number;
  readonly greatestJulianDateUt1: JulianDate | null;
  readonly minimumSeparationRad: number;
  readonly sunRadiusRad: number;
  readonly bodyRadiusRad: number;
  readonly t1JulianDateUt1: JulianDate | null;
  readonly t2JulianDateUt1: JulianDate | null;
  readonly t3JulianDateUt1: JulianDate | null;
  readonly t4JulianDateUt1: JulianDate | null;
  readonly iterationCount: number;
  readonly evaluationCount: number;
}
export interface LocalSolarTransitResult {
  readonly global: SolarTransitResult;
  readonly topocentric: SolarTransitResult;
  readonly visibilityFlags: number;
  readonly contactSunAltitudeDeg: readonly number[];
  readonly contactSunAzimuthDeg: readonly number[];
  readonly sunriseJulianDateUt1: JulianDate | null;
  readonly sunsetJulianDateUt1: JulianDate | null;
}
export interface HeliacalVisibilityConditions {
  readonly extinctionMagPerAirmass: number;
  readonly skyBrightnessNanolambert: number;
  readonly nightSkyBrightnessNanolambert: number;
}
export interface HeliacalVisibilityResult {
  readonly visible: number;
  readonly modelId: number;
  readonly extinctionModelId: number;
  readonly twilightModelId: number;
  readonly moonlightModelId: number;
  readonly visualThresholdModelId: number;
  readonly targetMagnitude: number;
  readonly limitingMagnitude: number;
  readonly targetAltitudeRad: number;
  readonly targetAzimuthRad: number;
  readonly sunAltitudeRad: number;
  readonly sunAzimuthRad: number;
  readonly targetSunSeparationRad: number;
  readonly airmass: number;
  readonly extinctionMagPerAirmass: number;
  readonly extinctionMag: number;
  readonly skyBrightnessNanolambert: number;
  readonly moonlightBrightnessNanolambert: number;
  readonly thresholdIlluminanceFootcandles: number;
  readonly targetIlluminanceFootcandles: number;
  readonly visibilityMarginMagnitude: number;
  readonly requiredSunAltitudeRad: number;
  readonly solarDepressionMarginRad: number;
}
export interface HeliacalVisibilitySearchResult {
  readonly eventKind: number;
  readonly julianDateUt1: JulianDate | null;
  readonly windowStartJulianDateUt1: JulianDate | null;
  readonly windowEndJulianDateUt1: JulianDate | null;
  readonly scannedDayCount: number;
  readonly sampledWindowCount: number;
  readonly visibilityEvaluationCount: number;
  readonly visibility: HeliacalVisibilityResult;
}
export interface LunarOccultationPhenomena {
  readonly angularDistanceRad: number;
  readonly diameterRatio: number;
  readonly magnitude: number;
  readonly obscuration: number;
  readonly occultedFraction: number;
}
export interface LunarOccultationResult {
  readonly kind: number;
  readonly typeFlags: number;
  readonly julianDateUt1: JulianDate | null;
  readonly beginJulianDateUt1: JulianDate | null;
  readonly endJulianDateUt1: JulianDate | null;
  readonly firstContactJulianDateUt1: JulianDate | null;
  readonly secondContactJulianDateUt1: JulianDate | null;
  readonly thirdContactJulianDateUt1: JulianDate | null;
  readonly fourthContactJulianDateUt1: JulianDate | null;
  readonly separationRad: number;
  readonly moonRadiusRad: number;
  readonly targetRadiusRad: number;
  readonly marginRad: number;
  readonly phenomena: LunarOccultationPhenomena;
  readonly candidateJulianDateUt1: JulianDate | null;
  readonly nextSearchJulianDateUt1: JulianDate | null;
  readonly candidateCount: number;
  readonly iterationCount: number;
  readonly evaluationCount: number;
}
export interface LunarOccultationVisibilitySample {
  readonly valid: number;
  readonly julianDateUt1: JulianDate | null;
  readonly moonAltitudeRad: number;
  readonly moonAzimuthRad: number;
  readonly targetAltitudeRad: number;
  readonly targetAzimuthRad: number;
  readonly sunAltitudeRad: number;
  readonly sunAzimuthRad: number;
  readonly visibilityFlags: number;
}
export interface LunarOccultationVisibilityInterval {
  readonly valid: number;
  readonly beginJulianDateUt1: JulianDate | null;
  readonly endJulianDateUt1: JulianDate | null;
}
export interface LunarOccultationLocalVisibility {
  readonly firstContact: LunarOccultationVisibilitySample;
  readonly secondContact: LunarOccultationVisibilitySample;
  readonly maximum: LunarOccultationVisibilitySample;
  readonly thirdContact: LunarOccultationVisibilitySample;
  readonly fourthContact: LunarOccultationVisibilitySample;
  readonly targetRiseJulianDateUt1: JulianDate | null;
  readonly targetSetJulianDateUt1: JulianDate | null;
  readonly visibleBeginJulianDateUt1: JulianDate | null;
  readonly visibleEndJulianDateUt1: JulianDate | null;
  readonly darkVisibleBeginJulianDateUt1: JulianDate | null;
  readonly darkVisibleEndJulianDateUt1: JulianDate | null;
  readonly visibleIntervalCount: number;
  readonly visibleIntervals: readonly LunarOccultationVisibilityInterval[];
  readonly darkVisibleIntervalCount: number;
  readonly darkVisibleIntervals: readonly LunarOccultationVisibilityInterval[];
  readonly visibilityFlags: number;
}
export interface LunarOccultationPathPoint {
  readonly valid: number;
  readonly julianDateUt1: JulianDate | null;
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly heightM: number;
}
export interface LunarOccultationWhereResult {
  readonly centerLineHitsEarth: number;
  readonly typeFlags: number;
  readonly julianDateUt1: JulianDate | null;
  readonly centerLineBeginJulianDateUt1: JulianDate | null;
  readonly centerLineEndJulianDateUt1: JulianDate | null;
  readonly centerLinePathCount: number;
  readonly centerLinePath: readonly LunarOccultationPathPoint[];
  readonly centerLineMinLongitudeDeg: number;
  readonly centerLineMaxLongitudeDeg: number;
  readonly centerLineMinLatitudeDeg: number;
  readonly centerLineMaxLatitudeDeg: number;
  readonly centerLinePathDistanceKm: number;
  readonly outerLimitPathCount: number;
  readonly outerNorthPath: readonly LunarOccultationPathPoint[];
  readonly outerSouthPath: readonly LunarOccultationPathPoint[];
  readonly outerLimitMeanWidthKm: number;
  readonly outerLimitMaxWidthKm: number;
  readonly visibleRegionPolygonCount: number;
  readonly visibleRegionPolygon: readonly LunarOccultationPathPoint[];
  readonly visibleRegionMinLongitudeDeg: number;
  readonly visibleRegionMaxLongitudeDeg: number;
  readonly visibleRegionMinLatitudeDeg: number;
  readonly visibleRegionMaxLatitudeDeg: number;
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly heightM: number;
  readonly separationRad: number;
  readonly moonRadiusRad: number;
  readonly targetRadiusRad: number;
  readonly marginRad: number;
  readonly phenomena: LunarOccultationPhenomena;
  readonly localSample: LunarOccultationVisibilitySample;
  readonly visibilityFlags: number;
}
export interface SiderealPosition {
  readonly coordinateFrameId: number;
  readonly tropicalLongitudeRad: number;
  readonly siderealLongitudeRad: number;
  readonly latitudeRad: number;
  readonly distanceAu: number;
  readonly tropicalLongitudeRateRadPerDay: number;
  readonly siderealLongitudeRateRadPerDay: number;
}
export interface SiderealCoordinates {
  readonly coordinateFrameId: number;
  readonly positionFlags: number;
  readonly values: readonly number[];
}
export interface HouseResult {
  readonly requestedSystemId: number;
  readonly resolvedSystemId: number;
  readonly flags: number;
  readonly armcRad: number;
  readonly ascendantRad: number;
  readonly midheavenRad: number;
  readonly vertexRad: number;
  readonly eastPointRad: number;
  readonly armcRateRadPerDay: number;
  readonly ascendantRateRadPerDay: number;
  readonly midheavenRateRadPerDay: number;
  readonly vertexRateRadPerDay: number;
  readonly eastPointRateRadPerDay: number;
  readonly cuspLongitudeRad: readonly number[];
  readonly cuspLongitudeRateRadPerDay: readonly number[];
}
export interface LunarNodePosition {
  readonly referenceFrameId: number;
  readonly longitudeRad: number;
  readonly longitudeRateRadPerDay: number;
}
export interface LunarApsisPosition {
  readonly referenceFrameId: number;
  readonly definition: number;
  readonly longitudeRad: number;
  readonly latitudeRad: number;
  readonly longitudeRateRadPerDay: number;
  readonly latitudeRateRadPerDay: number;
  readonly distanceAu: number;
  readonly distanceRateAuPerDay: number;
  readonly extrapolated: number;
}
export interface HousePositionResult {
  readonly houseNumber: number;
  readonly fraction: number;
  readonly continuousHousePosition: number;
}
export interface Atmosphere {
  readonly pressureMbar: number;
  readonly temperatureCelsius: number;
  readonly relativeHumidityPercent: number;
  readonly wavelengthMicrometer: number;
}
export interface ObserverLocation {
  readonly longitudeDeg: number;
  readonly latitudeDeg: number;
  readonly heightM: number;
}
export interface ApparentDeflector {
  readonly bodyId: number;
  readonly schwarzschildRadiusAu: number;
  readonly limit: number;
}
export const astronomySchemas = {
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
  taiyin_ephemeris_diagnostic: [
    {
      key: "status",
      type: "taiyin_status",
      shape: [],
    },
    {
      key: "targetId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "centerId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "frame",
      type: "int32_t",
      shape: [],
    },
    {
      key: "julianDateTdb",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "candidateCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "attemptedMethodId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "nearestCoverageStart",
      type: "double",
      shape: [],
    },
    {
      key: "nearestCoverageEnd",
      type: "double",
      shape: [],
    },
    {
      key: "componentTargetId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "componentCenterId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "componentMethodId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "timeScaleRoute",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "timeScaleFallbackReason",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "timeScaleFlags",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "taiMinusUtcSeconds",
      type: "double",
      shape: [],
    },
    {
      key: "dut1Seconds",
      type: "double",
      shape: [],
    },
    {
      key: "deltaTSeconds",
      type: "double",
      shape: [],
    },
  ],
  taiyin_vector3: [
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
      key: "z",
      type: "double",
      shape: [],
    },
  ],
  taiyin_cartesian_state: [
    {
      key: "positionAu",
      type: "taiyin_vector3",
      shape: [],
    },
    {
      key: "velocityAuPerDay",
      type: "taiyin_vector3",
      shape: [],
    },
    {
      key: "accelerationAuPerDay2",
      type: "taiyin_vector3",
      shape: [],
    },
  ],
  taiyin_apparent_position: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "bodyMaskBit",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "status",
      type: "taiyin_status",
      shape: [],
    },
    {
      key: "diagnostic",
      type: "taiyin_ephemeris_diagnostic",
      shape: [],
    },
    {
      key: "geometricState",
      type: "taiyin_cartesian_state",
      shape: [],
    },
    {
      key: "apparentState",
      type: "taiyin_cartesian_state",
      shape: [],
    },
    {
      key: "longitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "lightTimeDays",
      type: "double",
      shape: [],
    },
    {
      key: "cacheHit",
      type: "taiyin_bool",
      shape: [],
    },
  ],
  taiyin_horizontal_coordinates: [
    {
      key: "azimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "altitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
  ],
  taiyin_horizontal_rates: [
    {
      key: "azimuthRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "altitudeRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "distanceRateAuPerDay",
      type: "double",
      shape: [],
    },
  ],
  taiyin_observed_position: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "status",
      type: "taiyin_status",
      shape: [],
    },
    {
      key: "diagnostic",
      type: "taiyin_ephemeris_diagnostic",
      shape: [],
    },
    {
      key: "apparent",
      type: "taiyin_apparent_position",
      shape: [],
    },
    {
      key: "horizontal",
      type: "taiyin_horizontal_coordinates",
      shape: [],
    },
    {
      key: "horizontalRates",
      type: "taiyin_horizontal_rates",
      shape: [],
    },
    {
      key: "refractedHorizontal",
      type: "taiyin_horizontal_coordinates",
      shape: [],
    },
    {
      key: "refractedHorizontalRates",
      type: "taiyin_horizontal_rates",
      shape: [],
    },
  ],
  taiyin_runtime_registered_data_source: [
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "format",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "flags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "itemCount",
      type: "uint64_t",
      shape: [],
    },
    {
      key: "jdStart",
      type: "double",
      shape: [],
    },
    {
      key: "jdEnd",
      type: "double",
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
  taiyin_body_phenomena: [
    {
      key: "phaseAngleRad",
      type: "double",
      shape: [],
    },
    {
      key: "illuminatedFraction",
      type: "double",
      shape: [],
    },
    {
      key: "solarElongationRad",
      type: "double",
      shape: [],
    },
    {
      key: "apparentDiameterRad",
      type: "double",
      shape: [],
    },
    {
      key: "apparentMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "horizontalParallaxRad",
      type: "double",
      shape: [],
    },
  ],
  taiyin_body_osculating_orbit: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "centerId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "referenceFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "gravitationalParameterAu3PerDay2",
      type: "double",
      shape: [],
    },
    {
      key: "semiMajorAxisAu",
      type: "double",
      shape: [],
    },
    {
      key: "eccentricity",
      type: "double",
      shape: [],
    },
    {
      key: "inclinationRad",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeOfAscendingNodeRad",
      type: "double",
      shape: [],
    },
    {
      key: "argumentOfPeriapsisRad",
      type: "double",
      shape: [],
    },
    {
      key: "trueAnomalyRad",
      type: "double",
      shape: [],
    },
    {
      key: "meanAnomalyRad",
      type: "double",
      shape: [],
    },
    {
      key: "periapsisDistanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "apoapsisDistanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "osculatingPeriodDays",
      type: "double",
      shape: [],
    },
    {
      key: "currentDistanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "radialVelocityAuPerDay",
      type: "double",
      shape: [],
    },
  ],
  taiyin_body_orbit_reference_point: [
    {
      key: "positionAu",
      type: "taiyin_vector3",
      shape: [],
    },
    {
      key: "longitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
  ],
  taiyin_body_orbit_reference_points: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "centerId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "referenceFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "modelId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "ascendingNode",
      type: "taiyin_body_orbit_reference_point",
      shape: [],
    },
    {
      key: "descendingNode",
      type: "taiyin_body_orbit_reference_point",
      shape: [],
    },
    {
      key: "periapsis",
      type: "taiyin_body_orbit_reference_point",
      shape: [],
    },
    {
      key: "apoapsis",
      type: "taiyin_body_orbit_reference_point",
      shape: [],
    },
    {
      key: "secondFocus",
      type: "taiyin_body_orbit_reference_point",
      shape: [],
    },
  ],
  taiyin_body_apsis_search_result: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "centerId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "kind",
      type: "int32_t",
      shape: [],
    },
    {
      key: "jd",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "radialVelocityAuPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_body_node_search_result: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "centerId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "referenceFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "kind",
      type: "int32_t",
      shape: [],
    },
    {
      key: "jd",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "referencePlaneAngleRad",
      type: "double",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_angular_separation_result: [
    {
      key: "jd",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "separationRad",
      type: "double",
      shape: [],
    },
    {
      key: "separationRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "bodyAId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "bodyBId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_body_star_angular_separation_result: [
    {
      key: "jd",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "separationRad",
      type: "double",
      shape: [],
    },
    {
      key: "separationRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_visibility_event_result: [
    {
      key: "altitudeState",
      type: "int32_t",
      shape: [],
    },
    {
      key: "crossingDirection",
      type: "int32_t",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "residualRad",
      type: "double",
      shape: [],
    },
    {
      key: "minResidualRad",
      type: "double",
      shape: [],
    },
    {
      key: "maxResidualRad",
      type: "double",
      shape: [],
    },
    {
      key: "minResidualJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "maxResidualJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "sampleCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "refineCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_solar_rise_set_fast_result: [
    {
      key: "altitudeState",
      type: "int32_t",
      shape: [],
    },
    {
      key: "riseJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "setJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "sampleCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "refineCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_solar_transit_fast_result: [
    {
      key: "transitJulianDateTt",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "altitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "azimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "sampleCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "refineCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_greatest_elongation_result: [
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "elongationRad",
      type: "double",
      shape: [],
    },
    {
      key: "relativeLongitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "phenomena",
      type: "taiyin_body_phenomena",
      shape: [],
    },
  ],
  taiyin_solar_transit_result: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "kind",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "greatestJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "minimumSeparationRad",
      type: "double",
      shape: [],
    },
    {
      key: "sunRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "bodyRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "t1JulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "t2JulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "t3JulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "t4JulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_local_solar_transit_result: [
    {
      key: "global",
      type: "taiyin_solar_transit_result",
      shape: [],
    },
    {
      key: "topocentric",
      type: "taiyin_solar_transit_result",
      shape: [],
    },
    {
      key: "visibilityFlags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "contactSunAltitudeDeg",
      type: "double",
      shape: [5],
    },
    {
      key: "contactSunAzimuthDeg",
      type: "double",
      shape: [5],
    },
    {
      key: "sunriseJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "sunsetJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
  ],
  taiyin_heliacal_visibility_conditions: [
    {
      key: "extinctionMagPerAirmass",
      type: "double",
      shape: [],
    },
    {
      key: "skyBrightnessNanolambert",
      type: "double",
      shape: [],
    },
    {
      key: "nightSkyBrightnessNanolambert",
      type: "double",
      shape: [],
    },
  ],
  taiyin_heliacal_visibility_result: [
    {
      key: "visible",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "modelId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "extinctionModelId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "twilightModelId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "moonlightModelId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "visualThresholdModelId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "targetMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "limitingMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "targetAltitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "targetAzimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "targetSunSeparationRad",
      type: "double",
      shape: [],
    },
    {
      key: "airmass",
      type: "double",
      shape: [],
    },
    {
      key: "extinctionMagPerAirmass",
      type: "double",
      shape: [],
    },
    {
      key: "extinctionMag",
      type: "double",
      shape: [],
    },
    {
      key: "skyBrightnessNanolambert",
      type: "double",
      shape: [],
    },
    {
      key: "moonlightBrightnessNanolambert",
      type: "double",
      shape: [],
    },
    {
      key: "thresholdIlluminanceFootcandles",
      type: "double",
      shape: [],
    },
    {
      key: "targetIlluminanceFootcandles",
      type: "double",
      shape: [],
    },
    {
      key: "visibilityMarginMagnitude",
      type: "double",
      shape: [],
    },
    {
      key: "requiredSunAltitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "solarDepressionMarginRad",
      type: "double",
      shape: [],
    },
  ],
  taiyin_heliacal_visibility_search_result: [
    {
      key: "eventKind",
      type: "int32_t",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "windowStartJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "windowEndJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "scannedDayCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "sampledWindowCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "visibilityEvaluationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "visibility",
      type: "taiyin_heliacal_visibility_result",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_phenomena: [
    {
      key: "angularDistanceRad",
      type: "double",
      shape: [],
    },
    {
      key: "diameterRatio",
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
      key: "occultedFraction",
      type: "double",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_result: [
    {
      key: "kind",
      type: "int32_t",
      shape: [],
    },
    {
      key: "typeFlags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "beginJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "endJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "firstContactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "secondContactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "thirdContactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "fourthContactJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "separationRad",
      type: "double",
      shape: [],
    },
    {
      key: "moonRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "targetRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "marginRad",
      type: "double",
      shape: [],
    },
    {
      key: "phenomena",
      type: "taiyin_lunar_occultation_phenomena",
      shape: [],
    },
    {
      key: "candidateJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "nextSearchJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "candidateCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "iterationCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "evaluationCount",
      type: "int32_t",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_visibility_sample: [
    {
      key: "valid",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "moonAltitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "moonAzimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "targetAltitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "targetAzimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "sunAltitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "sunAzimuthRad",
      type: "double",
      shape: [],
    },
    {
      key: "visibilityFlags",
      type: "uint32_t",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_visibility_interval: [
    {
      key: "valid",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "beginJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "endJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_local_visibility: [
    {
      key: "firstContact",
      type: "taiyin_lunar_occultation_visibility_sample",
      shape: [],
    },
    {
      key: "secondContact",
      type: "taiyin_lunar_occultation_visibility_sample",
      shape: [],
    },
    {
      key: "maximum",
      type: "taiyin_lunar_occultation_visibility_sample",
      shape: [],
    },
    {
      key: "thirdContact",
      type: "taiyin_lunar_occultation_visibility_sample",
      shape: [],
    },
    {
      key: "fourthContact",
      type: "taiyin_lunar_occultation_visibility_sample",
      shape: [],
    },
    {
      key: "targetRiseJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "targetSetJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "visibleBeginJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "visibleEndJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "darkVisibleBeginJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "darkVisibleEndJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "visibleIntervalCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "visibleIntervals",
      type: "taiyin_lunar_occultation_visibility_interval",
      shape: [8],
    },
    {
      key: "darkVisibleIntervalCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "darkVisibleIntervals",
      type: "taiyin_lunar_occultation_visibility_interval",
      shape: [8],
    },
    {
      key: "visibilityFlags",
      type: "uint32_t",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_path_point: [
    {
      key: "valid",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "longitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "heightM",
      type: "double",
      shape: [],
    },
  ],
  taiyin_lunar_occultation_where_result: [
    {
      key: "centerLineHitsEarth",
      type: "uint8_t",
      shape: [],
    },
    {
      key: "typeFlags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "julianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "centerLineBeginJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "centerLineEndJulianDateUt1",
      type: "taiyin_split_julian_date",
      shape: [],
    },
    {
      key: "centerLinePathCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "centerLinePath",
      type: "taiyin_lunar_occultation_path_point",
      shape: [16],
    },
    {
      key: "centerLineMinLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "centerLineMaxLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "centerLineMinLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "centerLineMaxLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "centerLinePathDistanceKm",
      type: "double",
      shape: [],
    },
    {
      key: "outerLimitPathCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "outerNorthPath",
      type: "taiyin_lunar_occultation_path_point",
      shape: [16],
    },
    {
      key: "outerSouthPath",
      type: "taiyin_lunar_occultation_path_point",
      shape: [16],
    },
    {
      key: "outerLimitMeanWidthKm",
      type: "double",
      shape: [],
    },
    {
      key: "outerLimitMaxWidthKm",
      type: "double",
      shape: [],
    },
    {
      key: "visibleRegionPolygonCount",
      type: "int32_t",
      shape: [],
    },
    {
      key: "visibleRegionPolygon",
      type: "taiyin_lunar_occultation_path_point",
      shape: [32],
    },
    {
      key: "visibleRegionMinLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "visibleRegionMaxLongitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "visibleRegionMinLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "visibleRegionMaxLatitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "heightM",
      type: "double",
      shape: [],
    },
    {
      key: "separationRad",
      type: "double",
      shape: [],
    },
    {
      key: "moonRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "targetRadiusRad",
      type: "double",
      shape: [],
    },
    {
      key: "marginRad",
      type: "double",
      shape: [],
    },
    {
      key: "phenomena",
      type: "taiyin_lunar_occultation_phenomena",
      shape: [],
    },
    {
      key: "localSample",
      type: "taiyin_lunar_occultation_visibility_sample",
      shape: [],
    },
    {
      key: "visibilityFlags",
      type: "uint32_t",
      shape: [],
    },
  ],
  taiyin_sidereal_position: [
    {
      key: "coordinateFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "tropicalLongitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "siderealLongitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "tropicalLongitudeRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "siderealLongitudeRateRadPerDay",
      type: "double",
      shape: [],
    },
  ],
  taiyin_sidereal_coordinates: [
    {
      key: "coordinateFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "positionFlags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "values",
      type: "double",
      shape: [6],
    },
  ],
  taiyin_house_result: [
    {
      key: "requestedSystemId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "resolvedSystemId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "flags",
      type: "uint32_t",
      shape: [],
    },
    {
      key: "armcRad",
      type: "double",
      shape: [],
    },
    {
      key: "ascendantRad",
      type: "double",
      shape: [],
    },
    {
      key: "midheavenRad",
      type: "double",
      shape: [],
    },
    {
      key: "vertexRad",
      type: "double",
      shape: [],
    },
    {
      key: "eastPointRad",
      type: "double",
      shape: [],
    },
    {
      key: "armcRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "ascendantRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "midheavenRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "vertexRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "eastPointRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "cuspLongitudeRad",
      type: "double",
      shape: [12],
    },
    {
      key: "cuspLongitudeRateRadPerDay",
      type: "double",
      shape: [12],
    },
  ],
  taiyin_lunar_node_position: [
    {
      key: "referenceFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "longitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeRateRadPerDay",
      type: "double",
      shape: [],
    },
  ],
  taiyin_lunar_apsis_position: [
    {
      key: "referenceFrameId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "definition",
      type: "int32_t",
      shape: [],
    },
    {
      key: "longitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeRad",
      type: "double",
      shape: [],
    },
    {
      key: "longitudeRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeRateRadPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "distanceAu",
      type: "double",
      shape: [],
    },
    {
      key: "distanceRateAuPerDay",
      type: "double",
      shape: [],
    },
    {
      key: "extrapolated",
      type: "uint8_t",
      shape: [],
    },
  ],
  taiyin_house_position_result: [
    {
      key: "houseNumber",
      type: "int32_t",
      shape: [],
    },
    {
      key: "fraction",
      type: "double",
      shape: [],
    },
    {
      key: "continuousHousePosition",
      type: "double",
      shape: [],
    },
  ],
  taiyin_atmosphere: [
    {
      key: "pressureMbar",
      type: "double",
      shape: [],
    },
    {
      key: "temperatureCelsius",
      type: "double",
      shape: [],
    },
    {
      key: "relativeHumidityPercent",
      type: "double",
      shape: [],
    },
    {
      key: "wavelengthMicrometer",
      type: "double",
      shape: [],
    },
  ],
  taiyin_observer_location: [
    {
      key: "longitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "latitudeDeg",
      type: "double",
      shape: [],
    },
    {
      key: "heightM",
      type: "double",
      shape: [],
    },
  ],
  taiyin_apparent_deflector: [
    {
      key: "bodyId",
      type: "int32_t",
      shape: [],
    },
    {
      key: "schwarzschildRadiusAu",
      type: "double",
      shape: [],
    },
    {
      key: "limit",
      type: "double",
      shape: [],
    },
  ],
} as const;
