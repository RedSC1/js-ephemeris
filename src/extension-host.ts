/**
 * Shared bridge for official optional packages. Not a second runtime.
 * Applications normally import js-ephemeris, js-bazi, or js-ziwei instead.
 */
export {
  contextExtensionHost,
  runtimeExtensionHost,
} from "./internal/extension-access.js";
export type { ContextExtensionHost } from "./internal/extension-access.js";
export { withCalendar, retainCalendar } from "./internal/calendar-access.js";
export {
  decode,
  encode,
  encodeText,
  decodeText,
  width,
} from "./internal/records.js";
export type {
  ContextHost,
  RuntimeResourceHost,
  Wire,
} from "./internal/wasm.js";
export type * from "./internal/records.generated.js";
export * from "./date.js";
export * from "./calendar.js";
export * from "./models.js";
export * from "./errors.js";
export * from "./time.js";
export * from "./solar-time.js";
