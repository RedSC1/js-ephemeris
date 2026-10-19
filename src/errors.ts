import type { EphemerisDiagnostic } from "./models.js";
import { ResultFlags } from "./models.js";
export class EphemerisError extends Error {
  constructor(
    readonly status: number,
    readonly statusName: string,
    message: string,
    readonly resultFlags = ResultFlags.none,
    readonly diagnostic?: EphemerisDiagnostic,
    readonly diagnostics: readonly EphemerisDiagnostic[] = [],
  ) {
    super(message);
    this.name = new.target.name;
    this.diagnostics = Object.freeze([...diagnostics]);
  }
}
export class InvalidArgumentError extends EphemerisError {}
export class EphemerisOutOfMemoryError extends EphemerisError {}
export class InternalCalculationError extends EphemerisError {}
export class UnsupportedOperationError extends EphemerisError {}
export class EphemerisRouteError extends EphemerisError {}
export class DataFileError extends EphemerisError {}
export class TimeScaleError extends EphemerisError {}
export class EarthOrientationDataError extends TimeScaleError {}
export class LeapSecondDataError extends TimeScaleError {}
export class ObserverError extends EphemerisError {}
export class EventSearchError extends EphemerisError {}
export class RuntimeServiceError extends EphemerisError {}
export class UnknownNativeError extends EphemerisError {}
export class ClosedContextError extends Error {
  constructor(message = "This context has been closed") {
    super(message);
    this.name = "ClosedContextError";
  }
}
export class UtcLeapSecondRepresentationError extends Error {
  constructor() {
    super(
      "A uniform UTC Julian date cannot represent the inserted leap second; use calendar UTC fields.",
    );
    this.name = "UtcLeapSecondRepresentationError";
  }
}
export class TimeScaleConvergenceError extends Error {
  constructor() {
    super("Time-scale inverse failed to converge");
    this.name = "TimeScaleConvergenceError";
  }
}
