# js-ziwei

[English](https://github.com/RedSC1/js-ephemeris/blob/main/packages/js-ziwei/README.md)

紫微斗数扩展，复用 [js-ephemeris](https://github.com/RedSC1/js-ephemeris) 的
C++／WebAssembly 内核。需要匹配的 `js-ephemeris@1.1.2` 核心包。

从 npm 安装核心与扩展：

```sh
npm install js-ephemeris@1.1.2 js-ziwei@1.1.2
```

如需安装本地构建产物，将路径替换为实际位置：

```sh
npm install /path/to/js-ephemeris-1.1.2.tgz /path/to/js-ziwei-1.1.2.tgz
```

## 快速开始

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

## 上下文与资源管理

导入 `js-ziwei` 后，现有的 context 才会提供 `ctx.ziwei()`；
只安装核心时不会提供此方法。每次调用都会创建独立的计算上下文，计算多个命盘时可以复用同一个。
传入自定义 `chineseCalendar` 时，它必须属于同一个核心 context。
关闭所属的 context 或运行时，会同时关闭其扩展上下文和命盘。

`AstroDateTime` 是当地钟表时间，由绑定 calendar 的固定时区偏移解释；
`Date` 是实际瞬间。UTC／EOP 转换默认严格，允许缺数据估算必须显式开启并检查返回 flags。

如果只使用 `import type` 导入类型，还需要加上 `import "js-ziwei"`，才能启用运行时方法。

## 浏览器与 Worker

两个扩展共享核心包的一份 Wasm，不另外附带、也不会再次初始化 Wasm。
浏览器的 loader／Wasm 资源配置与核心相同。Worker 建议通过 Vite 等构建工具打包依赖；
主线程的 import map 不会应用到 Worker 中。

共享 Wasm 已内置默认紫微规则表；支持本命盘、流运、反查、随机起盘，以及 TOML／JSON 自定义规则目录。
完整接口见[API 文档](https://github.com/RedSC1/js-ephemeris/blob/main/docs/api.md)。

## 许可

原创绑定代码采用 MPL-2.0；内核和第三方组件保留各自的许可与感谢声明，见 [NOTICE](https://github.com/RedSC1/js-ephemeris/blob/main/NOTICE)。
版本说明见 [CHANGELOG](https://github.com/RedSC1/js-ephemeris/blob/main/packages/js-ziwei/CHANGELOG.md)。
