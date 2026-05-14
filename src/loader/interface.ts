/**
 * 数据加载器接口
 * 
 * 抽象不同环境下的数据加载方式（本地文件、HTTP fetch 等）。
 * 加载器负责：获取 .bin.gz 文件 → 解压 → 返回 ArrayBuffer。
 */
export interface DataLoader {
  /** 加载器名称（用于调试） */
  name: string;

  /**
   * 加载并解压一个 .bin.gz 数据文件
   * @param path 文件路径或 URL（相对于 baseUrl）
   * @returns 解压后的 ArrayBuffer
   */
  load(path: string): Promise<ArrayBuffer>;
}
