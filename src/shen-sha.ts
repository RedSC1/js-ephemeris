import { ClosedContextError } from "./errors.js";
import {
  integer,
  result,
  ResultFlags,
  text,
  type OperationResult,
} from "./models.js";
import { encode, encodeText, decodeText } from "./internal/records.js";
import type { RuntimeResourceHost, Wire } from "./internal/wasm.js";
import type { BaziChart } from "./internal/records.generated.js";
import type { BaziGender } from "./bazi.js";

export enum BaziShenShaTargetKind {
  year = 0,
  month = 1,
  day = 2,
  hour = 3,
  mingGong = 4,
  shenGong = 5,
  taiYuan = 6,
  taiXi = 7,
  daYun = 8,
  flowYear = 9,
  flowMonth = 10,
  flowDay = 11,
  flowHour = 12,
}
export interface BaziShenShaInput {
  readonly pillars: readonly number[];
  readonly target: number;
  readonly targetKind: number;
  readonly gender: BaziGender | null;
}
export interface BaziShenShaRule {
  readonly id: string;
  readonly name: string;
  readonly test: (input: BaziShenShaInput) => boolean;
}
export interface BaziShenShaModule {
  readonly label: string;
  readonly rules: readonly BaziShenShaRule[];
}
export interface BaziShenShaMatch {
  readonly id: string;
  readonly name: string;
  readonly builtinId: number | null;
}
interface RuleState {
  token: number;
  label: string;
  rule: BaziShenShaRule;
  refs: number;
  busy: boolean;
  hasError: boolean;
  error: unknown;
}
class Registry {
  next = 1;
  readonly rules = new Map<number, RuleState>();
  constructor(wire: Wire) {
    wire.module.taiyinBaziPredicate = (
      token: number,
      year: number,
      month: number,
      day: number,
      hour: number,
      target: number,
      kind: number,
      gender: number,
    ) => {
      const state = this.rules.get(token);
      if (!state) return -1;
      if (state.hasError) return -1;
      try {
        const answer: unknown = state.rule.test(
          Object.freeze({
            pillars: Object.freeze([year, month, day, hour]),
            target,
            targetKind: kind,
            gender: gender < 0 ? null : gender,
          }),
        );
        if (typeof answer !== "boolean") {
          if (answer instanceof Promise) void answer.catch(() => {});
          throw new TypeError(
            "Shen Sha predicates must synchronously return boolean",
          );
        }
        return answer ? 1 : 0;
      } catch (error) {
        state.hasError = true;
        state.error = error;
        return -1;
      }
    };
  }
  add(label: string, rule: BaziShenShaRule): RuleState {
    const state: RuleState = {
      token: integer(this.next++, 1, 2147483647, "callback token"),
      label,
      rule: Object.freeze({
        id: text(rule.id, "rule ID"),
        name: text(rule.name, "rule name"),
        test: rule.test,
      }),
      refs: 0,
      busy: false,
      hasError: false,
      error: undefined,
    };
    if (typeof rule.test !== "function")
      throw new TypeError("Rule predicate must be a function");
    this.rules.set(state.token, state);
    return state;
  }
  retain(states: readonly RuleState[]): void {
    for (const s of states) s.refs++;
  }
  release(states: readonly RuleState[]): void {
    for (const s of states) if (--s.refs === 0) this.rules.delete(s.token);
  }
}
const registries = new WeakMap<Wire, Registry>();
function registry(wire: Wire): Registry {
  let r = registries.get(wire);
  if (!r) {
    r = new Registry(wire);
    registries.set(wire, r);
  }
  return r;
}
function matches(values: readonly number[]): readonly BaziShenShaMatch[] {
  let at = 32;
  const result: BaziShenShaMatch[] = [];
  for (let i = 0; i < integer(values[2]!, 0, 1000000, "match count"); i++) {
    const builtin = values[at++]!;
    const id = decodeText(values, at);
    const name = decodeText(values, id.next);
    at = name.next;
    result.push(
      Object.freeze({
        id: id.value,
        name: name.value,
        builtinId: builtin < 0 ? null : builtin,
      }),
    );
  }
  return Object.freeze(result);
}
class ShenHandle {
  closed = false;
  busy = false;
  constructor(
    readonly host: RuntimeResourceHost,
    readonly handle: number,
    readonly isContext: boolean,
    readonly states: readonly RuleState[],
  ) {
    registry(host.wire).retain(states);
  }
  run<T>(fn: () => T): T {
    return this.host.run(() => {
      if (this.closed)
        throw new ClosedContextError("Shen Sha handle is closed");
      if (this.busy || this.states.some((s) => s.busy))
        throw new Error("Reentrant Shen Sha operation");
      return fn();
    });
  }
  call(op: number, input: number[]): number[] {
    return this.host.wire.checked(
      this.host.wire.structured(
        "_taiyin_web_bazi",
        [this.handle, 0, op],
        input,
      ),
    );
  }
  close(): void {
    if (this.closed) return;
    this.run(() => {
      this.call(this.isContext ? 28 : 27, []);
      this.closed = true;
      registry(this.host.wire).release(this.states);
    });
  }
}
export class BaziShenShaCatalog {
  /** @internal */
  constructor(private readonly access: ShenHandle) {
    access.host.own(this);
  }
  get isClosed(): boolean {
    return this.access.closed;
  }
  addModule(module: BaziShenShaModule): BaziShenShaCatalog {
    return this.access.run(() => {
      const label = text(module.label, "module label");
      integer(module.rules.length, 0, 1000000, "rule count");
      const r = registry(this.access.host.wire);
      const fresh: RuleState[] = [];
      try {
        const payload = [...encodeText(label), module.rules.length];
        for (const rule of module.rules) {
          const s = r.add(label, rule);
          fresh.push(s);
          payload.push(
            ...encodeText(s.rule.id),
            ...encodeText(s.rule.name),
            s.token,
          );
        }
        const v = this.access.call(23, payload);
        return new BaziShenShaCatalog(
          new ShenHandle(this.access.host, v[32]!, false, [
            ...this.access.states,
            ...fresh,
          ]),
        );
      } finally {
        for (const s of fresh) if (s.refs === 0) r.rules.delete(s.token);
      }
    });
  }
  removeModule(label: string): BaziShenShaCatalog {
    return this.access.run(() => {
      const v = this.access.call(24, encodeText(label));
      return new BaziShenShaCatalog(
        new ShenHandle(
          this.access.host,
          v[32]!,
          false,
          this.access.states.filter((s) => s.label !== label),
        ),
      );
    });
  }
  createContext({
    disabledIds = [],
  }: { disabledIds?: readonly string[] } = {}): BaziShenShaContext {
    return this.access.run(() => {
      integer(disabledIds.length, 0, 1000000, "disabled ID count");
      const input = [disabledIds.length];
      for (const id of disabledIds) input.push(...encodeText(id));
      const v = this.access.call(25, input);
      return new BaziShenShaContext(
        new ShenHandle(this.access.host, v[32]!, true, this.access.states),
      );
    });
  }
  close(): void {
    this.access.close();
    this.access.host.forget(this);
  }
}
export class BaziShenShaContext {
  /** @internal */
  constructor(private readonly access: ShenHandle) {
    access.host.own(this);
  }
  get isClosed(): boolean {
    return this.access.closed;
  }
  evaluate(
    chart: BaziChart,
    target: number,
    {
      targetKind = 0,
      gender = -1,
    }: { targetKind?: number; gender?: BaziGender | -1 } = {},
  ): OperationResult<readonly BaziShenShaMatch[]> {
    return this.access.run(() => {
      const payload = [
        ...encode("taiyin_bazi_chart", chart),
        integer(target, 0, 255, "target Ganzhi"),
        integer(targetKind, 0, 2147483647, "target kind"),
        integer(gender, -1, 1, "gender"),
      ];
      this.access.busy = true;
      for (const s of this.access.states) {
        s.busy = true;
        s.hasError = false;
        s.error = undefined;
      }
      try {
        const reply = this.access.host.wire.structured(
          "_taiyin_web_bazi",
          [this.access.handle, 0, 26],
          payload,
        );
        for (const s of this.access.states) if (s.hasError) throw s.error;
        const v = this.access.host.wire.checked(reply);
        return result(matches(v), new ResultFlags(v[0]!));
      } finally {
        for (const s of this.access.states) {
          s.busy = false;
          s.hasError = false;
          s.error = undefined;
        }
        this.access.busy = false;
      }
    });
  }
  close(): void {
    this.access.close();
    this.access.host.forget(this);
  }
}
/** @internal */
export function createShenShaCatalog(
  host: RuntimeResourceHost,
): BaziShenShaCatalog {
  return host.run(() => {
    registry(host.wire);
    const v = host.wire.checked(
      host.wire.structured("_taiyin_web_bazi", [0, 0, 22], []),
    );
    return new BaziShenShaCatalog(new ShenHandle(host, v[32]!, false, []));
  });
}
