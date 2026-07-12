import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Mic,
  Settings2,
  PlugZap,
  Languages,
  BarChart3,
  Phone,
  Radio,
  FileAudio,
  FlaskConical,
  SlidersHorizontal,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminButton from "../components/ui/Button";
import AdminInput from "../components/ui/Input";
import AdminSelect from "../components/ui/Select";
import AdminTextarea from "../components/ui/Textarea";
import AdminToast from "../components/ui/Toast";
import AdminChart from "../components/ui/Chart";
import { useLocation } from "../hooks/useLocation";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../../config/locations";
import {
  bootstrapVoiceLayer,
  endVoiceSession,
  ensureSttProvidersRegistered,
  ensureTtsProvidersRegistered,
  getRecordingsForLocation,
  getSessionTranscriptBundle,
  getVoiceAnalytics,
  getVoiceSettings,
  listEvents,
  listSttProviders,
  listTtsProviders,
  listVoiceSessions,
  processVoiceTurn,
  startVoiceSession,
  stopTtsForSession,
  upsertVoiceSettings,
  type VoiceAnalyticsSnapshot,
  type VoiceSession,
  type VoiceSettings,
} from "../../services/voice";
import "../admin.css";

type TabId =
  | "general"
  | "providers"
  | "voice"
  | "languages"
  | "analytics"
  | "logs"
  | "sessions"
  | "recordings"
  | "testing"
  | "advanced";

const TABS: Array<{ id: TabId; label: string; icon: typeof Mic }> = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "providers", label: "Providers", icon: PlugZap },
  { id: "voice", label: "Voice Settings", icon: Mic },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "logs", label: "Call Logs", icon: Phone },
  { id: "sessions", label: "Sessions", icon: Radio },
  { id: "recordings", label: "Recordings", icon: FileAudio },
  { id: "testing", label: "Testing", icon: FlaskConical },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
];

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
    </div>
  );
}

