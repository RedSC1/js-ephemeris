import { ClosedContextError } from "js-ephemeris/extension-host";
import { integer, text } from "js-ephemeris/extension-host";
import { encodeText } from "js-ephemeris/extension-host";
import type {
  RuntimeResourceHost,
  ContextHost,
  Wire,
} from "js-ephemeris/extension-host";
import type { ZiweiJsonRuleModule } from "./ziwei.js";

/** Immutable caller-defined option modules; built-in tables are never edited. */
export class ZiweiRuleset {
  readonly modules: readonly ZiweiJsonRuleModule[];
  constructor(modules: readonly ZiweiJsonRuleModule[] = []) {
    const labels = new Set<string>();
    this.modules = Object.freeze(
      modules.map((m) => {
        const label = text(m.label, "module label");
        if (labels.has(label))
          throw new Error(`Duplicate rule module: ${label}`);
        labels.add(label);
        const copy: ZiweiJsonRuleModule = { label };
        for (const key of [
          "starsJson",
          "brightnessJson",
          "sihuaJson",
          "flowJson",
          "mastersJson",
        ] as const)
          if (m[key] !== undefined) copy[key] = text(m[key], key, true);
        return Object.freeze(copy);
      }),
    );
    Object.freeze(this);
  }
  addModule(module: ZiweiJsonRuleModule): ZiweiRuleset {
    return new ZiweiRuleset([...this.modules, module]);
  }
  /** Removes every rule dimension in this custom module; built-ins are not in this set. */
  removeModule(label: string): ZiweiRuleset {
    text(label, "module label");
    if (!this.modules.some((m) => m.label === label))
      throw new Error(`No custom rule module: ${label}`);
    return new ZiweiRuleset(this.modules.filter((m) => m.label !== label));
  }
}
export interface ZiweiCatalogOptions {
  files?: Readonly<Record<string, Uint8Array>>;
  profileFilename?: string;
}
interface CatalogAccess {
  wire: Wire;
  use: <T>(fn: (handle: number) => T) => T;
}
const accesses = new WeakMap<ZiweiDataCatalog, CatalogAccess>();
const serials = new WeakMap<Wire, number>();
function relative(value: string): string {
  if (
    !/^[A-Za-z0-9_][A-Za-z0-9_.\/-]*\.toml$/.test(value) ||
    value.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new TypeError("Expected a relative .toml filename without traversal");
  return value;
}
function files(
  value: Readonly<Record<string, Uint8Array>>,
): Map<string, Uint8Array> {
  integer(Object.keys(value).length, 1, 1000, "TOML file count");
  const out = new Map<string, Uint8Array>();
  for (const [name, bytes] of Object.entries(value)) {
    relative(name);
    if (!(bytes instanceof Uint8Array) || bytes.length === 0)
      throw new TypeError("TOML files must be nonempty Uint8Array");
    out.set(name, bytes.slice());
  }
  return out;
}
function write(
  host: RuntimeResourceHost,
  directory: string,
  data: Map<string, Uint8Array>,
): void {
  for (const [name, bytes] of data) {
    const path = `${directory}/${name}`;
    host.wire.module.FS.mkdirTree(path.slice(0, path.lastIndexOf("/")));
    host.wire.module.FS.writeFile(path, bytes);
  }
}
/** C++ catalog reload publishes a new snapshot; existing Ziwei contexts keep the old one. */
export class ZiweiDataCatalog {
  #closed = false;
  #files: Map<string, Uint8Array>;
  /** @internal */
  constructor(
    private readonly host: RuntimeResourceHost,
    private readonly handle: number,
    readonly profilePath: string,
    private readonly directory: string | undefined,
    data: Map<string, Uint8Array>,
  ) {
    this.#files = data;
    accesses.set(this, {
      wire: host.wire,
      use: (fn) =>
        host.run(() => {
          if (this.#closed)
            throw new ClosedContextError("Ziwei data catalog is closed");
          return fn(this.handle);
        }),
    });
    host.own(this);
  }
  get isClosed(): boolean {
    return this.#closed;
  }
  private call(op: number): number[] {
    return accesses
      .get(this)!
      .use((h) =>
        this.host.wire.checked(
          this.host.wire.structured("_taiyin_web_ziwei", [h, 0, 0, op], []),
        ),
      );
  }
  get generation(): bigint {
    const v = this.call(3);
    return BigInt(v[32]!) | (BigInt(v[33]!) << 32n);
  }
  reload({
    files: updates,
  }: { files?: Readonly<Record<string, Uint8Array>> } = {}): void {
    accesses.get(this)!.use(() => {
      if (!updates) {
        this.call(2);
        return;
      }
      if (!this.directory)
        throw new Error(
          "The embedded default tables cannot be overwritten; create a catalog from TOML bytes",
        );
      const replacements = files(updates);
      const next = new Map(this.#files);
      for (const [name, data] of replacements) next.set(name, data);
      try {
        write(this.host, this.directory, replacements);
        this.call(2);
        this.#files = next;
      } catch (error) {
        write(this.host, this.directory, this.#files);
        for (const name of replacements.keys())
          if (!this.#files.has(name))
            if (
              this.host.wire.module.FS.analyzePath(`${this.directory}/${name}`)
                .exists
            )
              this.host.wire.module.FS.unlink(`${this.directory}/${name}`);
        throw error;
      }
    });
  }
  close(): void {
    if (this.#closed) return;
    this.call(1);
    this.#closed = true;
    this.host.forget(this);
    if (this.directory)
      for (const name of this.#files.keys())
        this.host.wire.module.FS.unlink(`${this.directory}/${name}`);
  }
}
/** @internal */
export function createZiweiDataCatalog(
  host: RuntimeResourceHost,
  options: ZiweiCatalogOptions = {},
): ZiweiDataCatalog {
  return host.run(() => {
    let directory: string | undefined;
    let data = new Map<string, Uint8Array>();
    const filename = relative(options.profileFilename ?? "default.toml");
    if (options.files) {
      data = files(options.files);
      if (!data.has(filename)) throw new Error(`Missing profile ${filename}`);
      const serial = (serials.get(host.wire) ?? 0) + 1;
      serials.set(host.wire, serial);
      directory = `/js-ziwei-catalogs/${serial}`;
    } else if (options.profileFilename !== undefined)
      throw new TypeError("A custom profileFilename requires TOML files");
    const path = directory
      ? `${directory}/${filename}`
      : "/taiyin/ziwei/rules/default.toml";
    try {
      if (directory) write(host, directory, data);
      const v = host.wire.checked(
        host.wire.structured(
          "_taiyin_web_ziwei",
          [0, 0, 0, 0],
          encodeText(path),
        ),
      );
      return new ZiweiDataCatalog(host, v[32]!, path, directory, data);
    } catch (error) {
      if (directory)
        for (const name of data.keys())
          if (host.wire.module.FS.analyzePath(`${directory}/${name}`).exists)
            host.wire.module.FS.unlink(`${directory}/${name}`);
      throw error;
    }
  });
}
/** @internal */
export function withZiweiCatalog<T>(
  catalog: ZiweiDataCatalog,
  host: ContextHost,
  fn: (handle: number) => T,
): T {
  const access = accesses.get(catalog);
  if (!access || access.wire !== host.wire)
    throw new TypeError(
      "Ziwei catalog must belong to the same Ephemeris runtime",
    );
  return access.use(fn);
}
