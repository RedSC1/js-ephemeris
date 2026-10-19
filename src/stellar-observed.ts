import {
  JulianDate,
  dateValues,
  jdValues,
  sameScale,
  type TtJulianDate,
  type TdbJulianDate,
  type Ut1JulianDate,
  type AstroDateTime,
} from "./date.js";
import {
  Position,
  positionMask,
  integer,
  finite,
  result,
  ResultFlags,
  type OperationResult,
  type PositionFlags,
} from "./models.js";
import {
  decode,
  width,
  encodeText,
  uint64,
  combinePositionFlags,
} from "./internal/records.js";
import { diagnostic, type ContextHost } from "./internal/wasm.js";
import type { ObservedPosition } from "./internal/astronomy-records.generated.js";
import { assertAstronomyProtocol } from "./internal/astronomy-transport.js";
export interface ObservedOptions {
  positionFlags?: PositionFlags;
  options?: bigint | number;
  flags?: bigint | number;
}
export const ObservedOption = Object.freeze({
  horizontal: 1n << 32n,
  refraction: 1n << 33n,
  strictMeteorology: 1n << 34n,
});
class VariableAstronomy {
  constructor(readonly host: ContextHost) {}
  calculate<T>(
    op: number,
    input: number[],
    count: number,
    flags: number,
  ): OperationResult<readonly T[]> {
    return this.host.run(() => {
      assertAstronomyProtocol(this.host.wire);
      if (!count) return result(Object.freeze([]));
      const reply = this.host.wire.structured(
        "_taiyin_web_astronomy_extra",
        [this.host.handle, op],
        input,
      );
      const ds =
        reply.values.length >= 32 + 32 * count
          ? Array.from({ length: count }, (_, i) =>
              diagnostic(reply.values, 32 + i * 32),
            )
          : [];
      this.host.record(reply.values);
      const v = this.host.wire.checked(reply, 0, ds);
      if (v[2] !== count) throw Error("Unexpected astronomy batch count");
      const start = 32 + count * 32;
      const w = op === 0 ? 6 : width("taiyin_observed_position");
      if (start + count * w !== v.length)
        throw Error("Truncated astronomy batch");
      const data = Object.freeze(
        Array.from({ length: count }, (_, i) =>
          op === 0
            ? new Position(v.slice(start + i * w, start + (i + 1) * w), flags)
            : decode<ObservedPosition>(
                "taiyin_observed_position",
                v,
                start + i * w,
                undefined,
                "UT1",
              ),
        ),
      );
      return result(data as readonly T[], new ResultFlags(v[0]!));
    });
  }
}
/** Stellar astrometry/observed positions use the existing Earth-only native API. */
export class StarsApi {
  private readonly transport: VariableAstronomy;
  constructor(host: ContextHost) {
    this.transport = new VariableAstronomy(host);
  }
  private positions(
    keys: readonly string[],
    jd: JulianDate,
    mode: number,
    options: { flags?: PositionFlags },
    tt?: TtJulianDate,
    dt?: number,
  ): OperationResult<readonly Position[]> {
    integer(keys.length, 0, 10000, "star count");
    const encoded = keys.flatMap((key) => encodeText(key));
    const mask = positionMask(options.flags);
    return this.transport.calculate(
      0,
      [
        mode,
        ...jdValues(jd),
        ...(tt ? jdValues(tt) : []),
        ...(dt === undefined ? [] : [finite(dt, "Delta-T")]),
        ...uint64(mask),
        keys.length,
        ...encoded,
      ],
      keys.length,
      mask,
    );
  }
  atTt(
    key: string,
    jd: TtJulianDate,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<Position> {
    const r = this.batchAtTt([key], jd, options);
    return result(r.value[0]!, r.flags);
  }
  atUt1(
    key: string,
    jd: Ut1JulianDate,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<Position> {
    const r = this.batchAtUt1([key], jd, options);
    return result(r.value[0]!, r.flags);
  }
  atTdb(
    key: string,
    jd: TdbJulianDate,
    tt: TtJulianDate,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<Position> {
    const r = this.batchAtTdb([key], jd, tt, options);
    return result(r.value[0]!, r.flags);
  }
  atUt1WithDeltaT(
    key: string,
    jd: Ut1JulianDate,
    dt: number,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<Position> {
    const r = this.batchAtUt1WithDeltaT([key], jd, dt, options);
    return result(r.value[0]!, r.flags);
  }
  batchAtTt(
    keys: readonly string[],
    jd: TtJulianDate,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "TT");
    return this.positions(keys, jd, 1, options);
  }
  batchAtUt1(
    keys: readonly string[],
    jd: Ut1JulianDate,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "UT1");
    return this.positions(keys, jd, 2, options);
  }
  batchAtTdb(
    keys: readonly string[],
    jd: TdbJulianDate,
    tt: TtJulianDate,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "TDB");
    sameScale(tt, "TT");
    return this.positions(keys, jd, 0, options, tt);
  }
  batchAtUt1WithDeltaT(
    keys: readonly string[],
    jd: Ut1JulianDate,
    dt: number,
    options: { flags?: PositionFlags } = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "UT1");
    return this.positions(keys, jd, 3, options, undefined, dt);
  }
  observedAtUt1(
    key: string,
    jd: Ut1JulianDate,
    options: ObservedOptions = {},
  ): OperationResult<ObservedPosition> {
    const r = this.observedBatchAtUt1([key], jd, options);
    return result(r.value[0]!, r.flags);
  }
  observedBatchAtUt1(
    keys: readonly string[],
    jd: Ut1JulianDate,
    options: ObservedOptions = {},
  ): OperationResult<readonly ObservedPosition[]> {
    sameScale(jd, "UT1");
    integer(keys.length, 0, 10000, "star count");
    return this.transport.calculate(
      3,
      [
        ...jdValues(jd),
        ...uint64(combinePositionFlags(options)),
        keys.length,
        ...keys.flatMap((key) => encodeText(key)),
      ],
      keys.length,
      0,
    );
  }
}
/** Horizontal/refraction flags are independent of position representation flags. */
export class ObservedApi {
  private readonly transport: VariableAstronomy;
  constructor(host: ContextHost) {
    this.transport = new VariableAstronomy(host);
  }
  atUt1(
    body: number,
    jd: Ut1JulianDate,
    options: ObservedOptions = {},
  ): OperationResult<ObservedPosition> {
    const r = this.batchAtUt1([body], jd, options);
    return result(r.value[0]!, r.flags);
  }
  atUtc(
    body: number,
    utc: AstroDateTime | Date,
    options: ObservedOptions = {},
  ): OperationResult<ObservedPosition> {
    const r = this.batchAtUtc([body], utc, options);
    return result(r.value[0]!, r.flags);
  }
  private bodies(
    bodies: readonly number[],
    time: number[],
    op: number,
    options: ObservedOptions,
  ): OperationResult<readonly ObservedPosition[]> {
    integer(bodies.length, 0, 10, "body count");
    return this.transport.calculate(
      op,
      [
        ...time,
        ...uint64(combinePositionFlags(options)),
        bodies.length,
        ...bodies.map((id) => integer(id, -2147483648, 2147483647, "body ID")),
      ],
      bodies.length,
      0,
    );
  }
  batchAtUt1(
    bodies: readonly number[],
    jd: Ut1JulianDate,
    options: ObservedOptions = {},
  ): OperationResult<readonly ObservedPosition[]> {
    sameScale(jd, "UT1");
    return this.bodies(bodies, jdValues(jd), 1, options);
  }
  batchAtUtc(
    bodies: readonly number[],
    utc: AstroDateTime | Date,
    options: ObservedOptions = {},
  ): OperationResult<readonly ObservedPosition[]> {
    return this.bodies(bodies, dateValues(utc), 2, options);
  }
}
