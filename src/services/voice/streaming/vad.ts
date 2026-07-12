/**
 * Voice Activity Detection — client-side heuristics over AnalyserNode.
 */

import type { VadEvent } from "../types";

export type VadController = {
  stop: () => void;
};

export function startVad(
  stream: MediaStream,
  opts: {
    silenceTimeoutMs?: number;
    onEvent: (e: VadEvent) => void;
  },
): VadController {
  const silenceTimeoutMs = opts.silenceTimeoutMs ?? 2500;
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  let speaking = false;
  let lastSpeechAt = Date.now();
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = ((data[i] ?? 128) - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const noise = rms > 0.02;
    opts.onEvent({ type: "noise", level: rms });

    if (noise) {
      lastSpeechAt = Date.now();
      if (!speaking) {
        speaking = true;
        opts.onEvent({ type: "speech_start" });
        opts.onEvent({ type: "speaking_indicator", speaking: true });
      }
    } else if (speaking && Date.now() - lastSpeechAt > silenceTimeoutMs) {
      speaking = false;
      opts.onEvent({ type: "speech_end" });
      opts.onEvent({ type: "silence_timeout", ms: silenceTimeoutMs });
      opts.onEvent({ type: "speaking_indicator", speaking: false });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      void ctx.close();
    },
  };
}
