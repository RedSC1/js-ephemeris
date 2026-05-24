/**
 * js-ephemeris public API
 */
export { Ephemeris } from './engine.js';
export { SkyObserver } from './observer.js';
export type { ObservationOptions, ObservationResult, ObservationVelocityResult } from './observer.js';
export * from './stars/fixed-star.js';
export type { PositionResolver, ResolverResult } from './manifest/types.js';
export type { BodyTag, Vec3, StateVec } from './types.js';
export { catmullRom, lerp } from './math/interpolation.js';
export type { FrameTransformContext, Matrix3x3, NutationAngles } from './coordinates/index.js';
export {
  convertFrame,
  eclipticJ2000ToEquatorialJ2000,
  equatorialJ2000ToEclipticJ2000,
  frameBiasMatrix,
  identityMatrix,
  matMul,
  matrixFromIcrfToFrame,
  mulMatVec,
  nutationMatrix,
  projectIcrfToFrame,
  rectToSpherical,
  rotX,
  rotY,
  rotZ,
  sphericalToRect,
  transposeMatrix,
  wrapAngleRad,
} from './coordinates/index.js';
export { applyAberration } from './corrections/aberration.js';
export { applyLightTime, LIGHT_TIME_DAYS_PER_AU } from './corrections/light-time.js';
