# js-bazi

[中文说明](README.zh-CN.md)

Optional BaZi / Shen Sha extension for [js-ephemeris](https://github.com/RedSC1/js-ephemeris).
Version **1.1.0** is available on npm and requires the matching
`js-ephemeris@1.1.0` peer package.

```sh
npm install js-ephemeris@1.1.0 js-bazi@1.1.0
```

For local archives, install both packages in one command, replacing the paths as needed:

```sh
npm install /path/to/js-ephemeris-1.1.0.tgz /path/to/js-bazi-1.1.0.tgz
```

## Quick start

```js
import { Ephemeris, AstroDateTime } from "js-ephemeris";
import { BaziGender } from "js-bazi";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const calculator = ctx.bazi();
console.log(
  calculator.calculateLocal(new AstroDateTime(2003, 3, 13, 14, 15), {
    gender: BaziGender.male,
  }).value,
);
eph.close();
```

## Contexts and ownership

Importing this package adds `ctx.bazi()` to the existing context.
Core alone does not expose this method. Each factory call creates a fresh calculator;
reuse it for multiple charts. A custom `chineseCalendar` must belong to the same context.
Closing the owning context/runtime closes its calculators and charts.

Type-only imports do not enable runtime methods. Use `import "js-bazi"` when no
runtime value is otherwise imported from this extension.

## Browser and Worker use

No separate Wasm or second runtime is bundled or initialized: both optional packages
share the core's Wasm. Worker applications should bundle their imports (for example
with Vite); browser import maps do not apply inside Workers.

Qi-Yun, Da-Yun, reverse lookup, relations and custom Shen Sha catalogs remain supported.
See the repository's [API guide](https://github.com/RedSC1/js-ephemeris/blob/main/docs/api.md).

## License

MPL-2.0; third-party attribution is retained in the core and [NOTICE](NOTICE).
See [CHANGELOG](CHANGELOG.md) for the 1.1.0 release notes.
