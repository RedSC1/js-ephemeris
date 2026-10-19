# Loading data / 数据加载

All loaders accept `Uint8Array` and are synchronous after initialization. They work identically in Node and a browser; Node's `Buffer` is also a `Uint8Array`.

```js
// Node
import { readFile } from "node:fs/promises";
eph.loadEphemerisBytes(await readFile("/data/sun.opm2"), {
  filename: "sun.opm2",
});

// Browser (check HTTP failures before passing bytes)
const response = await fetch("/data/moon.opm2");
if (!response.ok) throw new Error(`HTTP ${response.status}`);
eph.loadEphemerisBytes(new Uint8Array(await response.arrayBuffer()), {
  filename: "moon.opm2",
});
```

The filename is a basename, not an operating-system path. Its model name can matter to the core's source selection (e.g. `de442.bsp`). Do not rename model-bearing files arbitrarily. Duplicate ephemeris basenames are rejected case-insensitively; this initial facade has no source replacement/unload API. Keep related files' names distinct.

| API                                         | Input                            |
| ------------------------------------------- | -------------------------------- |
| `loadEphemerisBytes(bytes, { filename })`   | OPM2, BSP/SPK, TKC1, TKE1        |
| `loadEopBytes(bytes, { filename })`         | finals2000a-compatible EOP table |
| `loadLunarLimbBytes(bytes, { filename })`   | TLL1 lunar-limb model            |
| `loadStarCatalogBytes(bytes)`               | TSC1 star catalog                |
| `loadStarAliasesBytes(bytes, { filename })` | TSF1 aliases                     |

Resources are installed in the module's private Emscripten filesystem or copied by the core's catalog loader. There is no host-filesystem assumption in the public API. Keep the `Ephemeris` alive while its contexts are used. A failed replacement must not be treated as successful; loaders throw typed errors. No OPC index is required from the caller for byte-loaded files.

The default Wasm contains analytic fallback and default Ziwei tables, **not** a precise DE dataset or star catalog. A normal major-body OPM2 set includes Sun, Moon, EMB and planetary-system barycenters. Physical planet centers may additionally require satellite kernels, semi-analytic satellites or COB corrections. Loading one file cannot satisfy arbitrary target/center routes.

Browser storage/caching is application policy: fetch from your server, a file picker, Cache Storage or IndexedDB, then supply bytes. There is no automatic network download, cache persistence or bulk-URL loader in this first version. Large SPK files are accepted by format, but wasm32/browser memory limits still apply; OPM2 is usually a more practical browser asset.

星历格式沿用 C++，不做另一套编码。农历/八字/紫微共用同一运行时的数据资源。数据加载完成、上下文配置完成后再开始计算；不要把同一个运行时当成多个用户互相改配置的全局单例。