export default function VoiceAIPage() {
  const { locationId, isAllLocations } = useLocation();
  const outlet = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "general";
  const setTab = (id: TabId) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", id);
      return next;
    });

  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });
  const showToast = (message: string, variant: "success" | "error" = "success") =>
    setToast({ open: true, message, variant });

  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [analytics, setAnalytics] = useState<VoiceAnalyticsSnapshot | null>(null);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [recordings, setRecordings] = useState<Awaited<ReturnType<typeof getRecordingsForLocation>>>([]);
  const [testSession, setTestSession] = useState<VoiceSession | null>(null);
  const [testInput, setTestInput] = useState("What are your hours today?");
  const [testReply, setTestReply] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionEvents, setSessionEvents] = useState<Awaited<ReturnType<typeof listEvents>>>([]);
  const [transcriptText, setTranscriptText] = useState("");

  const refresh = useCallback(async () => {
    bootstrapVoiceLayer();
    ensureSttProvidersRegistered();
    ensureTtsProvidersRegistered();
    const [s, a, sess, rec] = await Promise.all([
      getVoiceSettings(outlet),
      getVoiceAnalytics(outlet),
      listVoiceSessions(outlet, 50),
      getRecordingsForLocation(outlet),
    ]);
    setSettings(s);
    setAnalytics(a);
    setSessions(sess);
    setRecordings(rec);
  }, [outlet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patchSettings = async (patch: Partial<VoiceSettings>) => {
    const next = await upsertVoiceSettings(outlet, patch);
    setSettings(next);
    showToast(next ? "Settings saved" : "Could not save settings", next ? "success" : "error");
  };

  const startTest = async (channel: "web" | "phone") => {
    try {
      const { session } = await startVoiceSession({
        locationId: outlet,
        channel,
        language: settings?.language === "auto" ? "en" : settings?.language,
      });
      setTestSession(session);
      setTestReply(settings?.greeting ?? "");
      showToast(`${channel} session started`);
      void refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to start session", "error");
    }
  };

  const runTurn = async () => {
    if (!testSession) {
      showToast("Start a test session first", "error");
      return;
    }
    setTestBusy(true);
    try {
      const result = await processVoiceTurn({
        sessionId: testSession.id,
        transcript: testInput,
        speak: true,
      });
      setTestReply(
        [
          result.assistantText,
          "",
          `Latency total ${result.latency.totalMs}ms · STT ${result.latency.sttMs} · Planner ${result.latency.plannerMs} · Tools ${result.latency.toolMs} · Gemini ${result.latency.geminiMs} · TTS ${result.latency.ttsMs}`,
          result.intent ? `Intent: ${result.intent}` : "",
          result.planId ? `Plan: ${result.planId}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      void refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Turn failed", "error");
    } finally {
      setTestBusy(false);
    }
  };

  const sttProviders = listSttProviders();
  const ttsProviders = listTtsProviders();

  return (
    <div className="admin-page">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", path: "/admin/dashboard" },
          { label: "Integrations", path: "/admin/integrations/chefgaa" },
          { label: "Voice AI", path: "/admin/integrations/voice" },
        ]}
      />
      <PageHeader
        title="Voice AI"
        description="Real-time voice transport layer — Web & Phone channels reuse Planner, Tools, and Gemini."
      >
        <AdminBadge variant="info">{outlet}</AdminBadge>
        <AdminButton variant="outline" onClick={() => void refresh()}>
          Refresh
        </AdminButton>
      </PageHeader>

      {isAllLocations && (
        <p className="mb-4 text-sm text-amber-500">Select a specific outlet for voice configuration.</p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "border-admin-primary bg-admin-primary text-white"
                  : "border-admin-border bg-transparent"
              }`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "general" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">General</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => void patchSettings({ enabled: e.target.checked })}
              />
              Enable Voice AI
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.channelWeb}
                onChange={(e) => void patchSettings({ channelWeb: e.target.checked })}
              />
              Web Voice
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.channelPhone}
                onChange={(e) => void patchSettings({ channelPhone: e.target.checked })}
              />
              Phone Calls
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.allowInterruptions}
                onChange={(e) => void patchSettings({ allowInterruptions: e.target.checked })}
              />
              Allow interruptions
            </label>
          </div>
          <div className="mt-4">
            <AdminTextarea
              label="Greeting"
              value={settings.greeting}
              onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
              rows={3}
            />
            <AdminButton className="mt-2" onClick={() => void patchSettings({ greeting: settings.greeting })}>
              Save greeting
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {tab === "providers" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Providers</h3>
          <p className="mb-3 text-sm opacity-70">
            Providers register via abstraction. Browser is ready for Web Voice; cloud STT/TTS adapters are registered for
            credential wiring.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSelect
              label="STT provider"
              value={settings.sttProvider}
              onChange={(v) => void patchSettings({ sttProvider: v as VoiceSettings["sttProvider"] })}
              options={sttProviders.map((p) => ({ value: p.id, label: p.label }))}
            />
            <AdminSelect
              label="TTS provider"
              value={settings.ttsProvider}
              onChange={(v) => void patchSettings({ ttsProvider: v as VoiceSettings["ttsProvider"] })}
              options={ttsProviders.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>
          <ul className="mt-4 list-disc pl-5 text-sm">
            {sttProviders.map((p) => (
              <li key={p.id}>STT · {p.label}</li>
            ))}
            {ttsProviders.map((p) => (
              <li key={p.id}>TTS · {p.label}</li>
            ))}
          </ul>
        </AdminCard>
      )}

      {tab === "voice" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Voice Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput
              label="Voice name"
              value={settings.voiceName}
              onChange={(e) => setSettings({ ...settings, voiceName: e.target.value })}
            />
            <AdminSelect
              label="Gender"
              value={settings.voiceGender}
              onChange={(v) => setSettings({ ...settings, voiceGender: v })}
              options={[
                { value: "neutral", label: "Neutral" },
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
            <AdminInput
              label="Speed"
              type="number"
              step="0.1"
              value={String(settings.voiceSpeed)}
              onChange={(e) => setSettings({ ...settings, voiceSpeed: Number(e.target.value) || 1 })}
            />
            <AdminInput
              label="Pitch"
              type="number"
              step="0.1"
              value={String(settings.voicePitch)}
              onChange={(e) => setSettings({ ...settings, voicePitch: Number(e.target.value) || 1 })}
            />
            <AdminInput
              label="Silence timeout (ms)"
              type="number"
              value={String(settings.silenceTimeoutMs)}
              onChange={(e) => setSettings({ ...settings, silenceTimeoutMs: Number(e.target.value) || 2500 })}
            />
            <AdminInput
              label="Max call length (sec)"
              type="number"
              value={String(settings.maxCallLengthSec)}
              onChange={(e) => setSettings({ ...settings, maxCallLengthSec: Number(e.target.value) || 900 })}
            />
          </div>
          <AdminButton
            className="mt-3"
            onClick={() =>
              void patchSettings({
                voiceName: settings.voiceName,
                voiceGender: settings.voiceGender,
                voiceSpeed: settings.voiceSpeed,
                voicePitch: settings.voicePitch,
                silenceTimeoutMs: settings.silenceTimeoutMs,
                maxCallLengthSec: settings.maxCallLengthSec,
              })
            }
          >
            Save voice settings
          </AdminButton>
        </AdminCard>
      )}

      {tab === "languages" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Languages</h3>
          <AdminSelect
            label="Default language"
            value={settings.language}
            onChange={(v) => void patchSettings({ language: v as VoiceSettings["language"] })}
            options={[
              { value: "en", label: "English" },
              { value: "hi", label: "Hindi" },
              { value: "te", label: "Telugu" },
              { value: "auto", label: "Auto detect" },
            ]}
          />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.autoDetectLanguage}
              onChange={(e) => void patchSettings({ autoDetectLanguage: e.target.checked })}
            />
            Auto-detect language from speech
          </label>
        </AdminCard>
      )}

      {tab === "analytics" && analytics && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Sessions" value={analytics.totalSessions} />
            <Metric label="Active" value={analytics.activeSessions} />
            <Metric label="Avg duration (ms)" value={analytics.avgDurationMs} />
            <Metric label="Avg roundtrip (ms)" value={analytics.avgRoundtripMs} />
            <Metric label="Interruptions" value={analytics.interruptions} />
            <Metric label="Dropped" value={analytics.droppedCalls} />
            <Metric label="Transferred" value={analytics.transferredCalls} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AdminChart
              title="By channel"
              data={analytics.byChannel.map((c) => ({ label: c.channel, value: c.count }))}
            />
            <AdminChart
              title="By language"
              data={analytics.byLanguage.map((c) => ({ label: c.language, value: c.count }))}
            />
          </div>
          <AdminCard className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Provider health</h3>
            <ul className="space-y-1 text-sm">
              {analytics.providerHealth.map((p) => (
                <li key={p.provider}>
                  {p.provider} · success {p.successRate}% · avg {p.avgLatencyMs}ms
                </li>
              ))}
              {!analytics.providerHealth.length && <li>No provider metrics yet</li>}
            </ul>
          </AdminCard>
        </>
      )}

      {tab === "logs" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Call Logs</h3>
          <ul className="space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 border-b border-admin-border/30 py-2">
                <AdminBadge variant="outline">{s.channel}</AdminBadge>
                <AdminBadge variant={s.endedAt ? "default" : "success"}>{s.callState}</AdminBadge>
                <span>{s.conversationId}</span>
                <span className="opacity-60">{new Date(s.startedAt).toLocaleString()}</span>
                <AdminButton
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setSelectedSessionId(s.id);
                    setSessionEvents(await listEvents(s.id));
                    const bundle = await getSessionTranscriptBundle(s.id);
                    setTranscriptText(bundle.downloadText);
                    setTab("sessions");
                  }}
                >
                  Open
                </AdminButton>
              </li>
            ))}
            {!sessions.length && <li>No calls yet</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "sessions" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Sessions</h3>
          {selectedSessionId ? (
            <>
              <p className="mb-2 text-sm">Session {selectedSessionId}</p>
              <pre className="mb-3 max-h-48 overflow-auto rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
                {transcriptText || "No transcript"}
              </pre>
              <ul className="space-y-1 text-sm">
                {sessionEvents.map((e) => (
                  <li key={e.id}>
                    {e.eventType} · {new Date(e.createdAt).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm opacity-70">Select a session from Call Logs.</p>
          )}
        </AdminCard>
      )}

      {tab === "recordings" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Recordings</h3>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.recordingEnabled}
              onChange={(e) => void patchSettings({ recordingEnabled: e.target.checked })}
            />
            Enable recording
          </label>
          <AdminInput
            label="Retention days"
            type="number"
            value={String(settings.recordingRetentionDays)}
            onChange={(e) =>
              void patchSettings({ recordingRetentionDays: Number(e.target.value) || 30 })
            }
          />
          <AdminTextarea
            className="mt-3"
            label="Legal disclaimer"
            value={settings.recordingDisclaimer}
            onChange={(e) => setSettings({ ...settings, recordingDisclaimer: e.target.value })}
            rows={3}
          />
          <AdminButton
            className="mt-2"
            onClick={() => void patchSettings({ recordingDisclaimer: settings.recordingDisclaimer })}
          >
            Save disclaimer
          </AdminButton>
          <ul className="mt-4 space-y-2 text-sm">
            {recordings.map((r) => (
              <li key={r.id}>
                {r.id.slice(0, 8)} · session {r.sessionId.slice(0, 8)} · {r.format} ·{" "}
                {r.expiresAt ? `expires ${r.expiresAt.slice(0, 10)}` : "no expiry"}
              </li>
            ))}
            {!recordings.length && <li>No recordings stored</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "testing" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Testing</h3>
          <p className="mb-3 text-sm opacity-70">
            Runs a voice turn through the real Planner → Tool Orchestrator → Gemini path. Browser TTS speaks the reply.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <AdminButton
              onClick={() => {
                if (!settings?.enabled) {
                  void patchSettings({ enabled: true }).then(() => void startTest("web"));
                } else void startTest("web");
              }}
            >
              Start Web Voice session
            </AdminButton>
            <AdminButton
              variant="outline"
              onClick={() => {
                if (!settings?.enabled || !settings.channelPhone) {
                  void patchSettings({ enabled: true, channelPhone: true }).then(() => void startTest("phone"));
                } else void startTest("phone");
              }}
            >
              Simulate Phone ingress
            </AdminButton>
            {testSession && (
              <>
                <AdminButton
                  variant="outline"
                  onClick={() => void stopTtsForSession(testSession.id).then(() => showToast("Interrupted"))}
                >
                  Interrupt TTS
                </AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={async () => {
                    await endVoiceSession(testSession.id, "completed");
                    setTestSession(null);
                    showToast("Session ended");
                    void refresh();
                  }}
                >
                  End session
                </AdminButton>
              </>
            )}
          </div>
          {testSession && (
            <p className="mb-2 text-xs opacity-70">
              Session {testSession.id.slice(0, 8)} · {testSession.channel} · {testSession.callState} ·{" "}
              {testSession.conversationId}
            </p>
          )}
          <AdminTextarea value={testInput} onChange={(e) => setTestInput(e.target.value)} rows={2} />
          <AdminButton className="mt-2" disabled={testBusy || !testSession} onClick={() => void runTurn()}>
            {testBusy ? "Thinking…" : "Send final transcript → AI → TTS"}
          </AdminButton>
          {testReply && (
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">
              {testReply}
            </pre>
          )}
        </AdminCard>
      )}

      {tab === "advanced" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Advanced</h3>
          <p className="text-sm opacity-70">
            Voice is transport-only. Reservation dialogues and human handoff are deferred to later Voice AI phases.
            WhatsApp Voice, Mobile App, Drive-Thru, and Smart Kiosk channels share the same gateway contracts.
          </p>
          <pre className="mt-3 overflow-auto rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
            {JSON.stringify(settings.metadata, null, 2)}
          </pre>
        </AdminCard>
      )}

      {!settings && tab !== "analytics" && (
        <AdminCard>
          <p className="text-sm">
            No voice settings row yet — apply migration 050, then Refresh. Defaults will seed per outlet.
          </p>
        </AdminCard>
      )}

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
