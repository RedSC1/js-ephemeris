/**
 * js-ephemeris public API
 */
export { Ephemeris } from './engine.js';
export * from './stars/fixed-star.js';
export type { PositionResolver, ResolverResult } from './manifest/types.js';
export type { BodyTag, Vec3, StateVec } from './types.js';
export { catmullRom, lerp } from './math/interpolation.js';
export { applyAberration } from './corrections/aberration.js';
export { applyLightTime, LIGHT_TIME_DAYS_PER_AU } from './corrections/light-time.js';
