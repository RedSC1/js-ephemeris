/**
 * A simple wrapper around DataView for sequential reading of binary data.
 */
export class BinaryReader {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readInt8(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readInt16(): number {
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readInt32(): number {
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readFloat64(): number {
    const val = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readFloat64Array(n: number): Float64Array {
    const arr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      arr[i] = this.readFloat64();
    }
    return arr;
  }

  get hasMore(): boolean {
    return this.offset < this.view.byteLength;
  }

  seek(offset: number): void {
    this.offset = offset;
  }

  get currentOffset(): number {
    return this.offset;
  }
}
