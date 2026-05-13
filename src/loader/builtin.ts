/**
 * 内置数据加载器：负责 Base64 解码和 Gzip 解压
 */

/**
 * 将 Base64 字符串转换为 ArrayBuffer (解压版)
 * 自动适配浏览器和 Node.js 环境
 */
export async function decodeBuiltinData(base64: string): Promise<ArrayBuffer> {
  // 1. Base64 -> Uint8Array
  // Node 16+ 支持 atob，旧版可以用 Buffer.from
  const bytes = typeof atob === 'function' 
    ? Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    : new Uint8Array(Buffer.from(base64, 'base64'));

  // 2. Gzip 解压
  if (typeof DecompressionStream !== 'undefined') {
    // 浏览器环境
    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(decompressedStream);
    return await response.arrayBuffer();
  } else {
    // Node.js 环境 (使用动态 import 避免浏览器报错)
    const { gunzipSync } = await import('node:zlib');
    const decompressed = gunzipSync(bytes);
    return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
  }
}
