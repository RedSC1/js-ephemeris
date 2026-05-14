/**
 * Node.js 本地文件加载器
 * 
 * 从本地文件系统读取 .bin.gz 文件并解压。
 * 适用于开发测试和服务端场景。
 */
import type { DataLoader } from './interface.js';

export class NodeFileLoader implements DataLoader {
  name = 'node-file';
  private basePath: string;

  /**
   * @param basePath 数据文件的基础目录路径
   *   例如: '/path/to/data_v3/'
   */
  constructor(basePath: string) {
    this.basePath = basePath.endsWith('/') ? basePath : basePath + '/';
  }

  async load(path: string): Promise<ArrayBuffer> {
    const { readFile } = await import('node:fs/promises');
    const { gunzipSync } = await import('node:zlib');
    const { join } = await import('node:path');

    const fullPath = join(this.basePath, path);
    const compressed = await readFile(fullPath);
    const decompressed = gunzipSync(compressed);

    return decompressed.buffer.slice(
      decompressed.byteOffset,
      decompressed.byteOffset + decompressed.byteLength
    );
  }
}
