/**
 * 示例 5: 加载远程/本地扩展数据
 * 
 * 使用 NodeFileLoader 加载超出 1800-2100 范围的数据。
 * 也可以用 FetchLoader 从 CDN 加载。
 */
import { Ephemeris } from '../src/engine.js';
import { NodeFileLoader } from '../src/loader/node.js';

async function main() {
  // 配置本地数据目录和远程 manifest
  const eph = new Ephemeris({
    loader: new NodeFileLoader('/path/to/data_v3/'),
    remoteManifest: {
      // 谷神星: 扩展到 -7900 ~ 9000 CE
      'ceres': [
        { jdStart: 2341972, jdEnd: 2378495, path: 'ceres/before_1800/ceres_2341972_2378495.bin.gz' },
        { jdStart: 2488070, jdEnd: 2524595, path: 'ceres/after_2100/ceres_2488070_2524595.bin.gz' },
        // ... 更多世纪文件
      ],
      // 火星: 扩展到 30000 年
      'mar': [
        { jdStart: 2341972, jdEnd: 2378495, path: 'mar/before_1800/mars_2341972_2378495.bin.gz' },
        // ...
      ]
    }
  });

  // 内置范围内 (1800-2100) 正常工作，不需要 loader
  const modern = await eph.geocentricState('ceres', new Date('2024-01-01'));
  console.log('2024 谷神星黄经:', modern.lon.toFixed(4), '°');

  // 超出内置范围时自动从 loader 加载
  // const ancient = await eph.geocentricState('ceres', 2200000.0); // ~500 BCE
  // console.log('500 BCE 谷神星黄经:', ancient.lon.toFixed(4), '°');

  console.log('\n注意: 取消注释上面的代码并配置正确的数据路径即可使用远程数据');
}

main().catch(console.error);
