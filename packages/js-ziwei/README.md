# js-ziwei

Optional Ziwei Dou Shu extension for [js-ephemeris](https://github.com/RedSC1/js-ephemeris).
Requires the matching `js-ephemeris@1.1.0` peer package. Release preparation only: not published yet.

```sh
npm install js-ephemeris@1.1.0 js-ziwei@1.1.0
```

```js
import { Ephemeris, AstroDateTime } from "js-ephemeris";
import { ZiweiGender } from "js-ziwei";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const calculator = ctx.ziwei();
console.log(
  calculator.createChartLocal(new AstroDateTime(2003, 3, 13, 14, 15), {
    gender: ZiweiGender.male,
  }).value,
);
eph.close();
```

Importing this package adds `ctx.ziwei()` to the existing context.
Core alone does not expose this method. Each factory call creates a fresh calculator;
reuse it for multiple charts. A custom `chineseCalendar` must belong to the same context.
Closing the owning context/runtime closes its calculators and charts.

No separate Wasm or second runtime is bundled or initialized: both optional packages
share the core's Wasm. Worker applications should bundle their imports (for example
with Vite); browser import maps do not apply inside Workers.

Default rule tables are embedded in the shared core Wasm. Custom TOML/JSON catalogs remain supported.
See the repository's [API guide](https://github.com/RedSC1/js-ephemeris/blob/main/docs/api.md).

MPL-2.0; third-party attribution is retained in the core and NOTICE.
