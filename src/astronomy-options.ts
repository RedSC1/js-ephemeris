// Native IDs/options. Angles in the corresponding transport records are radians.
export enum VisibilityEventKind {
  rise = 1,
  set = 2,
  upperTransit = 3,
  lowerTransit = 4,
}
export enum VisibilityLimb {
  upper = 1,
  center = 2,
  lower = 3,
}
export enum TwilightKind {
  civil = 1,
  nautical = 2,
  astronomical = 3,
}
export enum VisibilityAltitudeState {
  notFound = 0,
  crosses = 1,
  alwaysAbove = 2,
  alwaysBelow = 3,
  tangent = 4,
}
export const VisibilityOption = Object.freeze({
  refraction: 1n,
  fixedDiscSize: 2n,
  noRefraction: 4n,
  strictMeteorology: 1n << 32n,
});
export const EventOption = Object.freeze({
  reverse: 1n << 32n,
  refraction: 1n << 33n,
  noRefraction: 1n << 34n,
});
export const OrbitalOption = Object.freeze({ reverse: 1n << 32n });
export enum ApsisKind {
  pericenter = 0,
  apocenter = 1,
}
export enum NodeKind {
  ascending = 0,
  descending = 1,
}
export enum HouseSystem {
  wholeSign = 0,
  equal = 1,
  porphyry = 2,
  placidus = 3,
  koch = 4,
  regiomontanus = 5,
  campanus = 6,
  alcabitius = 7,
  polichPage = 8,
  morinus = 9,
}
export enum Ayanamsha {
  faganBradley = 0,
  lahiri = 1,
  raman = 3,
  krishnamurti = 5,
  galacticCenter0Sagittarius = 17,
  trueChitra = 27,
}
export const SiderealOption = Object.freeze({
  referenceEcliptic: 1n << 32n,
  referenceInvariablePlane: 1n << 33n,
  referenceJ2000: 1n << 34n,
  referenceEpochUt1: 1n << 35n,
  rawReferenceOffset: 1n << 36n,
  useReferencePrecession: 1n << 37n,
});
export const HeliacalOption = Object.freeze({
  includeMoonlight: 1n << 32n,
  strictMeteorology: 1n << 33n,
});
export enum HeliacalEventKind {
  morningFirst = 1,
  morningLast = 2,
  eveningFirst = 3,
  eveningLast = 4,
}
export const OccultationOption = Object.freeze({
  backward: 1n << 32n,
  oneCandidate: 1n << 33n,
  refraction: 1n << 34n,
  filterPartial: 1n << 40n,
  filterTotal: 1n << 41n,
  filterGrazing: 1n << 42n,
  filterCentral: 1n << 43n,
  filterNoncentral: 1n << 44n,
  lunarLimbCorrection: 1n << 45n,
});
