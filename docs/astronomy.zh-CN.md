# 新增天文接口

[English / 完整方法说明](astronomy.md) · [覆盖清单](api-inventory.md)

这些接口调用现有 C++ 算法，只扩展可选的 Wasm 桥；没有重写天文算法，也没有改变原生 C ABI 11。方法名尽量沿用 Dart，计算结果继续返回 `{ value, flags }`。下面示例假设已经创建 `eph`、`ctx` 和明确标注尺度的 `ut1`。

## 观测位置、升落和恒星

```js
ctx.configuration.setObserverLocation({
  longitudeDegrees: 118.582,
  latitudeDegrees: 37.449,
  heightMeters: 80,
});
ctx.configuration.setStandardAtmosphere();

const sun = ctx.observed.atUt1(Body.sun, ut1, {
  positionFlags: [PositionFlag.topocentric],
  options: ObservedOption.horizontal,
});
const rise = ctx.visibility.solarRiseSetAtUt1(ut1, ut1.addDays(1), {
  eventKind: VisibilityEventKind.rise,
});
```

`observed` 有 UT1／UTC 的单体和批量入口；继承原生最多十个太阳系天体的限制。它返回高度角、方位角等观测结果，不接受 XYZ、赤道／弧度表示选择、NONUT；不支持的标志会明确报错。批量有一项失败就抛异常，同时保留各项诊断，不把半成品伪装成成功结果。

`visibility` 覆盖太阳、月球、行星、恒星的升落／中天，自定义地平高度、晨昏蒙影和 TT 快速太阳升落／中天。检查结果的 `altitudeState`，区分正常穿越、始终在上／下、相切和未找到。无适用时刻为 `null`。

加载 TSC1／TSF1 后，用 `ctx.stars.atUt1(key, ut1)` 算恒星位置；也有 TT、TDB、显式 ΔT、批量和 `observedAtUt1`。沿用原生 1.0 仅支持地球观测者的限制，不内置虚假的恒星位置。

`heliacal` 提供星体／恒星的偕日可见性及事件搜索。不同原生模型对湿度、能见度等要求不同；例如 `ctx.configuration.setMeteorologicalRangeKm({rangeKm:40})`。不能把标准气压／温度当作所有气象输入都齐全，也不会因缺数据自动换成近似 JS 算法。

## 事件、轨道、掩星与占星

```js
const moons = ctx.events.lunarPhaseCrossingsAtUt1(0, ut1, ut1.addDays(40), {
  maxStepDays: 1,
  maxResults: 8,
});
const orbit = ctx.orbits.osculatingAtUt1(Body.marsBarycenter, ut1);
const phase = ctx.phenomena.atUt1(Body.moon, ut1);
const houses = ctx.astrology.housesAtUt1(ut1, {
  houseSystemId: HouseSystem.placidus,
});
```

- `events`：太阳／月球黄经、黄经与相位交点、留、最小角距、大距、全球／地方行星凌日。
- `orbits`：瞬时轨道要素、轨道参考点、近远点／升降交点，支持 TT／UT1；默认平 J2000 黄道参考系。
- `phenomena`：相位角、照明比例、距角、视直径、星等和地平视差。
- `occultations`：全球／地方月掩星、月掩天体、可选半径、地方可见性和地理路径。后续计算要使用兼容的原生事件记录；短区间内没有事件会按原生约定报错，不制造假结果。
- `astrology`：分宫制、ARMC 起宫、落宫、ayanamsha、恒星黄道坐标、平／真交点和几种月球远地点。

名称带 `Rad` 的角度用弧度，带 `Deg` 的地点用度。高位选项使用导出的 `EventOption`、`OccultationOption` 等 bigint，不能写 `1 << 32`。`positionFlags` 是低位标志，`options` 是对应服务的高位选项；`flags` 则是另一种完整原生掩码写法，指定后优先于前两者。升落计算的低位标志属于 `VisibilityOption`，不能随意拿位置标志代替。

## 来源管理与自定义算法

```js
console.log(eph.registeredDataSources()); // itemCount 为 bigint
eph.setEphemerisSourcePriority("sun.opm2", -100);
eph.clearEphemerisSourcePriority("sun.opm2");

const registration = eph.registerCustomAyanamshaModel({
  modelId: 11000,
  evaluate: ({ tt, flags }) => 0.123,
});
registration.close();
```

优先级仍由 C++ 的 provider／模型路由处理，不会使 OPM2-only 跳去 SPK。`eph.sources` 还提供缓存清理和数量查询，`eph.capabilities` 返回 bigint 能力掩码。

自定义星体用 `registerCustomTarget`，自定义宫位用 `registerCustomHouseSystemModel`。宫位回调返回十二个宫头，或返回 `null` 请求指定的原生 fallback；星体回调必须按请求的坐标标志返回六个值，也可提供精确状态求值器。没有精确状态时，内核可能差分求导，并返回相应 flags。

回调必须同步执行，不接受 Promise；异常原样抛回。注册对象持有回调，注销成功才释放。仍被别的宫位制作为 fallback 的模型不能提前删；计算中不能注册／注销模型、改来源优先级或关闭 owner。每个 Wasm 实例独立注册，不跨 Worker 传活对象。

新增协议有签名校验，JS 与 Wasm 不配套会直接报错。仍保持异步初始化、同步计算；并行请使用独立 Worker。发布、浏览器矩阵和绝对天文精度验证仍是另外的工作。
