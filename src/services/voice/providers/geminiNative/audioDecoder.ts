import { playPcmBase64, base64ToUint8Array, base64PcmToAudioBuffer } from "./audioEncoder";

export { playPcmBase64, base64ToUint8Array, base64PcmToAudioBuffer };

/** Decode Gemini inline audio (base64 PCM or WAV-ish) for playback. */
export async function decodeAndPlayAudio(input: {
  audioBase64: string;
  mimeType?: string | null;
  sampleRateHz?: number;
  signal?: AbortSignal;
}): Promise<{ played: boolean; latencyMs: number }> {
  const mime = input.mimeType ?? "";
  if (mime.includes("mpeg") || mime.includes("mp3") || mime.includes("wav") || mime.includes("ogg")) {
    return playEncodedAudioBlob(input.audioBase64, mime, input.signal);
  }
  return playPcmBase64(input.audioBase64, input.sampleRateHz ?? 24000, input.signal);
}

async function playEncodedAudioBlob(
  base64: string,
  mimeType: string,
  signal?: AbortSignal,
): Promise<{ played: boolean; latencyMs: number }> {
  const started = performance.now();
  if (typeof window === "undefined") return { played: false, latencyMs: 0 };
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType || "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        audio.pause();
        resolve();
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("audio playback failed"));
      void audio.play().catch(reject);
    });
    URL.revokeObjectURL(url);
    return { played: true, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { played: false, latencyMs: Math.round(performance.now() - started) };
  }
}
