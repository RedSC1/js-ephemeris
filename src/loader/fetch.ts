/**
 * Fetch-based 数据加载器
 * 
 * 适用于浏览器和支持 fetch 的 Node.js (18+) 环境。
 * 从 HTTP/HTTPS URL 加载 .bin.gz 文件并解压。
 */
import type { DataLoader } from './interface.js';

export class FetchLoader implements DataLoader {
  name = 'fetch';
  private baseUrl: string;

  /**
   * @param baseUrl 数据文件的基础 URL，末尾需带 /
   *   例如: 'https://cdn.example.com/ephemeris/v3/'
   *   或本地开发: 'http://localhost:3000/data/'
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  }

  async load(path: string): Promise<ArrayBuffer> {
    const url = this.baseUrl + path;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const compressed = await response.arrayBuffer();

    // 解压 gzip
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([compressed]).stream();
      const decompressed = stream.pipeThrough(new DecompressionStream('gzip'));
      return await new Response(decompressed).arrayBuffer();
    }

    // Node.js fallback (fetch 可用但 DecompressionStream 不可用的情况)
    const { gunzipSync } = await import('node:zlib');
    const buf = gunzipSync(Buffer.from(compressed));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}
