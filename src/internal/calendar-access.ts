import type { ContextHost } from "./wasm.js";
interface Access {
  host: ContextHost;
  run: <T>(fn: (handle: number) => T) => T;
  dependents: number;
}
const access = new WeakMap<object, Access>();
export function registerCalendar(
  value: object,
  host: ContextHost,
  run: Access["run"],
): void {
  access.set(value, { host, run, dependents: 0 });
}
export function withCalendar<T>(
  value: object,
  host: ContextHost,
  fn: (handle: number) => T,
): T {
  const entry = access.get(value);
  if (!entry || entry.host !== host)
    throw new TypeError("Calendar must belong to the same EphemerisContext");
  return entry.run(fn);
}
export function retainCalendar(value: object, host: ContextHost): () => void {
  withCalendar(value, host, () => undefined);
  const entry = access.get(value)!;
  entry.dependents++;
  let released = false;
  return () => {
    if (!released) {
      entry.dependents--;
      released = true;
    }
  };
}
export function ensureCalendarCanClose(value: object): void {
  if (access.get(value)?.dependents)
    throw new Error("Close BaZi/Ziwei contexts before their borrowed calendar");
}
