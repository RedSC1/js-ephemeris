import {
  type AstroDateTime,
  type JulianDate,
  type TtJulianDate,
  type TdbJulianDate,
  type Ut1JulianDate,
  dateValues,
  jdValues,
  sameScale,
} from "./date.js";
import {
  Position,
  ResultFlags,
  result,
  integer,
  finite,
  positionMask,
  vector,
  type PositionFlags,
  type OperationResult,
  type CartesianState,
} from "./models.js";
import { diagnostic, type ContextHost } from "./internal/wasm.js";

export interface PositionOptions {
  flags?: PositionFlags;
}
export class PositionApi {
  constructor(private readonly host: ContextHost) {}
  private payload(
    kind: number,
    target: number,
    jd: JulianDate | undefined,
    flags: PositionFlags,
    tt?: TtJulianDate,
    deltaT = 0,
    utc?: AstroDateTime | Date,
  ): number[] {
    return [
      kind,
      integer(target, -2147483648, 2147483647, "target ID"),
      ...(jd ? jdValues(jd) : [0, 0]),
      ...(tt ? jdValues(tt) : [0, 0]),
      finite(deltaT, "Delta-T"),
      positionMask(flags),
      ...(utc ? dateValues(utc) : [0, 0, 0, 0, 0, 0]),
    ];
  }
  private call(
    input: number[],
    state: boolean,
  ): OperationResult<Position | CartesianState> {
    return this.host.run(() => {
      const reply = this.host.wire.fixed(
        "_taiyin_web_position",
        [this.host.handle, +state],
        input,
      );
      this.host.record(reply.values);
      const v = this.host.wire.checked(reply, 0);
      return result(
        state
          ? Object.freeze({
              positionAu: vector(v, 1),
              velocityAuPerDay: vector(v, 4),
              accelerationAuPerDay2: vector(v, 7),
            })
          : new Position(v.slice(1, 7), input[7]!),
        new ResultFlags(v[0]!),
      );
    });
  }
  atUt1(
    target: number,
    jd: Ut1JulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<Position> {
    sameScale(jd, "UT1");
    return this.call(
      this.payload(1, target, jd, flags),
      false,
    ) as OperationResult<Position>;
  }
  atTt(
    target: number,
    jd: TtJulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<Position> {
    sameScale(jd, "TT");
    return this.call(
      this.payload(0, target, jd, flags),
      false,
    ) as OperationResult<Position>;
  }
  atTdb(
    target: number,
    jd: TdbJulianDate,
    tt: TtJulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<Position> {
    sameScale(jd, "TDB");
    sameScale(tt, "TT");
    return this.call(
      this.payload(2, target, jd, flags, tt),
      false,
    ) as OperationResult<Position>;
  }
  atUt1WithDeltaT(
    target: number,
    jd: Ut1JulianDate,
    deltaTSeconds: number,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<Position> {
    sameScale(jd, "UT1");
    return this.call(
      this.payload(3, target, jd, flags, undefined, deltaTSeconds),
      false,
    ) as OperationResult<Position>;
  }
  atUtc(
    target: number,
    utc: AstroDateTime | Date,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<Position> {
    return this.call(
      this.payload(4, target, undefined, flags, undefined, 0, utc),
      false,
    ) as OperationResult<Position>;
  }
  stateAtUt1(
    target: number,
    jd: Ut1JulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<CartesianState> {
    sameScale(jd, "UT1");
    return this.call(
      this.payload(1, target, jd, flags),
      true,
    ) as OperationResult<CartesianState>;
  }
  stateAtTt(
    target: number,
    jd: TtJulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<CartesianState> {
    sameScale(jd, "TT");
    return this.call(
      this.payload(0, target, jd, flags),
      true,
    ) as OperationResult<CartesianState>;
  }
  stateAtTdb(
    target: number,
    jd: TdbJulianDate,
    tt: TtJulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<CartesianState> {
    sameScale(jd, "TDB");
    sameScale(tt, "TT");
    return this.call(
      this.payload(2, target, jd, flags, tt),
      true,
    ) as OperationResult<CartesianState>;
  }
  stateAtUtc(
    target: number,
    utc: AstroDateTime | Date,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<CartesianState> {
    return this.call(
      this.payload(4, target, undefined, flags, undefined, 0, utc),
      true,
    ) as OperationResult<CartesianState>;
  }
  stateAtUt1WithDeltaT(
    target: number,
    jd: Ut1JulianDate,
    deltaTSeconds: number,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<CartesianState> {
    sameScale(jd, "UT1");
    return this.call(
      this.payload(3, target, jd, flags, undefined, deltaTSeconds),
      true,
    ) as OperationResult<CartesianState>;
  }
  private batch(
    targets: readonly number[],
    input: number[],
  ): OperationResult<readonly Position[]> {
    return this.host.run(() => {
      integer(targets.length, 0, 100000, "batch size");
      if (!targets.length) return result(Object.freeze([]));
      const payload = new Array<number>(32).fill(0);
      payload.splice(0, input.length, ...input);
      payload.push(
        ...targets.map((t) => integer(t, -2147483648, 2147483647, "target ID")),
      );
      const reply = this.host.wire.fixed(
        "_taiyin_web_positions",
        [this.host.handle, targets.length],
        payload,
        32 * targets.length,
      );
      const ds = targets.map((_, i) => diagnostic(reply.values, i * 32));
      const failing = ds.findIndex((d) => d.status === reply.status);
      this.host.record(reply.values, Math.max(0, failing) * 32);
      this.host.wire.checked(reply, Math.max(0, failing) * 32, ds);
      return result(
        Object.freeze(
          targets.map(
            (_, i) =>
              new Position(
                reply.values.slice(i * 32 + 1, i * 32 + 7),
                input[7]!,
              ),
          ),
        ),
        targets.reduce(
          (flags, _, i) => flags.union(new ResultFlags(reply.values[i * 32]!)),
          ResultFlags.none,
        ),
      );
    });
  }
  batchAtUt1(
    targets: readonly number[],
    jd: Ut1JulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "UT1");
    return this.batch(targets, this.payload(1, 0, jd, flags));
  }
  batchAtTt(
    targets: readonly number[],
    jd: TtJulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "TT");
    return this.batch(targets, this.payload(0, 0, jd, flags));
  }
  batchAtUtc(
    targets: readonly number[],
    utc: AstroDateTime | Date,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<readonly Position[]> {
    return this.batch(
      targets,
      this.payload(4, 0, undefined, flags, undefined, 0, utc),
    );
  }
  batchAtTdb(
    targets: readonly number[],
    jd: TdbJulianDate,
    tt: TtJulianDate,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "TDB");
    sameScale(tt, "TT");
    return this.batch(targets, this.payload(2, 0, jd, flags, tt));
  }
  batchAtUt1WithDeltaT(
    targets: readonly number[],
    jd: Ut1JulianDate,
    deltaTSeconds: number,
    { flags = [] }: PositionOptions = {},
  ): OperationResult<readonly Position[]> {
    sameScale(jd, "UT1");
    return this.batch(
      targets,
      this.payload(3, 0, jd, flags, undefined, deltaTSeconds),
    );
  }
}
