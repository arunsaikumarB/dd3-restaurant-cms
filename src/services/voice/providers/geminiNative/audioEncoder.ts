/** PCM helpers for Gemini Live / native audio (16-bit little-endian). */

export function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function pcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64PcmToAudioBuffer(
  ctx: AudioContext,
  base64: string,
  sampleRateHz: number,
): AudioBuffer {
  const bytes = base64ToUint8Array(base64);
  const samples = bytes.byteLength / 2;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const buffer = ctx.createBuffer(1, samples, sampleRateHz);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return buffer;
}

export async function playPcmBase64(
  base64: string,
  sampleRateHz: number,
  signal?: AbortSignal,
): Promise<{ played: boolean; latencyMs: number }> {
  const started = performance.now();
  if (typeof window === "undefined" || !base64) {
    return { played: false, latencyMs: 0 };
  }
  const ctx = new AudioContext({ sampleRate: sampleRateHz });
  try {
    const buffer = base64PcmToAudioBuffer(ctx, base64, sampleRateHz);
    if (signal?.aborted) {
      await ctx.close();
      return { played: false, latencyMs: Math.round(performance.now() - started) };
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    await new Promise<void>((resolve) => {
      const onAbort = () => {
        try {
          source.stop();
        } catch {
          /* ignore */
        }
        resolve();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      source.onended = () => resolve();
      source.start();
    });
    await ctx.close();
    return { played: true, latencyMs: Math.round(performance.now() - started) };
  } catch {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
    return { played: false, latencyMs: Math.round(performance.now() - started) };
  }
}

export function encodeMediaStreamChunk(
  input: Float32Array,
  sampleRateHz: number,
): { pcmBase64: string; mimeType: string; sampleRateHz: number } {
  const pcm = floatTo16BitPCM(input);
  return {
    pcmBase64: pcm16ToBase64(pcm),
    mimeType: `audio/pcm;rate=${sampleRateHz}`,
    sampleRateHz,
  };
}
