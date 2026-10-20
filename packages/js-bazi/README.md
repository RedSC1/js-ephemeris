# js-bazi

Optional BaZi / Shen Sha extension for [js-ephemeris](https://github.com/RedSC1/js-ephemeris).
Requires the matching `js-ephemeris@1.1.0` peer package. Release preparation only: not published yet.

```sh
npm install js-ephemeris@1.1.0 js-bazi@1.1.0
```

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

Importing this package adds `ctx.bazi()` to the existing context.
Core alone does not expose this method. Each factory call creates a fresh calculator;
reuse it for multiple charts. A custom `chineseCalendar` must belong to the same context.
Closing the owning context/runtime closes its calculators and charts.

No separate Wasm or second runtime is bundled or initialized: both optional packages
share the core's Wasm. Worker applications should bundle their imports (for example
with Vite); browser import maps do not apply inside Workers.

Qi-Yun, Da-Yun, reverse lookup, relations and custom Shen Sha catalogs remain supported.
See the repository's [API guide](https://github.com/RedSC1/js-ephemeris/blob/main/docs/api.md).

MPL-2.0; third-party attribution is retained in the core and NOTICE.
