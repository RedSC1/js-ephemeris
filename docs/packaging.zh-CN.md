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
```

没有测试浏览器时，可以用 `npx playwright-core install chromium` 安装。
Playwright 仅供开发测试，安装后的库没有这项运行时依赖。

## 构建来源与产物

`wasm-build.json` 锁定 public C++ tag、准确提交、源码归档 SHA-256、编译器版本和
目标环境。首次构建需要网络下载源码；缓存归档也会重新校验。每次从归档重新解包，
不使用相邻的私有源码目录。已有归档时可以显式指定，但校验不会跳过：

```sh
npm run pack:local -- --core-archive /path/to/taiyin-v1.1.0.tar.gz
```

生成的安装包在 `build/packages/js-ephemeris-<version>.tgz`。包内包含 JS、类型声明、
ESM loader、Wasm、公开文档和内核／第三方／Emscripten 运行时声明；不包含 DE 数据、
恒星表、原生 DLL、源码仓库或开发依赖。

`build:package` 会检查真实 Wasm 的 C ABI、协议和库版本，再生成带文件哈希的
`assets/build-info.json`。直接运行 `npm pack` 也会触发 `prepack`，拒绝缺失、被修改
或过期的产物。JS 输出目录会先清理再编译，避免旧模块残留。
改过声明文件或内核 pin 后，需要重新执行 `build:package`。

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
结果写入 `build/package-test-result.json`，临时项目会自动清理。
目前本机验证的是 macOS ARM64、Node 25 和 Chromium；最低 Node 版本及跨平台 CI
还需另外补齐，不能把这些环境都算作已经测试通过。

## 前端部署

Node 和 Worker 都可使用 `await Ephemeris.initialize()`，不需要暴露 Wasm 指针。
直接部署 ESM 时保持 `dist/` 与 `assets/` 的相对目录结构。

如果前端构建工具把资源复制到其他位置，请把 `taiyin_web.mjs` 和 `taiyin_web.wasm`
一起部署，再用 `wasmModuleUri` 指定可信的 `.mjs` 地址。包提供 loader、Wasm 和构建
信息的子路径导出；也可通过 `moduleFactory` 接入构建工具管理的 loader。
目前没有自动 CDN 下载、自动加载精确星历数据或自动配置打包工具的插件。
