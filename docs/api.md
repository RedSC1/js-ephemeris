# API guide and implementation coverage

This is the initial binding, not a promise of full Python/Dart parity. The generated `.d.ts` files provide concrete signatures; this page explains ownership and supported paths.

## Runtime and contexts

```js
const eph = await Ephemeris.initialize({ loadBuiltinEop: true });
const ctx = eph.createContext();
const other = ctx.clone();
ctx.configuration.setRouteRule(RouteRule.semiAnalytic);
```

Each `initialize()` instantiates its own Wasm module and independent C++ runtime. `createContext()` provides independent configuration/caches inside that runtime. A clone copies the core configuration; changing a clone does not change its source. Calculations remain synchronous.

`ctx.chineseCalendar` is cached. `ctx.createChineseCalendar(config)` creates another calendar bound to the same astronomy context. `ctx.bazi({ chineseCalendar })` and `ctx.ziwei({ chineseCalendar })` borrow a chosen calendar; omitting it uses the cached default. Cross-context calendars are rejected. Close BaZi/Ziwei before manually closing their borrowed calendar, or simply close the owning `ctx`.

## Position and time

`ctx.position` includes single position/state and batch positions at TT, UT1, UTC, and TDB (with a corresponding TT), including explicit-Delta-T UT1 modes. Default position output follows the core's apparent geocentric longitude/latitude/distance convention; pass `PositionFlag` values explicitly when requesting Cartesian, equatorial, speed, or geometric output. `ctx.configuration.reset()` restores the native context defaults, including strict UTC handling and the fast-periodic TDB model.

```js
const p = ctx.position.atUt1(Body.jupiterBarycenter, ut1, {
  flags: [PositionFlag.speed, PositionFlag.equatorial],
});
const scales = ctx.time.scalesFromUtc(new Date("2024-04-08T18:00:00Z"));
const tt = scales.value.value.tt;
const tdb = ctx.time.ttToTdb(tt).value;
const utc = ctx.time.tdbToUtc(tdb).value;
console.log(ctx.time.reverseJulianDay(utc).value);
```

Factories such as `TtJulianDate.fromDouble()` **label** a coordinate. They do not convert UTC into TT. `ctx.time.julianDay(civilFields, 'TT')` likewise interprets those fields as TT. Actual conversions are named methods on `ctx.time`. UTC inverses preserve strict EOP/leap-second errors and explicit-estimation flags. Uniform UTC JD cannot represent the inserted second `23:59:60`; atomic-to-UTC inversion throws `UtcLeapSecondRepresentationError` for that interval, while calendar UTC inputs can represent it.

`ctx.time.utcToUt1(utc)` uses EOP or the explicitly enabled estimate policy; `utcToUt1(utc, { dut1Seconds })` instead uses the supplied offset. BaZi solar clocks and Qi-Yun use this same physical-time policy, not a silent UTC-as-UT1 approximation.

`ctx.solarTime` exposes equation of time at TT/UT1 and mean/apparent local-solar conversions. These call C++; no approximate trigonometric equation-of-time shortcut is used. Solar-time longitude is east-positive **radians**; observer-location configuration uses **degrees**.

## Chinese calendar

The default is `chinaStandardHistorical`, fixed clock offset 480 minutes. Other structure modes are `chinaStandardAstronomical` and `localAstronomical`. For local astronomical assignment:

```js
const clockCalendar = ctx.createChineseCalendar(
  ChineseCalendarConfig.localAstronomicalUtcOffset(420),
);
const meridianCalendar = ctx.createChineseCalendar(
  ChineseCalendarConfig.localAstronomicalMeridian(105.8, {
    utcOffsetMinutes: 420,
  }),
);
```

The second example assigns qi/shuo dates using the specified **mean-solar meridian**, while civil birth times still use UTC+7. It does not select apparent solar time. China-standard modes retain the core's reference-date semantics; calendar mode does not redefine the chart clock.

Supported: `fromSolar`, `fromLunar`, `fromInstantUt1`, `getMonthDays`, `calcYear`, `getSpecificJieQi`, previous/next jie/qi searches, four pillars and `fourPillarsLocal`. Historical month-name metadata and month-building branches are retained. Four-pillar fields are currently packed numeric Ganzhi values; use `ganzhi(pillars.day)` for `{ stem, branch }`.

## Eclipses

All **39** current Wasm eclipse operations are wrapped with Dart-aligned method names: global/local lunar and solar solves/searches, ranges, local circumstances/visibility, Besselian elements/polynomials, route rows, lightweight `where`, curves, products, maps and local boundaries. Methods explicitly distinguish TT and UT1.

