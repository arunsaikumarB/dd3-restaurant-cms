/**
 * Streaming helpers for Gemini Native — incremental mic chunks + response buffering.
 */

import { encodeMediaStreamChunk } from "./audioEncoder";

export type StreamPump = {
  push: (samples: Float32Array) => void;
  drainEncoded: () => Array<{ pcmBase64: string; mimeType: string; sampleRateHz: number }>;
  clear: () => void;
  size: () => number;
};

export function createAudioStreamPump(sampleRateHz: number): StreamPump {
  const frames: Float32Array[] = [];
  return {
    push(samples) {
      frames.push(samples);
      while (frames.length > 64) frames.shift();
    },
    drainEncoded() {
      const out = frames.splice(0, frames.length);
      return out.map((f) => encodeMediaStreamChunk(f, sampleRateHz));
    },
    clear() {
      frames.length = 0;
    },
    size() {
      return frames.length;
    },
  };
}

export type PartialResponseBuffer = {
  append: (text: string) => void;
  take: () => string;
  peek: () => string;
  clear: () => void;
};

export function createPartialResponseBuffer(): {
  append: (text: string) => void;
  take: () => string;
  peek: () => string;
  clear: () => void;
} {
  let buf = "";
  return {
    append(text) {
      buf += text;
    },
    take() {
      const out = buf;
      buf = "";
      return out;
    },
    peek() {
      return buf;
    },
    clear() {
      buf = "";
    },
  };
}
