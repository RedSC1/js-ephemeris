import type { ContextHost, RuntimeResourceHost } from "./wasm.js";
import type { Time } from "../time.js";
import type { ChineseCalendar } from "../calendar.js";

/** Shared lifecycle capabilities for official, separately installed extensions. */
export interface ContextExtensionHost {
  readonly host: ContextHost;
  readonly time: Time;
  calendar(): ChineseCalendar;
  createChild<T extends { close(): void }>(
    factory: (onClose: () => void) => T,
  ): T;
}
const contexts = new WeakMap<object, ContextExtensionHost>();
const runtimes = new WeakMap<object, RuntimeResourceHost>();
export function registerContextExtensionHost(
  owner: object,
  host: ContextExtensionHost,
): void {
  contexts.set(owner, host);
}
export function registerRuntimeExtensionHost(
  owner: object,
  host: RuntimeResourceHost,
): void {
  runtimes.set(owner, host);
}
export function contextExtensionHost(owner: object): ContextExtensionHost {
  const host = contexts.get(owner);
  if (!host)
    throw new TypeError(
      "Expected an EphemerisContext from the same js-ephemeris installation",
    );
  return host;
}
export function runtimeExtensionHost(owner: object): RuntimeResourceHost {
  const host = runtimes.get(owner);
  if (!host)
    throw new TypeError(
      "Expected an Ephemeris runtime from the same js-ephemeris installation",
    );
  return host;
}