```js
const eclipse = ctx.eclipses.nextSolarAtUt1(ut1, {
  options: EclipseOption.includeContacts,
});
console.log(eclipse.value.maximumJulianDateUt1);
console.log(eclipse.value.contactJulianDateUt1); // absent contacts are null
```

`positionFlags` accepts a numeric low-bit mask or iterable of `PositionFlag`. `options` accepts `bigint` (recommended for high-bit options) or a safe integer. `kinds` is the numeric `EclipseKind` mask. A local calculation uses `ctx.configuration.setObserverLocation(...)`. Returned records are immutable snapshots; no struct packing or Wasm offsets are public.

## BaZi

```js
const bazi = ctx.bazi();
const { value } = bazi.calculateLocal(new AstroDateTime(2003, 3, 13, 14, 15), {
  gender: BaziGender.male,
});
const dayun = bazi.fillDayun(
  new AstroDateTime(2003, 3, 13, 14, 15),
  value.chart,
  value.qiyun,
  10,
);
```

`calculateLocal`, `calculateInstant` (`Date` or UTC JD), `calculateSolarDay`, and `calculateLunarDay` derive the other clock representation internally. `calculateUtc` is an alias for `calculateInstant`. Use `BaziGender` rather than a guessed numeric ID: BaZi female is `0`, male is `1`; Ziwei has its own, different enum. `RatHourMode` matches core/Dart `noSplit`, `todayGan`, `tomorrowGan`.

```js
const solarBirth = bazi.calculateLocal(local, {
  gender: BaziGender.male,
  clock: {
    mode: BaziClockMode.apparentSolar,
    longitudeRadians: (118.582 * Math.PI) / 180,
  },
});
const relations = bazi.collectChartRelations(solarBirth.value.chart);
const xiaoyun = bazi.fillXiaoyun(solarBirth.value.chart, {
  direction: solarBirth.value.qiyun.direction,
  requestedCount: 10,
});
```

Fixed-offset clocks are the default. Solar clocks change `chartTime`, not `instantUtc`; the bound calendar still defines the input/output civil offset. Mean/apparent conversion uses the existing C++ solar-time methods. High-level calculation needs UTC→UT1 for Qi-Yun even in fixed-clock mode. Missing EOP throws unless the caller explicitly allows estimates, whose flags propagate to the returned result. Low-level `calcQiyun` and `calcRenyuanSiling` require **UT1**, not UTC.

Also exposed: `calcChart`, `calcQiyun`, `fillDayun`, `kongWang`, `tenGod`, `hiddenStems`, `lifeStage`, `liunian/liuyue/liuri/liushi`, `calcStemRelation`, `calcBranchRelation`, `calcBranchTripleRelation`, `calcXiaoyun/fillXiaoyun`, `getRenyuanSilingSegments`, `calcRenyuanSiling`, `collectChartRelations`, `collectTargetShenSha` (built-in numeric IDs), and `collectShenSha` (named matches). The relation object's own `flags` describe the relation; the outer result's `flags` describe execution. Non-applicable native element IDs can be `255`.

### Custom Shen Sha

```js
const base = eph.createBaziShenShaCatalog();
const added = base.addModule({
  label: "my-school",
  rules: [
    {
      id: "example",
      name: "Example",
      test: (input) => (input.target & 15) === 0,
    },
  ],
});
const shen = added.createContext();
const matches = shen.evaluate(value.chart, value.chart.dayPillar, {
  targetKind: BaziShenShaTargetKind.day,
  gender: BaziGender.male,
});
```

Catalogs are immutable: `addModule` / `removeModule` return new catalogs. `createContext({ disabledIds: ["my-school:example"] })` disables selected qualified IDs. Built-ins are retained; duplicate module/ID errors come from the core. Source catalogs may close before derived catalogs/contexts: callback references remain alive until the last dependent snapshot closes. Custom matches have `builtinId: null`.

Predicates must return a synchronous boolean. Async predicates are rejected, original JS exceptions are rethrown, and recursive evaluation/closure through a shared callback snapshot is rejected. The runtime cannot close inside a running callback. Closing `eph` closes its registered Shen Sha handles. These callbacks are local to a Wasm instance, not transferable Worker functions.

## Ziwei

