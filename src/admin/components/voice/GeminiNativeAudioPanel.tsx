import { useEffect, useState } from "react";
import AdminCard from "../ui/Card";
import AdminBadge from "../ui/Badge";
import AdminButton from "../ui/Button";
import AdminInput from "../ui/Input";
import AdminSelect from "../ui/Select";
import {
  DEFAULT_GEMINI_NATIVE_CONFIG,
  fetchGeminiNativeHealth,
  readGeminiNativeConfigFromMetadata,
  type GeminiNativeConfig,
  type GeminiNativeHealth,
  type VoiceSettings,
} from "../../../services/voice";

type Props = {
  settings: VoiceSettings;
  patchSettings: (patch: Partial<VoiceSettings>) => Promise<void>;
  showToast: (message: string, variant?: "success" | "error") => void;
};

export default function GeminiNativeAudioPanel({ settings, patchSettings, showToast }: Props) {
  const [config, setConfig] = useState<GeminiNativeConfig>(() =>
    readGeminiNativeConfigFromMetadata(settings.metadata),
  );
  const [health, setHealth] = useState<GeminiNativeHealth | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setConfig(readGeminiNativeConfigFromMetadata(settings.metadata));
  }, [settings.metadata]);

  const refreshHealth = async () => {
    setChecking(true);
    const h = await fetchGeminiNativeHealth(config);
    setHealth(h);
    setChecking(false);
  };

  useEffect(() => {
    void refreshHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Gemini Native Audio</h3>
        <p className="mb-3 text-sm opacity-70">
          Speech transport only. Planner, Tool Orchestrator, Reservation Engine, and Human Handoff are unchanged. On
          failure, voice fails over to {config.fallbackTtsProvider}.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <AdminBadge variant={health?.ok ? "success" : "warning"}>
            {health?.status ?? "unknown"}
          </AdminBadge>
          <AdminBadge variant="outline">Model {health?.model ?? config.model}</AdminBadge>
          <AdminBadge variant="outline">
            Streaming {health?.streaming || config.streamingEnabled ? "on" : "off"}
          </AdminBadge>
          {health?.latencyMs != null && (
            <AdminBadge variant="info">Health {health.latencyMs}ms</AdminBadge>
          )}
        </div>
        <p className="mb-3 text-xs opacity-60">{health?.message}</p>
        <AdminButton variant="outline" disabled={checking} onClick={() => void refreshHealth()}>
          {checking ? "Checking…" : "Refresh connection status"}
        </AdminButton>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton
            onClick={async () => {
              await patchSettings({
                ttsProvider: "gemini_native",
                sttProvider: "gemini_native",
                metadata: { ...settings.metadata, geminiNative: config, voiceProvider: "gemini-native" },
              });
              showToast("Gemini Native Audio set as primary voice provider");
            }}
          >
            Use as primary provider
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Configuration</h3>
        <AdminInput
          label="Model"
          value={config.model}
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <AdminSelect
            label="Voice"
            value={config.voiceName}
            onChange={(v) => setConfig({ ...config, voiceName: v })}
            options={["Puck", "Charon", "Kore", "Fenrir", "Aoede"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
          <AdminSelect
            label="Response style"
            value={config.responseStyle}
            onChange={(v) =>
              setConfig({ ...config, responseStyle: v as GeminiNativeConfig["responseStyle"] })
            }
            options={[
              { value: "warm", label: "Warm" },
              { value: "natural", label: "Natural" },
              { value: "concise", label: "Concise" },
            ]}
          />
          <AdminSelect
            label="Failover TTS"
            value={config.fallbackTtsProvider}
            onChange={(v) =>
              setConfig({
                ...config,
                fallbackTtsProvider: v as GeminiNativeConfig["fallbackTtsProvider"],
              })
            }
            options={[
              { value: "browser", label: "Browser" },
              { value: "google", label: "Google TTS" },
              { value: "azure", label: "Azure" },
              { value: "elevenlabs", label: "ElevenLabs" },
            ]}
          />
          <AdminInput
            label="Temperature"
            value={String(config.temperature)}
            onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) || 0.7 })}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.streamingEnabled}
            onChange={(e) => setConfig({ ...config, streamingEnabled: e.target.checked })}
          />
          Streaming enabled
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.autoDetectLanguage}
            onChange={(e) => setConfig({ ...config, autoDetectLanguage: e.target.checked })}
          />
          Auto language detection (en / hi / te)
        </label>
        <AdminButton
          className="mt-3"
          onClick={async () => {
            await patchSettings({
              metadata: {
                ...settings.metadata,
                geminiNative: { ...DEFAULT_GEMINI_NATIVE_CONFIG, ...config },
              },
              voiceName: config.voiceName,
            });
            showToast("Gemini Native settings saved");
            void refreshHealth();
          }}
        >
          Save Gemini Native settings
        </AdminButton>
      </AdminCard>
    </div>
  );
}
