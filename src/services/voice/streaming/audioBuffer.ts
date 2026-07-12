/**
 * Lightweight in-memory audio buffer for streaming chunks (gateway reconnect).
 */

export class AudioBufferQueue {
  private chunks: ArrayBuffer[] = [];
  private maxChunks: number;

  constructor(maxChunks = 64) {
    this.maxChunks = maxChunks;
  }

  push(chunk: ArrayBuffer): void {
    this.chunks.push(chunk);
    while (this.chunks.length > this.maxChunks) this.chunks.shift();
  }

  drain(): ArrayBuffer[] {
    const out = this.chunks;
    this.chunks = [];
    return out;
  }

  clear(): void {
    this.chunks = [];
  }

  get size(): number {
    return this.chunks.length;
  }
}
