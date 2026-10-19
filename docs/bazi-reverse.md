# BaZi reverse lookup / 八字反查

Development API; not published. All searches run the C++ implementation.

```ts
const ctx = eph.createContext();
const bazi = ctx.bazi();
const birth = bazi.calculateLocal(new AstroDateTime(2003, 3, 13, 14, 15), {
  gender: BaziGender.male,
});
const start = ctx.time.julianDay(new AstroDateTime(2003, 1, 1), "UT1").value;
const end = ctx.time.julianDay(new AstroDateTime(2004, 1, 1), "UT1").value;
const matches = bazi.reverseLookupAtUt1(birth.value.pillars, start, end);
for (const interval of matches.value) {
  console.log(interval.startJdUt1, interval.endJdUt1);
  console.log(interval.startVirtualTime, interval.endVirtualTime);
}
```

Imports: `AstroDateTime`, `BaziGender`, `BaziClockMode` from the package.
Pass `{ratHourMode, clock: {mode: BaziClockMode.apparentSolar,
longitudeRadians}}` to choose a rat-hour school and a solar chart clock.
Use the same clock/rat options that produced the requested pillars.

All four pillars are required. Results are maximal half-open `[start,end)`
intervals clipped to the search bounds; adjacent intervals with identical
pillars are merged. No matches returns an empty array. Fatal native errors
throw, and successful execution flags are in `matches.flags`.

Bounds and result coordinates are **UT1**. FixedOffset adds the calendar's
configured offset to UT1, not UTC; this differs from `calculateLocal`'s civil
UTC input by DUT1. If you have UTC, convert explicitly with
`ctx.time.utcToUt1`, preserving its flags and EOP/estimate policy. The API
does not silently estimate missing EOP data. Solar clocks use the real solar
time solver; no constant equation-of-time shift is assumed. The calendar's
lunar-month day-boundary mode is independent of the chart clock.

中文：输出的是四柱匹配的时间区间，不是某个“精确出生时间”。三种早晚子规则
与正排一致；节界仍采用真实物理时刻（历史模式采用引擎的历史归日规则），
日、时柱按所选虚拟排盘时钟判断。真太阳时在每个边界重新反解，不用固定均时差。
固定偏移以 UT1 为基准，不是 UTC/夏令时转换；UTC 用户先显式转换。

This uses Taiyin C++ `v1.1.0`; the JS binding itself is not yet published.
`npm run test:bazi-reverse` runs the real Wasm regression suite;
the same scenario is also included in the browser example.