```js
const ziwei = ctx.ziwei({ selection: { longevity: "option2" } });
const birth = ziwei.createChartLocal(local, { gender: ZiweiGender.male }).value;
const star = ziwei.findStar("ziwei");
console.log(birth.star(star.id));

birth.setFlowAtUt1(ut1, {
  clock: {
    mode: ZiweiClockMode.apparentSolar,
    longitudeRadians: (118.582 * Math.PI) / 180,
  },
  level: ZiweiFlowLevel.hour,
});
birth.truncateFlow(ZiweiFlowLevel.month); // remove month/day/hour; retain decade/year
```

Default options match Dart: split leap month after the fifteenth, Tian-Pan, lunar Wu-Hu-Dun/Sihua/body-master boundaries, lunar flow boundary and physical month-sequence palace placement. Unspecified table options use `option1`.

Each `ctx.ziwei()` creates an independent C++ compiled rule snapshot, not one per chart. Reuse it for many charts. Placement, brightness, Sihua, masters and longevity selections are independent. `ZiweiRuleset` contains immutable C++-validated JSON option additions; built-in option names cannot be overwritten.

Supported: `calculateLocal/Instant/SolarDay/LunarDay`, natal charts from explicit UTC/UT1, `starPosition/starPalace/brightness/transformMask/hasTransform`, palace views, five flow levels and truncation, edits/reset, fixed/mean/apparent solar clocks, clock-aware day/hour navigation, Tier-1 reverse lookup at UTC and UT1, manual/index/number/random casting, casting edits and omitted-placement metadata. Chart edits return new owned handles.

`chart.setFlowInstant(utcOrDate)` / `setFlowLocal(local)` derive the other clock representation; a solar `clock` preserves physical time for solar-term boundaries. Explicit UT1 clock methods (`setFlowAtUt1`, `stepFlowHourAtUt1`, `stepFlowDayAtUt1`, `reverseLookupTier1AtUt1`) remain available. Low-level UTC navigation `next/previousFlowHourTarget` and `next/previousFlowDayTarget` takes **both** an `instantUtc` and virtual chart time so existing clocks can be advanced consistently; do not silently substitute one for the other. UT1 reverse candidates expose `instantUt1`; UTC reverse candidates expose `instantUtc`.

### Reusable TOML catalogs and JSON options

```js
const catalog = eph.createZiweiDataCatalog();
const ruleset = new ZiweiRuleset().addModule({
  label: "my-school",
  starsJson: '[{"key":"ziwei","rule":{"type":"constant","value":5}}]',
});
const ziwei = ctx.ziwei({
  catalog,
  ruleset,
  selection: { placement: { ziwei: "my-school" } },
});
catalog.reload();
const updated = ctx.ziwei({ catalog }); // new generation
```

A shared catalog avoids reparsing TOML for each context. `catalog.generation` and `ziwei.generation` are `bigint`. Reload publishes a new native snapshot; existing contexts/charts do not change. A catalog can close before those snapshots. Sharing is allowed between astronomy contexts in the **same** runtime, not across independent `Ephemeris` instances.

Use `createZiweiDataCatalog({files: {"default.toml": profileBytes, "stars.toml": starBytes, ...}})` for a complete custom TOML bundle, optionally with `profileFilename`. Keys are relative `.toml` paths and values are copied `Uint8Array`s. `reload({files: updates})` updates that bundle; parsing failure preserves the old compiled snapshot and restores its files. The embedded default files cannot be overwritten through this API.

`ruleset.removeModule("my-school")` returns a new ruleset removing **every dimension** bearing that custom module label: placement, brightness, Sihua, flow and masters. It cannot remove built-ins; an unknown custom label is an error. Existing contexts remain unchanged; create another context using the new ruleset. `ruleModules` is still accepted for direct snapshot construction, but cannot be passed together with `ruleset`.

## Not yet wrapped

Observed positions, stars, visibility, general events, phenomena, orbital elements, heliacal visibility, occultations, house/sidereal/lunar-point extensions, source management and custom C ABI models are now exposed. See the [astronomy guide](astronomy.md) ([中文](astronomy.zh-CN.md)) and [interface inventory](api-inventory.md).

BaZi reverse-birth search and arbitrary C++-only plug-ins still need deliberate core API work. Browser asset caching/Worker orchestration are not astronomy algorithms and are left to the application. No native pointer-based maintainer API is silently presented as a browser file API.

## 本轮约定

接口以 Dart 的 camelCase 和 `{ value, flags }` 为主，概念与 Python 对齐，不为了拼写一致再造 snake_case 别名。默认值必须与内核/现有绑定核对，而不是根据名字猜测。未覆盖功能列在上面，不用空方法或伪结果补齐 API。
