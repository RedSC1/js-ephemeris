/**
 * 简单的 LRU (Least Recently Used) 缓存
 * 
 * 用于缓存已解析的世纪数据，避免重复下载和解析。
 * capacity <= 0 时不限制容量（不淘汰）。
 */
export class LRUCache<K, V> {
  private map = new Map<K, V>();
  private readonly capacity: number;

  constructor(capacity: number = 32) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // 移到最新位置（删除再插入）
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.capacity > 0 && this.map.size >= this.capacity) {
      // 删除最久没用的（Map 迭代顺序 = 插入顺序，第一个就是最旧的）
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}
