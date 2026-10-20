# js-ephemeris — JavaScript / TypeScript

[English](README.md)

**js-ephemeris** 是面向 JavaScript 和 TypeScript 的天文历算库，通过 WebAssembly
在浏览器和 Node.js 中运行 [Taiyin C++ 内核](https://github.com/RedSC1/taiyin-ephemeris)。

- 太阳、月亮、行星和恒星位置，观测坐标与天文事件搜索。
- 日月食、时间尺度转换，以及地方平太阳时和视太阳时。
- 中国农历、节气、四柱干支，以及八字和紫微斗数计算。
- TypeScript 类型声明、显式上下文，以及外部星历数据加载。

计算复用 Python、Dart 绑定所使用的同一套内核，浏览器和 Node.js 使用相同的 API。

**开发预览：** 当前 `1.1.0-dev.0` 尚未发布到 npm，`package.json` 的 `private: true`
会阻止误发布。Wasm 后端还未覆盖全部原生接口，具体范围见[接口清单](docs/api-inventory.md)。

## 本地构建

准备 Node.js 22+，并激活 **Emscripten 6.0.12**。以下命令从已锁定、经过 SHA-256
校验的 public 内核生成安装包，再测试实际安装后的用法：

```sh
npm ci
npm run pack:local
npm run test:package
```

构建支持 `web,worker,node`，安装包生成在 `build/packages/`，不会发布 npm。
二进制和构建目录都已 ignore，不提交源码仓库。详见[打包与安装验证](docs/packaging.zh-CN.md)。
修改 C++ 时仍可用 `npm run build:wasm -- /path/to/core` 和 `npm run build` 做本地开发构建。

## 先算一个位置、一次日食和农历日期

```js
import { Ephemeris, Body, Ut1JulianDate } from "./dist/index.js";

const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
const ut1 = Ut1JulianDate.fromDouble(2460310.5);

const { value: mars, flags } = ctx.position.atUt1(Body.marsBarycenter, ut1);
console.log(mars.coordinates, flags.mask);
console.log(ctx.eclipses.nextSolarAtUt1(ut1).value);
console.log(
  ctx.chineseCalendar.fromSolar({ year: 2024, month: 2, day: 10 }).value,
);
```

只有初始化是异步的，计算本身同步执行。使用结束后推荐在 `finally` 中调用 `ctx.close()` 或 `eph.close()`；关闭运行时会递次关闭子上下文和命盘。已返回的数值记录不依赖 Wasm 内存视图，关闭后仍能读取。

默认包含半解析 fallback、内核内置 EOP 资源和紫微默认规则表。**暂不附带、也不会自动下载 DE442/DE441 OPM2 或恒星表。** `marsBarycenter` 是火星系统质心，`mars` 是行星本体中心；后者可能需要额外卫星/COB 数据。

## 浏览器加载星历数据

```js
const eph = await Ephemeris.initialize({
  wasmModuleUri: new URL("/assets/taiyin_web.mjs", location.href),
});
const response = await fetch("/data/sun.opm2");
if (!response.ok) throw new Error(`HTTP ${response.status}`);
eph.loadEphemerisBytes(new Uint8Array(await response.arrayBuffer()), {
  filename: "sun.opm2",
});
```

loader 与 `.wasm` 放在同一目录，星历数据通过 `Uint8Array` 加载。真正计算时要加载目标和中心所需的完整数据链，不是只加载一个太阳文件。沿用 C++ 的 OPM2/SPK/半解析路由，没有额外文件格式。

EOP、月缘、恒星表另有专用加载方法，见 [数据加载](docs/data-loading.md)。`wasmModuleUri` 指向可执行脚本，只能来自可信来源；不是星历数据地址。构建工具和 Worker 可以显式传入 `moduleFactory`。

## 农历、八字与紫微

```js
import {
  AstroDateTime,
  ChineseCalendarConfig,
  BaziGender,
  ZiweiGender,
} from "./dist/index.js";

const ctx = eph.createContext({
  chineseCalendarConfig: ChineseCalendarConfig.localAstronomicalUtcOffset(420),
});
const local = new AstroDateTime(2003, 3, 13, 14, 15);
console.log(ctx.chineseCalendar.fourPillarsLocal(local).value);

const bazi = ctx.bazi();
console.log(bazi.calculateLocal(local, { gender: BaziGender.male }).value);

const ziwei = ctx.ziwei();
const chart = ziwei.createChartLocal(local, { gender: ZiweiGender.male }).value;
console.log(chart.summary);
```

本地时间由所绑定 calendar 的 `utcOffsetMinutes` 解释，不再让用户手动减时区。农历默认模式为 `chinaStandardHistorical`；当地定气定朔可以明确选钟表时区或指定平太阳经度。农历日界与紫微排盘用的平/真太阳时钟是不同设置。

JS `Date` 表示 UTC 瞬间；`AstroDateTime` 表示明确的民用时钟字段。JD 类型只标注时间尺度，不会暗中转换。UTC/EOP 缺失默认报错；允许估算必须显式开启，并检查本次返回的 flags：

```js
ctx.time.setAllowUtcOutOfRangeEstimate(true);
const { value, flags } = ctx.time.scalesFromUtc(
  new Date("2024-04-08T18:00:00Z"),
);
console.log(value.value.ut1, value.diagnostic, flags.mask);
```

固定 UTC 偏移不是 IANA 时区。夏令时和重复/缺失的当地时间需要应用层先处理。完整用法与当前覆盖范围见 [API 说明](docs/api.md)。

八字接口支持关系、小运、人元司令和自定义神煞目录；紫微支持共享／可重载 TOML 目录、不可变 JSON option 模块、UTC／UT1 流运导航和反查，以及本地时间／瞬间／公历日／农历日便捷入口。太阳时只改变排盘虚拟时间，不替换节气边界的物理瞬间。请使用独立的性别枚举：八字 `male=1`，紫微 `male=0`，不要混用裸数字。

天文接口支持高度角／方位角、升落／中天、恒星视位置和观测位置、一般事件搜索、轨道／天象、偕日可见性、掩星、宫位制／恒星黄道／月球点、来源管理，以及自定义星体／ayanamsha／宫位制回调，计算复用 C++ 内核。具体用法见[天文接口指南](docs/astronomy.zh-CN.md)，覆盖范围与限制见[接口清单](docs/api-inventory.md)。

## 与 Python / Dart 的关系

- 方法采用 Dart 风格的 camelCase，例如 `atUt1()`、`createChartAtUt1()`。
- 计算返回 `{ value, flags }`，不是 Python 的 tuple。配置和元数据方法可以直接返回值或 `void`。
- 致命错误抛出带 `status`、`statusName`、`resultFlags` 和可用诊断的异常。不存在或未计算的日月食接触时刻用 `null`。
- 高 32 位日月食选项采用 `bigint`，不要写 `1 << 33`。
- 不向使用者暴露 FFI 指针、传输数组偏移或手动内存分配。

## 验证与限制

```sh
npm test
npm run test:types
npm run test:integration
npm run test:astronomy
npm run test:package
TAIYIN_TEST_DATA_ROOT=/path/to/de442-full npm run test:integration
npm run example:browser
```

已在 Node 和真实浏览器跑位置/状态/批量、UTC 与 EOP 严格错误、显式估算、闰秒、三种农历模式、八字／自定义神煞、紫微本命／流运／太阳时钟／随机起盘／目录重载，以及全部 **39 个日月食桥接入口**。有 native 数值样本对照；这证明绑定口径一致，不等同于重新验证绝对天文精度。详见 [验证记录](docs/verification.md)。

当前 Wasm 单线程，同一实例中的同步调用不能用 `Promise.all()` 加速。要并行计算，使用 Worker，每个 Worker 初始化自己的运行时。不跨 Worker 传活的 context/chart。

## 许可

原创 Wasm 绑定代码采用 MPL-2.0，复用内核及其第三方组件保留各自声明。
感谢 Taiyin 内核及其所依据的天文理论、算法和开源实现；详见 [NOTICE](NOTICE) 与 [内核仓库](https://github.com/RedSC1/taiyin-ephemeris)。

## 早期版本

纯 JavaScript 实现的 0.0.x 版本保留在[仓库历史](https://github.com/RedSC1/js-ephemeris/tree/7093d13cfefa9a4634169ca0e845ab1e3ba9cdbe)中，继续采用其原有的 Apache-2.0 授权。
其 API 与当前 Wasm 绑定不同，已有应用升级时需要调整调用方式。
