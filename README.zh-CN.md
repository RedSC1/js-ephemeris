# js-ephemeris

> [!IMPORTANT]
> **项目公告**：`js-ephemeris` 项目目前已暂停维护。我们正在使用 C++ 重写并重构全新的高精度星历计算内核 —— **[taiyin-ephemeris (太阴)](https://github.com/RedSC1/taiyin-ephemeris)**（基于 C++11，无虚函数开销，完美解析一阶/二阶导数，极简高性能架构）。待 C++ 内核稳定后，本项目将以 C++ 代码为标准模板，从头重构一个纯正、零开销的 JS/TS 版本（或直接编译为 WebAssembly 运行）。敬请期待！

高精度太阳系星历计算引擎，纯 JavaScript/TypeScript 实现。零依赖，浏览器和 Node.js 通用。


内置 1800–2100 CE 的高精度数据（基于 NASA JPL DE441 行星星历和 sb441/Horizons 小行星星历拟合，与原始星历还原误差 ~0.001"）。超出此范围时自动降级至 Moshier PLAN404 半解析理论（±5000 年，精度 0.05–2"，不发散）。可通过[扩展数据包](https://github.com/RedSC1/ephemeris-data)将高精度覆盖范围扩充至 -13000 ~ +17000 CE。形心修正（COB）数据未内置，需额外下载。

## 特性

- **内置 20 个天体**（可扩展）：日月、水金地火木土天海冥、谷神星、智神星、婚神星、灶神星、爱神星、凯龙、福鲁斯、涅索斯、莉莉丝
- **多精度解析器链**：
  - 内置 OPM2/OPV2 数据（DE441）：亚毫角秒精度，1800–2100 CE
  - Moshier PLAN404 兜底：0.05–2" 精度，±5000 年不发散，无需数据文件
  - 用户可扩展：注册自定义解析器（SPK、远程 API 等）
- **1800–2100 年零配置**，可扩展至 -13000 ~ +17000 CE（[ephemeris-data](https://github.com/RedSC1/ephemeris-data)）
- **完整天体测量学修正**：光行时迭代、相对论光行差（Lorentz 变换）、引力偏折、形心修正（COB）
- **多坐标系**：J2000 赤道、J2000 黄道、当期真黄道/真赤道
- **速度计算**：切比雪夫解析求导，地心黄经速度（度/天）
- **站心观测**：方位角/高度角，可选大气折射修正
- **可扩展解析器架构**：支持自定义数据源（SPK、自定义 provider）

## 安装

```bash
npm install js-ephemeris
```

## 快速开始

```typescript
import { Ephemeris } from 'js-ephemeris';

const eph = new Ephemeris();

// 地心视黄道状态
const mars = await eph.geocentricState('mars', new Date('2024-03-20'));
console.log(mars.lon);        // 地心黄经（度）
console.log(mars.lonSpeed);   // 黄经速度（度/天），负值 = 逆行
console.log(mars.retrograde); // 是否逆行

// 日心 J2000 赤道直角坐标（AU）
const pos = await eph.position('chiron', 2451545.0);
console.log(pos.xyz);         // [x, y, z] 单位 AU

// 坐标系转换
const ecl = pos.toTrueEcliptic();
const [lon, lat, r] = ecl.lbr();

// 完整状态向量（位置 + 速度）
const state = await eph.state('mars', 2451545.0);
// state = [x, y, z, vx, vy, vz]，单位 AU 和 AU/day
```

## 站心观测

```typescript
import { Ephemeris, SkyObserver } from 'js-ephemeris';

const eph = new Ephemeris();
const observer = new SkyObserver(eph, { lat: 39.9, lon: 116.4, alt: 50 });

const result = await observer.observe('mars', new Date());
console.log(result.ra);        // 赤经（弧度）
console.log(result.dec);       // 赤纬（弧度）
console.log(result.azimuth);   // 方位角（弧度）
console.log(result.altitude);  // 高度角（弧度）
```

### SkyObserver 选项

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lat` | `number` | 必填 | 大地纬度（度，北正） |
| `lon` | `number` | 必填 | 经度（度，东正） |
| `alt` | `number` | `0` | 海拔高度（米） |
| `pressure` | `number` | — | 大气压（hPa）。大于 0 时启用折射修正 |
| `temperature` | `number` | `15` | 温度（°C）。配合折射使用 |
| `refractionProvider` | `RefractionProvider` | Standard | 自定义折射模型 |

> 大气折射仅在传入 `pressure` 且大于 0 时生效。由于气象数据因地因时而异，库无法内置默认值，因此默认不开启大气折射。

## 配置

### EphemerisOptions

传入 `new Ephemeris(options)`。所有字段可选，零配置即可使用。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `baseUrl` | `string` | — | 远程数据 CDN 基础路径 |
| `loader` | `DataLoader` | — | 自定义数据加载器（优先于 baseUrl） |
| `remoteManifest` | `RemoteManifest` | — | 远程可用数据文件描述 |
| `cobManifest` | `COBManifest` | — | 形心修正数据描述 |
| `cacheSize` | `number` | `100` | LRU 缓存条目数（0 = 不限） |
| `deltaTProvider` | `function` | 内置 | 自定义 ΔT (TT−UT) 函数 |
| `precessionProvider` | `PrecessionProvider` | Vondrak 2011 | 岁差模型 |
| `nutationProvider` | `NutationProvider` | IAU 2000B | 章动模型 |
| `astrometric` | `AstrometricOptions` | 见下表 | `geocentricState` 默认修正选项 |
| `resolvers` | `PositionResolver[]` | — | 额外注册的解析器 |

### AstrometricOptions

控制 `geocentricState()` 的修正项。可全局设置（在 `EphemerisOptions.astrometric` 中）或每次调用时覆盖。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lightTime` | `boolean` | `true` | 光行时迭代修正 |
| `aberration` | `boolean` | `true` | 相对论光行差修正 |
| `deflection` | `boolean` | `false` | 太阳引力偏折修正 |
| `cob` | `boolean` | `false` | 形心修正（需要 COB 数据） |

```typescript
// 零配置
const eph = new Ephemeris();

// 自定义配置
const eph = new Ephemeris({
  baseUrl: 'https://cdn.jsdelivr.net/gh/RedSC1/ephemeris-data@main/data_integrated/',
  cacheSize: 200,
  astrometric: { deflection: true }  // 全局开启引力偏折
});

// 单次调用覆盖
const geo = await eph.geocentricState('mars', jd, { cob: true });
```

## 支持天体

| 标识 | 天体 | 内置范围 | 扩展范围（需下载） | 数据来源 |
|------|------|----------|-------------------|----------|
| `sun` | 太阳 | ∞ | — | 合成（−地球） |
| `mer` | 水星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `ven` | 金星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `ear` | 地球/EMB | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `moon` | 月球 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `mar` | 火星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `jup` | 木星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `sat` | 土星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `ura` | 天王星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `nep` | 海王星 | 1800–2100 | -13000–17000 CE | DE441 OPM2 |
| `plu` | 冥王星 | 1800–2100 | -13000–17000 CE | DE441 OPV2 |
| `ceres` | 谷神星 | 1800–2100 | -13000–17000 CE | sb441 / 数值积分 |
| `pallas` | 智神星 | 1800–2100 | -13000–17000 CE | sb441 / 数值积分 |
| `juno` | 婚神星 | 1800–2100 | -13000–17000 CE | sb441 / 数值积分 |
| `vesta` | 灶神星 | 1800–2100 | -13000–17000 CE | sb441 / 数值积分 |
| `eros` | 爱神星 | 1800–2100 | -13000–17000 CE | sb441 / 数值积分 |
| `chiron` | 凯龙星 | 1800–2100 | -13000–17000 CE | Horizons / 数值积分 |
| `pholus` | 福鲁斯 | 1800–2100 | -13000–17000 CE | Horizons / 数值积分 |
| `nessus` | 涅索斯 | 1800–2100 | -13000–17000 CE | Horizons / 数值积分 |
| `lilith` | 莉莉丝 (1181) | 1800–2100 | -13000–17000 CE | Horizons / 数值积分 |

扩展数据覆盖 DE441 完整范围，从 [ephemeris-data](https://github.com/RedSC1/ephemeris-data) 下载。

### 形心修正 (COB) 数据（需额外下载）

COB 将行星系统质心修正为行星本体中心。未内置，需从 [ephemeris-data](https://github.com/RedSC1/ephemeris-data) 下载。

| 天体 | 覆盖范围 | 数据来源 |
|------|----------|----------|
| 木星 | 1600–2200 CE | jup365.bsp |
| 土星 | 1750–2250 CE | sat441.bsp |
| 天王星 | -12000–17000 CE | ura111xl-799.bsp |
| 海王星 | 1600–2400 CE | nep097.bsp |
| 冥王星 | 1800–2200 CE | plu060.bsp |

## 扩展数据（超出 1800–2100）

扩展数据文件（覆盖 -13000 CE 到 +17000 CE）可从 [ephemeris-data](https://github.com/RedSC1/ephemeris-data) 下载。

数据目录结构（位于 [ephemeris-data](https://github.com/RedSC1/ephemeris-data)）：

```
data_integrated/
├── mer/
│   ├── before_1800/        # 扩展过去
│   ├── 1800_2100/          # JPL 官方数据（拟合）
│   └── after_2100/         # 扩展未来
├── ven/
├── ear/
├── moon/
├── mar/
├── jup/
├── sat/
├── ura/
├── nep/
├── plu/
├── ceres/
├── chiron/
├── ...                     # 其他小行星
└── cob/                    # 形心修正数据（需单独下载）
    ├── jupiter/
    ├── saturn/
    ├── uranus/
    ├── neptune/
    └── pluto/
```

每个文件命名为 `{body}_{jdStart}_{jdEnd}.bin.gz`（gzip 压缩的 OPM2/OPV2 切比雪夫数据）。

```typescript
import { Ephemeris } from 'js-ephemeris';

// 使用 jsDelivr 作为 CDN（直接服务 GitHub 仓库文件）
const eph = new Ephemeris({
  baseUrl: 'https://cdn.jsdelivr.net/gh/RedSC1/ephemeris-data@main/data_integrated/'
});

// 或使用本地文件（Node.js）
import { NodeFileLoader } from 'js-ephemeris/loader/node';
const eph2 = new Ephemeris({
  loader: new NodeFileLoader('/path/to/ephemeris-data/')
});

// 超出 1800-2100 的日期也能计算
const ancient = await eph.geocentricState('mars', julianDay(-500, 6, 15));
```

无扩展数据时，Moshier 兜底引擎自动为所有主要行星和月球提供角秒级精度的位置（±5000 年不发散）。

## 天体测量学修正

`geocentricState` 默认应用以下修正：

| 修正项 | 默认 | 说明 |
|--------|------|------|
| 光行时 | ✅ 开启 | 迭代求解，含 Shapiro 引力延迟 |
| 恒星光行差 | ✅ 开启 | 相对论 Lorentz 变换 |
| 引力偏折 | ❌ 关闭 | 太阳密度模型平滑过渡 |
| 形心修正 (COB) | ❌ 关闭 | 系统质心 → 行星本体中心 |

> **注意**：形心修正数据（木星、土星、天王星、海王星、冥王星）未内置，需从 [ephemeris-data](https://github.com/RedSC1/ephemeris-data) 下载并配置 loader 后使用。

```typescript
// 几何位置（不含修正）
const geo = await eph.geocentricState('mars', jd, {
  lightTime: false,
  aberration: false
});

// 完整视位置（含引力偏折）
const app = await eph.geocentricState('mars', jd, {
  deflection: true
});
```

## 架构

引擎采用优先级链式解析器：

| 优先级 | 解析器 | 数据源 |
|--------|--------|--------|
| 50 | 内置 | 嵌入的 OPM2/OPV2（1800–2100 CE） |
| 40 | 远程 | CDN/本地文件加载 |
| 20 | Moshier | PLAN404 半解析理论（全行星 + 月球） |
| 10 | 开普勒 | 平均轨道根数（小行星） |

> **开发中**：NASA/JPL SPK (.bsp) 文件读取器正在开发中，将在后续版本加入。

高优先级解析器优先调用。如果无法处理请求（如日期超出范围），自动降级到下一个。

Moshier 兜底无需任何数据文件，基于 Steve Moshier 的 PLAN404 理论（拟合 DE404），附加多项式修正对齐 DE441。±5000 年不发散（不同于 VSOP87）。

### 自定义解析器

实现 `PositionResolver` 接口即可接入引擎：

```typescript
import type { PositionResolver, ResolverResult } from 'js-ephemeris';

const myResolver: PositionResolver = {
  name: 'my-source',
  priority: 60,  // 高于内置(50)则优先使用
  canResolve(tag, jd) { return tag === 'mars' && jd > 2451545; },
  async resolve(tag, jd) {
    // 返回 J2000 equatorial cartesian (AU)
    return { state: [x, y, z], source: 'my-source', precision: 'milliarcsec', center: 'sun', frame: 'ICRF / J2000 Equatorial' };
  }
};

eph.registerResolver(myResolver);
```

## 许可证

Apache-2.0 — 见 [LICENSE](./LICENSE)

## 路线图

- [ ] NASA/JPL SPK (.bsp) 文件读取器
- [ ] 行星卫星支持（伽利略卫星、土卫六、海卫一等）
- [ ] 更多小行星和 TNO
