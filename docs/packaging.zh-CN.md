# 本地打包与安装测试

这些命令只生成本地产物，不会发布 npm；`private: true` 仍保留。
[English](packaging.md)

## 准备环境

需要 Node.js 22+、npm、CMake、tar，以及已激活的 **Emscripten 6.0.12**。
浏览器测试需要 Chromium 或 Chrome，也可以用 `CHROME_BIN` 指定可执行文件。

```sh
npm ci
source /path/to/emsdk/emsdk_env.sh
npm run pack:local
npm run test:package
# 全部浏览器引擎及 Vite 开发／生产构建：
npm exec -- playwright-core install chromium firefox webkit
npm run test:package -- --browsers chromium,firefox,webkit --vite
# 只测 Node，不要求安装浏览器：
npm run test:package -- --browsers none
# 原样测试指定候选包，CI 使用构建 job 上传的那一份：
npm run test:package -- --archive build/packages/js-ephemeris-1.1.0.tgz --browsers chromium,firefox,webkit --vite
```

没有测试浏览器时，可以用 `npx playwright-core install chromium` 安装。
Playwright 仅供开发测试，安装后的库没有这项运行时依赖。

## 构建来源与产物

`wasm-build.json` 锁定 public C++ tag、准确提交、源码归档 SHA-256、编译器版本和
目标环境。下载地址必须包含声明的准确 commit，不能只使用可移动 tag。
首次构建需要网络下载源码；缓存缺失或与当前校验值不一致时会重新下载。
显式提供的归档校验失败则直接报错，不偷偷回退到下载。每次从归档重新解包，
不使用相邻的私有源码目录。已有归档时可以显式指定，但校验不会跳过：

```sh
npm run pack:local -- --core-archive /path/to/taiyin-v1.1.0.tar.gz
```

生成三个安装包：`build/packages/js-ephemeris-<version>.tgz`、`js-bazi-<version>.tgz`、`js-ziwei-<version>.tgz`。包内包含 JS、类型声明、
ESM loader、Wasm、公开文档和内核／第三方／Emscripten 运行时声明；不包含 DE 数据、
恒星表、原生 DLL、源码仓库或开发依赖。

`build:package` 会检查真实 Wasm 的 C ABI、协议和库版本，再生成带文件哈希的
`assets/build-info.json`。直接运行 `npm pack` 也会触发 `prepack`，拒绝缺失、被修改
或过期的产物。JS 输出目录会先清理再编译，避免旧模块残留。
改过声明文件或内核 pin 后，需要重新执行 `build:package`。
每次构建都会重建源码目录与 CMake 构建目录，避免旧编译器缓存或时间戳较新的旧对象
混入新包。SDK 声明目录也会清理重建，打包白名单只允许六个已声明的文件。

`build:wasm -- /path/to/core` 仍可用于修改 C++ 时的开发构建，但不能替代正式打包前的
固定来源构建步骤。所有构建目录和二进制都已 ignore。

## 实际安装验证

`test:package` 会真正执行 `npm pack`，在独立临时目录中以**离线、禁用安装脚本**的
方式安装 `.tgz`，再检查：

- 从 `js-ephemeris` 包名导入，以及安装后的 TypeScript 类型编译。
- Node 主线程与两个独立 Node Worker。
- 真实浏览器主线程、两个模块 Worker 和一个经典 Worker。
- 星体位置、农历、日食、八字、内置紫微规则、严格 EOP 错误、显式估算 flags 和关闭行为。
- 包内容完整，不链接源码目录、不夹带构建机器路径；本机 HTTP 服务只提供已安装的
  文件和测试夹具，不提供开发仓库。

不同环境的数值结果会互相对照。这是安装与绑定一致性验证，不是独立的天文精度评估。
结果写入 `build/package-test-result.json`；即使浏览器或 HTTP 服务关闭时报错，
也仍会执行后续关闭步骤与临时项目清理。
已执行的版本和启动阻塞详见[验证记录](verification.md)。报告只列出实际测试的浏览器；
指定的浏览器启动失败会使命令失败，不会偷偷跳过；每次运行前会删除上次报告。
这里的 WebKit 是 Playwright 引擎构建，不能冒称已测试苹果发行的 Safari 应用。

兼容性 CI 在 Linux 编译一次 Wasm，之后 Linux／macOS／Windows 的 Node 22／24
以及 Linux／macOS 的浏览器／Vite job 都复用同一份产物。
每个测试 job 也会下载同一个 `npm-tarball`，通过 `--archive` 原样安装，不重新生成候选包；
报告记录其 SHA-256，安装后的文件哈希和来源声明也会再次校验。
代码 PR、main 代码改动或手动 dispatch 可以触发；纯文档修改不重新编译。
workflow 只有只读权限，没有发布凭据或 npm 发布步骤。
Vite 开发／预览服务器调用完整生命周期的关闭方法，释放插件清理 hook 和信号监听器，
不只是关闭 HTTP 端口。

## 前端部署

Node 和 Worker 都可使用 `await Ephemeris.initialize()`，不需要暴露 Wasm 指针。
直接部署 ESM 时保持 `dist/` 与 `assets/` 的相对目录结构。

如果前端构建工具把资源复制到其他位置，请把 `taiyin_web.mjs` 和 `taiyin_web.wasm`
一起部署，再用 `wasmModuleUri` 指定可信的 `.mjs` 地址。包提供 loader、Wasm 和构建
信息的子路径导出；也可通过 `moduleFactory` 接入构建工具管理的 loader。
目前没有自动 CDN 下载、自动加载精确星历数据或自动配置打包工具的插件。

## Vite 项目

已测试的接入方式是把安装包中的 `taiyin_web.mjs`、`taiyin_web.wasm` 与许可声明
复制到项目 `public/ephemeris/`，保留 loader 与 Wasm 的文件名及相对位置。
完整复制脚本见[英文配置示例](packaging.md#vite-applications)，在 `vite`／`vite build` 前执行。

应用代码使用包名导入，并明确传入部署地址：

```js
import { Ephemeris } from "js-ephemeris";
const eph = await Ephemeris.initialize({
  wasmModuleUri: new URL(
    `${import.meta.env.BASE_URL}ephemeris/taiyin_web.mjs`,
    location.href,
  ),
});
```

使用顶层 await 时设 `build.target: "es2022"`，模块 Worker 设 `worker.format: "es"`。
安装测试覆盖开发服务器和生产构建预览，并在 `/release-smoke/` 非根路径下测试主线程
及模块 Worker。这里没有承诺 SSR 支持，也不会自动猜测任意打包后 loader 的新位置。

## 三包安装验证

`--archive` 指向核心包时，同目录必须同时存在同版本 `js-bazi` 和 `js-ziwei` 安装包。
测试不会重新打包 CI 候选产物：原字节分别离线安装，先验证核心可独立使用，再验证每个扩展及组合使用。
两个扩展只有核心 peer dependency，不含 Wasm／loader 或核心实现。
浏览器主线程用 import map，未打包 Worker 只测试核心；Node Worker 和 Vite Worker 验证三个包。
