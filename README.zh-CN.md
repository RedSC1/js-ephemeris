# js-ephemeris

高精度太阳系星历计算引擎，纯 JavaScript/TypeScript 实现。零依赖，浏览器和 Node.js 通用。

## 特性

- **20 个天体**：日月、水金地火木土天海冥、谷神星、智神星、婚神星、灶神星、爱神星、凯龙、福鲁斯、涅索斯、莉莉丝
- **亚毫角秒精度**（基于 DE441 的 OPM2/OPV2 切比雪夫数据）
- **1800–2100 年内置**（零配置），可通过 CDN 或本地文件扩展
- **完整天体测量学修正**：光行时、恒星光行差、引力偏折
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

// 地心视黄道状态（占星场景）
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

## 支持天体

| 标识 | 天体 | 覆盖范围 | 数据来源 |
|------|------|----------|----------|
| `sun` | 太阳 | ∞ | 合成（−地球） |
| `mer` | 水星 | 1800–2100 | DE441 OPM2 |
| `ven` | 金星 | 1800–2100 | DE441 OPM2 |
| `ear` | 地球/EMB | 1800–2100 | DE441 OPM2 |
| `moon` | 月球 | 1800–2100 | DE441 OPM2 |
| `mar` | 火星 | 1800–2100 | DE441 OPM2 |
| `jup` | 木星 | 1800–2100 | DE441 OPM2 |
| `sat` | 土星 | 1800–2100 | DE441 OPM2 |
| `ura` | 天王星 | 1800–2100 | DE441 OPM2 |
| `nep` | 海王星 | 1800–2100 | DE441 OPM2 |
| `plu` | 冥王星 | 1800–2100 | DE441 OPV2 |
| `ceres` | 谷神星 | 1800–2100 | sb441 OPM2 |
| `pallas` | 智神星 | 1800–2100 | sb441 OPM2 |
| `juno` | 婚神星 | 1800–2100 | sb441 OPM2 |
| `vesta` | 灶神星 | 1800–2100 | sb441 OPM2 |
| `eros` | 爱神星 | 1800–2100 | sb441 OPM2 |
| `chiron` | 凯龙星 | 1800–2100 | Horizons OPM2 |
| `pholus` | 福鲁斯 | 1800–2100 | Horizons OPM2 |
| `nessus` | 涅索斯 | 1800–2100 | Horizons OPM2 |
| `lilith` | 莉莉丝 (1181) | 1800–2100 | Horizons OPM2 |

## 扩展数据（超出 1800–2100）

```typescript
import { Ephemeris } from 'js-ephemeris';
import { NodeFileLoader } from 'js-ephemeris/loader/node';

const eph = new Ephemeris({
  loader: new NodeFileLoader('/path/to/data_v3/'),
  remoteManifest: {
    'ceres': [
      { jdStart: 2341972, jdEnd: 2378495, path: 'ceres/before_1800/ceres_2341972_2378495.bin.gz' },
      // ...
    ]
  }
});

// 超出 1800-2100 的日期也能计算
const ancient = await eph.geocentricState('ceres', julianDay(-500, 6, 15));
```

## 天体测量学修正

`geocentricState` 默认应用以下修正：

| 修正项 | 默认 | 说明 |
|--------|------|------|
| 光行时 | ✅ 开启 | 迭代求解，含 Shapiro 引力延迟 |
| 恒星光行差 | ✅ 开启 | 经典一阶近似 |
| 引力偏折 | ❌ 关闭 | 太阳密度模型平滑过渡 |

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

| 优先级 | 解析器 | 数据源 | 精度 |
|--------|--------|--------|------|
| 100 | SPK | 用户导入的 NASA .bsp 文件 | <0.001" |
| 50 | 内置 | 嵌入的 base64 OPM2/OPV2 | <0.01" |
| 40 | 远程 | CDN/本地文件加载 | <0.01" |
| 10 | 兜底 | Kepler / 寿星万年历 / astronomy-engine | ~1'–1" |

支持注册自定义解析器：

```typescript
eph.registerResolver(myCustomResolver);
```

## 许可证

GPL-2.0 — 见 [LICENSE](./LICENSE)
