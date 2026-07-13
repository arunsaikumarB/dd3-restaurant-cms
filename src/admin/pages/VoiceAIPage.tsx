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
  HeartHandshake,
  MessageCircle,
  Sparkles,
  Timer,
  ClipboardList,
  BookOpen,
  Users,
  Headset,
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
import VoiceHandoffPanels from "../components/voice/VoiceHandoffPanels";
import VoiceOutboundPanels from "../components/voice/VoiceOutboundPanels";
import { useLocation } from "../hooks/useLocation";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../../config/locations";
import {
  bootstrapVoiceLayer,
  ensureSttProvidersRegistered,
  ensureTtsProvidersRegistered,
  getHospitality,
  getPersonality,
  getRecordingsForLocation,
  getReservationAnalyticsSnapshot,
  getSessionTranscriptBundle,
  getSilenceRules,
  getVoiceAnalytics,
  getVoiceSettings,
  handleReceptionistSilence,
  interruptReceptionist,
  listCallOutcomes,
  listCallSummaries,
  listEvents,
  listGreetingTemplates,
  listReservationCalls,
  listReservationEvents,
  listSttProviders,
  listTtsProviders,
  listVoiceSessions,
  processReceptionistTurn,
  startReceptionistCall,
  endReceptionistCall,
  upsertGreetingTemplate,
  upsertHospitality,
  upsertPersonality,
  upsertSilenceRules,
  upsertVoiceSettings,
  type CallSummary,
  type HospitalityProfile,
  type PersonalityProfile,
  type SilenceRules,
  type VoiceAnalyticsSnapshot,
  type VoiceReservationCall,
  type VoiceSession,
  type VoiceSettings,
} from "../../services/voice";
import type { ReceptionistTurnResult } from "../../services/voice";
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
  | "receptionist"
  | "greetings"
  | "conversation"
  | "hospitality"
  | "personality"
  | "silence"
  | "interruptions"
  | "summaries"
  | "faq"
  | "reservation_calls"
  | "reservation_live"
  | "reservation_timeline"
  | "reservation_analytics"
  | "reservation_testing"
  | "human_handoff"
  | "transfer_rules"
  | "departments"
  | "staff_routing"
  | "live_calls"
  | "agent_assist"
  | "escalation_analytics"
  | "callbacks"
  | "outbound_campaigns"
  | "campaign_builder"
  | "outbound_schedules"
  | "outbound_audience"
  | "outbound_triggers"
  | "call_templates"
  | "outbound_compliance"
  | "outbound_voicemail"
  | "retry_policies"
  | "outbound_analytics"
  | "outbound_optouts"
  | "advanced";

const TABS: Array<{ id: TabId; label: string; icon: typeof Mic }> = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "receptionist", label: "Receptionist", icon: HeartHandshake },
  { id: "greetings", label: "Greetings", icon: MessageCircle },
  { id: "conversation", label: "Conversation", icon: Radio },
  { id: "hospitality", label: "Hospitality", icon: Sparkles },
  { id: "personality", label: "Voice Personality", icon: Mic },
  { id: "silence", label: "Silence Rules", icon: Timer },
  { id: "interruptions", label: "Interruptions", icon: Phone },
  { id: "summaries", label: "Call Summary", icon: ClipboardList },
  { id: "faq", label: "FAQ Testing", icon: BookOpen },
  { id: "reservation_calls", label: "Reservation Calls", icon: ClipboardList },
  { id: "reservation_live", label: "Live Reservation", icon: Radio },
  { id: "reservation_timeline", label: "Reservation Timeline", icon: Timer },
  { id: "reservation_analytics", label: "Reservation Analytics", icon: BarChart3 },
  { id: "reservation_testing", label: "Reservation Testing", icon: FlaskConical },
  { id: "human_handoff", label: "Human Handoff", icon: Headset },
  { id: "transfer_rules", label: "Transfer Rules", icon: Settings2 },
  { id: "departments", label: "Departments", icon: Users },
  { id: "staff_routing", label: "Staff Routing", icon: Users },
  { id: "live_calls", label: "Live Calls", icon: Radio },
  { id: "agent_assist", label: "Agent Assist", icon: Sparkles },
  { id: "escalation_analytics", label: "Escalation Analytics", icon: BarChart3 },
  { id: "callbacks", label: "Callbacks", icon: Phone },
  { id: "outbound_campaigns", label: "Outbound Campaigns", icon: Phone },
  { id: "campaign_builder", label: "Campaign Builder", icon: FlaskConical },
  { id: "outbound_schedules", label: "Schedules", icon: Timer },
  { id: "outbound_audience", label: "Audience Builder", icon: Users },
  { id: "outbound_triggers", label: "Triggers", icon: Sparkles },
  { id: "call_templates", label: "Call Templates", icon: MessageCircle },
  { id: "outbound_compliance", label: "Compliance", icon: Settings2 },
  { id: "outbound_voicemail", label: "Voicemail", icon: Mic },
  { id: "retry_policies", label: "Retry Policies", icon: Timer },
  { id: "outbound_analytics", label: "Campaign Analytics", icon: BarChart3 },
  { id: "outbound_optouts", label: "Opt-outs", icon: ClipboardList },
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
  const [lastTurn, setLastTurn] = useState<ReceptionistTurnResult | null>(null);
  const [timeline, setTimeline] = useState<string[]>([]);
  const [confidence, setConfidence] = useState("0.92");
  const [silenceMs, setSilenceMs] = useState("5000");
  const [personality, setPersonality] = useState<PersonalityProfile | null>(null);
  const [hospitality, setHospitality] = useState<HospitalityProfile | null>(null);
  const [silenceRules, setSilenceRules] = useState<SilenceRules | null>(null);
  const [greetings, setGreetings] = useState<Array<Record<string, unknown>>>([]);
  const [greetingDraft, setGreetingDraft] = useState("");
  const [summaries, setSummaries] = useState<CallSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionEvents, setSessionEvents] = useState<Awaited<ReturnType<typeof listEvents>>>([]);
  const [transcriptText, setTranscriptText] = useState("");
  const [reservationCalls, setReservationCalls] = useState<VoiceReservationCall[]>([]);
  const [reservationAnalytics, setReservationAnalytics] = useState<Awaited<
    ReturnType<typeof getReservationAnalyticsSnapshot>
  > | null>(null);
  const [reservationOutcomes, setReservationOutcomes] = useState<
    Awaited<ReturnType<typeof listCallOutcomes>>
  >([]);
  const [selectedReservationCallId, setSelectedReservationCallId] = useState("");
  const [reservationTimeline, setReservationTimeline] = useState<
    Awaited<ReturnType<typeof listReservationEvents>>
  >([]);

  const refresh = useCallback(async () => {
    bootstrapVoiceLayer();
    ensureSttProvidersRegistered();
    ensureTtsProvidersRegistered();
    const [s, a, sess, rec, p, h, sr, g, sums, rCalls, rAnalytics, rOutcomes] = await Promise.all([
      getVoiceSettings(outlet),
      getVoiceAnalytics(outlet),
      listVoiceSessions(outlet, 50),
      getRecordingsForLocation(outlet),
      getPersonality(outlet),
      getHospitality(outlet),
      getSilenceRules(outlet),
      listGreetingTemplates(outlet),
      listCallSummaries(outlet, 30),
      listReservationCalls(outlet, 50),
      getReservationAnalyticsSnapshot(outlet),
      listCallOutcomes(outlet, 40),
    ]);
    setSettings(s);
    setAnalytics(a);
    setSessions(sess);
    setRecordings(rec);
    setPersonality(p);
    setHospitality(h);
    setSilenceRules(sr);
    setGreetings((g as Array<Record<string, unknown>>) ?? []);
    setSummaries(sums);
    setReservationCalls(rCalls);
    setReservationAnalytics(rAnalytics);
    setReservationOutcomes(rOutcomes);
    const first = g?.[0] as { template?: string } | undefined;
    if (first?.template) setGreetingDraft(first.template);
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
      if (!settings?.enabled) await upsertVoiceSettings(outlet, { enabled: true });
      if (channel === "phone") await upsertVoiceSettings(outlet, { enabled: true, channelPhone: true });
      const { session, greeting } = await startReceptionistCall({
        locationId: outlet,
        channel,
        language: settings?.language === "auto" ? "en" : settings?.language,
        speakGreeting: true,
      });
      setTestSession(session);
      setTestReply(greeting.text);
      setLastTurn(null);
      setTimeline([`GREETING · ${greeting.text}`]);
      showToast(`${channel} receptionist call started`);
      void refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to start session", "error");
    }
  };

  const runTurn = async () => {
    if (!testSession) {
      showToast("Start a receptionist call first", "error");
      return;
    }
    setTestBusy(true);
    try {
      const result = await processReceptionistTurn({
        sessionId: testSession.id,
        transcript: testInput,
        confidence: Number(confidence) || 0.9,
        speak: true,
      });
      setLastTurn(result);
      setTestReply(
        [
          result.spokenText,
          "",
          `Intent: ${result.intent ?? "—"} · Goal: ${result.plannerGoal ?? "—"} · Lang: ${result.language}`,
          result.latency
            ? `Latency ${result.latency.totalMs}ms (STT ${result.latency.sttMs} · Planner ${result.latency.plannerMs} · Tools ${result.latency.toolMs} · Gemini ${result.latency.geminiMs} · TTS ${result.latency.ttsMs})`
            : "Handled by receptionist conversation controls",
          `Confidence: ${result.confidence}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      setTimeline((prev) => [...prev, `USER · ${result.userText}`, `ASSISTANT · ${result.spokenText}`]);
      if (result.control === "end_call") setTestSession(null);
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
        description="Voice Receptionist + transport layer — greets callers, manages conversation, reuses Planner, RAG, and Tools."
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
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">Receptionist Testing</h3>
            <p className="mb-3 text-sm opacity-70">
              Full call lifecycle: greeting → listen → FAQ/Planner or Voice Reservation Agent → speak.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <AdminButton onClick={() => void startTest("web")}>Start Web Call</AdminButton>
              <AdminButton variant="outline" onClick={() => void startTest("phone")}>
                Simulate Phone Call
              </AdminButton>
              {testSession && (
                <>
                  <AdminButton
                    variant="outline"
                    onClick={() => void interruptReceptionist(testSession.id).then(() => showToast("Interrupted"))}
                  >
                    Interrupt
                  </AdminButton>
                  <AdminButton
                    variant="outline"
                    onClick={async () => {
                      const r = await handleReceptionistSilence(testSession.id, Number(silenceMs) || 5000, true);
                      showToast(r.prompt || `Silence stage: ${r.stage}`);
                      if (r.ended) setTestSession(null);
                      if (r.prompt) setTimeline((prev) => [...prev, `SILENCE · ${r.prompt}`]);
                    }}
                  >
                    Simulate Silence
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    onClick={async () => {
                      const { summary } = await endReceptionistCall(testSession.id, "completed");
                      setTestSession(null);
                      showToast(summary ? "Call ended · summary saved" : "Call ended");
                      void refresh();
                    }}
                  >
                    End Call
                  </AdminButton>
                </>
              )}
            </div>
            {testSession && (
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <AdminBadge variant="success">{lastTurn?.callState || testSession.callState}</AdminBadge>
                <AdminBadge variant="info">
                  {(lastTurn?.callState || testSession.callState) === "listening" ? "Listening" : "Busy"}
                </AdminBadge>
                {(lastTurn?.callState || testSession.callState) === "speaking" ||
                (lastTurn?.callState || testSession.callState) === "greeting" ? (
                  <AdminBadge variant="warning">Speaking</AdminBadge>
                ) : null}
                <AdminBadge variant="outline">Intent {lastTurn?.intent ?? "—"}</AdminBadge>
                <AdminBadge variant="outline">Conf {lastTurn?.confidence ?? confidence}</AdminBadge>
              </div>
            )}
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              <AdminInput label="STT confidence" value={confidence} onChange={(e) => setConfidence(e.target.value)} />
              <AdminInput label="Silence ms" value={silenceMs} onChange={(e) => setSilenceMs(e.target.value)} />
            </div>
            <AdminTextarea value={testInput} onChange={(e) => setTestInput(e.target.value)} rows={2} />
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminButton disabled={testBusy || !testSession} onClick={() => void runTurn()}>
                {testBusy ? "Thinking…" : "Guest speaks → Receptionist"}
              </AdminButton>
              {[
                "What are your hours?",
                "Do you have vegetarian options?",
                "Can we continue in Telugu?",
                "I'd like to reserve a table for tomorrow",
                "Move my reservation from 7 PM to 8 PM",
                "I need to cancel my reservation",
                "I'd like to speak to a manager",
                "I have a complaint about my last visit",
                "Please repeat that",
                "Goodbye",
              ].map((q) => (
                <AdminButton key={q} size="sm" variant="outline" onClick={() => setTestInput(q)}>
                  {q}
                </AdminButton>
              ))}
            </div>
            {testReply && (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">
                {testReply}
              </pre>
            )}
          </AdminCard>
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">Live transcript / timeline</h3>
            <ul className="max-h-96 space-y-2 overflow-auto text-sm">
              {timeline.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`} className="border-b border-admin-border/30 pb-2">
                  {line}
                </li>
              ))}
              {!timeline.length && <li className="opacity-60">Start a call to see the conversation timeline.</li>}
            </ul>
            {lastTurn?.latency && (
              <p className="mt-3 text-xs opacity-70">
                Roundtrip {lastTurn.latency.totalMs}ms · turns {lastTurn.memory.turns} · interruptions{" "}
                {lastTurn.memory.interruptions}
              </p>
            )}
          </AdminCard>
        </div>
      )}

      {tab === "receptionist" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Receptionist</h3>
          <p className="text-sm opacity-80">
            Cheffy greets callers, answers FAQs via Semantic RAG, and routes reservation intents to the Voice
            Reservation Agent (create / modify / cancel / availability / waitlist) using the existing Reservation
            Engine — no duplicated booking logic.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminButton onClick={() => setTab("testing")}>Open live testing</AdminButton>
            <AdminButton variant="outline" onClick={() => setTab("reservation_testing")}>
              Reservation testing
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {tab === "greetings" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Greetings</h3>
          <AdminTextarea label="Default greeting template" value={greetingDraft} onChange={(e) => setGreetingDraft(e.target.value)} rows={4} />
          <p className="mt-1 text-xs opacity-60">Tokens: {"{{location}} {{restaurant}} {{assistant}} {{name}} {{timeOfDay}}"}</p>
          <AdminButton
            className="mt-2"
            onClick={async () => {
              await upsertGreetingTemplate({
                locationId: outlet,
                code: "default",
                language: "en",
                template: greetingDraft,
              });
              showToast("Greeting saved");
              void refresh();
            }}
          >
            Save greeting
          </AdminButton>
          <ul className="mt-4 space-y-1 text-sm">
            {greetings.map((g) => (
              <li key={String(g.id)}>
                {String(g.code)} · {String(g.language)} · {String(g.template).slice(0, 80)}…
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      {tab === "conversation" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Conversation</h3>
          <p className="text-sm">
            Turn-taking, repeat, restart, mute/resume, language switch, and misunderstanding recovery are handled by the
            receptionist layer before/around Planner turns.
          </p>
        </AdminCard>
      )}

      {tab === "hospitality" && hospitality && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Hospitality</h3>
          <div className="grid gap-3">
            <AdminInput
              label="Brand"
              value={hospitality.restaurantBrand}
              onChange={(e) => setHospitality({ ...hospitality, restaurantBrand: e.target.value })}
            />
            <AdminInput
              label="Assistant name"
              value={hospitality.assistantName}
              onChange={(e) => setHospitality({ ...hospitality, assistantName: e.target.value })}
            />
            <AdminTextarea
              label="Reservation deferral message"
              value={hospitality.reservationDeferralMessage}
              onChange={(e) => setHospitality({ ...hospitality, reservationDeferralMessage: e.target.value })}
              rows={3}
            />
            <AdminTextarea
              label="Closing message"
              value={hospitality.closingMessage}
              onChange={(e) => setHospitality({ ...hospitality, closingMessage: e.target.value })}
              rows={3}
            />
          </div>
          <AdminButton
            className="mt-3"
            onClick={async () => {
              await upsertHospitality(outlet, hospitality);
              showToast("Hospitality saved");
              void refresh();
            }}
          >
            Save hospitality
          </AdminButton>
        </AdminCard>
      )}

      {tab === "personality" && personality && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Voice Personality</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInput
              label="Speaking speed"
              type="number"
              step="0.1"
              value={String(personality.speakingSpeed)}
              onChange={(e) => setPersonality({ ...personality, speakingSpeed: Number(e.target.value) || 1 })}
            />
            <AdminInput
              label="Pause duration (ms)"
              type="number"
              value={String(personality.pauseDurationMs)}
              onChange={(e) => setPersonality({ ...personality, pauseDurationMs: Number(e.target.value) || 350 })}
            />
            <AdminSelect
              label="Greeting style"
              value={personality.greetingStyle}
              onChange={(v) => setPersonality({ ...personality, greetingStyle: v })}
              options={[
                { value: "warm", label: "Warm" },
                { value: "formal", label: "Formal" },
                { value: "festive", label: "Festive" },
              ]}
            />
            <AdminSelect
              label="Energy"
              value={personality.energyLevel}
              onChange={(v) => setPersonality({ ...personality, energyLevel: v })}
              options={[
                { value: "calm", label: "Calm" },
                { value: "balanced", label: "Balanced" },
                { value: "upbeat", label: "Upbeat" },
              ]}
            />
          </div>
          <AdminButton
            className="mt-3"
            onClick={async () => {
              await upsertPersonality(outlet, personality);
              showToast("Personality saved");
              void refresh();
            }}
          >
            Save personality
          </AdminButton>
        </AdminCard>
      )}

      {tab === "silence" && silenceRules && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Silence Rules</h3>
          <div className="grid gap-3">
            <AdminInput
              label="Soft prompt (ms)"
              type="number"
              value={String(silenceRules.softPromptMs)}
              onChange={(e) => setSilenceRules({ ...silenceRules, softPromptMs: Number(e.target.value) || 5000 })}
            />
            <AdminTextarea
              label="5s prompt"
              value={silenceRules.prompt5s}
              onChange={(e) => setSilenceRules({ ...silenceRules, prompt5s: e.target.value })}
              rows={2}
            />
            <AdminTextarea
              label="10s prompt"
              value={silenceRules.prompt10s}
              onChange={(e) => setSilenceRules({ ...silenceRules, prompt10s: e.target.value })}
              rows={2}
            />
            <AdminTextarea
              label="20s end prompt"
              value={silenceRules.prompt20s}
              onChange={(e) => setSilenceRules({ ...silenceRules, prompt20s: e.target.value })}
              rows={2}
            />
          </div>
          <AdminButton
            className="mt-3"
            onClick={async () => {
              await upsertSilenceRules(outlet, silenceRules);
              showToast("Silence rules saved");
              void refresh();
            }}
          >
            Save silence rules
          </AdminButton>
        </AdminCard>
      )}

      {tab === "interruptions" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Interruptions</h3>
          <p className="text-sm">
            When a guest speaks over Cheffy, TTS stops immediately and listening resumes. Use Interrupt in Testing to
            verify.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.allowInterruptions ?? true}
              onChange={(e) => void patchSettings({ allowInterruptions: e.target.checked })}
            />
            Allow interruptions
          </label>
        </AdminCard>
      )}

      {tab === "summaries" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Call Summaries</h3>
          <ul className="space-y-3 text-sm">
            {summaries.map((s) => (
              <li key={s.id} className="border-b border-admin-border/30 pb-2">
                <strong>{new Date(s.createdAt).toLocaleString()}</strong> · {s.sentiment ?? "—"} ·{" "}
                {Math.round(s.durationMs / 1000)}s
                <p className="mt-1 opacity-80">{s.summary}</p>
                <p className="text-xs opacity-60">
                  Topics: {s.topics.join(", ") || "—"} · Intents: {s.detectedIntents.join(", ") || "—"}
                  {s.escalationRecommendation ? ` · ${s.escalationRecommendation}` : ""}
                </p>
              </li>
            ))}
            {!summaries.length && <li>No summaries yet — end a receptionist test call.</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "faq" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">FAQ Testing</h3>
          <p className="mb-3 text-sm opacity-80">
            FAQ answers come from Semantic RAG + CMS knowledge through the existing AI platform — never duplicated here.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "What are your business hours?",
              "Where are you located?",
              "Is there parking?",
              "What are today's offers?",
              "Tell me about popular dishes",
            ].map((q) => (
              <AdminButton
                key={q}
                size="sm"
                variant="outline"
                onClick={() => {
                  setTestInput(q);
                  setTab("testing");
                }}
              >
                {q}
              </AdminButton>
            ))}
          </div>
        </AdminCard>
      )}

      {tab === "advanced" && settings && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Advanced</h3>
          <p className="text-sm opacity-70">
            Voice covers inbound receptionist, reservations, human handoff, and outbound campaigns. Live PSTN carrier
            dialing can be attached to the same Voice Gateway phone sessions; this platform already schedules, complies,
            scripts, and records outcomes.
          </p>
          <pre className="mt-3 overflow-auto rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
            {JSON.stringify(settings.metadata, null, 2)}
          </pre>
        </AdminCard>
      )}

      {(
        [
          "human_handoff",
          "transfer_rules",
          "departments",
          "staff_routing",
          "live_calls",
          "agent_assist",
          "escalation_analytics",
          "callbacks",
        ] as TabId[]
      ).includes(tab) && (
        <VoiceHandoffPanels outlet={outlet} tab={tab} showToast={showToast} />
      )}

      {(
        [
          "outbound_campaigns",
          "campaign_builder",
          "outbound_schedules",
          "outbound_audience",
          "outbound_triggers",
          "call_templates",
          "outbound_compliance",
          "outbound_voicemail",
          "retry_policies",
          "outbound_analytics",
          "outbound_optouts",
        ] as TabId[]
      ).includes(tab) && (
        <VoiceOutboundPanels outlet={outlet} tab={tab} showToast={showToast} />
      )}

      {tab === "reservation_calls" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Reservation Calls</h3>
          <p className="mb-3 text-sm opacity-70">
            Voice workflow state only — reservation truth remains in the Reservation Engine.
          </p>
          <ul className="max-h-[28rem] space-y-2 overflow-auto text-sm">
            {reservationCalls.map((c) => (
              <li key={c.id} className="border-b border-admin-border/30 pb-2">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => {
                    setSelectedReservationCallId(c.id);
                    setTab("reservation_timeline");
                    void listReservationEvents(c.id).then(setReservationTimeline);
                  }}
                >
                  <AdminBadge variant={c.completedAt ? "success" : "warning"}>{c.stage}</AdminBadge>{" "}
                  <span className="opacity-80">{c.workflow}</span> · {c.id.slice(0, 8)} ·{" "}
                  {c.confirmationCode ?? "no code"} · {c.collected.customerName ?? "guest"}
                </button>
              </li>
            ))}
            {!reservationCalls.length && (
              <li className="opacity-60">No voice reservation calls yet — apply migration 052 and run a test.</li>
            )}
          </ul>
        </AdminCard>
      )}

      {tab === "reservation_live" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Live Reservation Status</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Active" value={reservationCalls.filter((c) => !c.completedAt).length} />
            <Metric
              label="Confirming"
              value={reservationCalls.filter((c) => c.stage === "confirming" && !c.completedAt).length}
            />
            <Metric
              label="Transfer recommended"
              value={reservationCalls.filter((c) => c.transferRecommended && !c.completedAt).length}
            />
            <Metric label="Completed (session)" value={reservationCalls.filter((c) => c.stage === "completed").length} />
          </div>
          <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
            {reservationCalls
              .filter((c) => !c.completedAt)
              .map((c) => (
                <li key={c.id}>
                  {c.workflow} · {c.stage} · {c.collected.date ?? "—"} {c.collected.time ?? ""} · party{" "}
                  {c.collected.guests ?? "?"}
                </li>
              ))}
            {!reservationCalls.some((c) => !c.completedAt) && (
              <li className="opacity-60">No active reservation conversations.</li>
            )}
          </ul>
        </AdminCard>
      )}

      {tab === "reservation_timeline" && (
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Reservation Timeline</h3>
          <AdminSelect
            label="Call"
            value={selectedReservationCallId}
            onChange={(id) => {
              setSelectedReservationCallId(id);
              if (id) void listReservationEvents(id).then(setReservationTimeline);
            }}
            options={[
              { value: "", label: "Select a reservation call…" },
              ...reservationCalls.map((c) => ({
                value: c.id,
                label: `${c.id.slice(0, 8)} · ${c.workflow} · ${c.stage}`,
              })),
            ]}
          />
          <ul className="mt-4 max-h-96 space-y-2 overflow-auto text-sm">
            {reservationTimeline.map((ev: Record<string, unknown>) => (
              <li key={String(ev.id ?? Math.random())}>
                <span className="opacity-60">{String(ev.created_at ?? "").slice(11, 19)}</span> ·{" "}
                {String(ev.event_type ?? "")}{" "}
                <code className="text-xs opacity-70">{JSON.stringify(ev.payload ?? {})}</code>
              </li>
            ))}
            {!reservationTimeline.length && <li className="opacity-60">Select a call to view events.</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "reservation_analytics" && reservationAnalytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">Voice Reservation Analytics</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total calls" value={reservationAnalytics.totalCalls} />
              <Metric label="Completed" value={reservationAnalytics.completed} />
              <Metric label="Waitlisted" value={reservationAnalytics.waitlisted} />
              <Metric label="Cancelled flows" value={reservationAnalytics.cancelled} />
              <Metric label="Transfer recommended" value={reservationAnalytics.transferRecommended} />
              <Metric label="Active" value={reservationAnalytics.active} />
            </div>
          </AdminCard>
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">Recent outcomes</h3>
            <ul className="max-h-80 space-y-2 overflow-auto text-sm">
              {reservationOutcomes.map((o: Record<string, unknown>) => (
                <li key={String(o.id)}>
                  {String(o.outcome_type ?? "")} · {String(o.confirmation_code ?? "—")} ·{" "}
                  {String(o.summary ?? "").slice(0, 80)}
                </li>
              ))}
              {!reservationOutcomes.length && <li className="opacity-60">No outcomes yet.</li>}
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "reservation_testing" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">Reservation Testing</h3>
            <p className="mb-3 text-sm opacity-70">
              Uses the same receptionist lifecycle; reservation intents are owned by the Voice Reservation Agent and
              Reservation Engine.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <AdminButton onClick={() => void startTest("web")}>Start Web Call</AdminButton>
              {testSession && (
                <AdminButton
                  variant="danger"
                  onClick={async () => {
                    await endReceptionistCall(testSession.id, "completed");
                    setTestSession(null);
                    void refresh();
                  }}
                >
                  End Call
                </AdminButton>
              )}
            </div>
            <AdminTextarea value={testInput} onChange={(e) => setTestInput(e.target.value)} rows={2} />
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminButton disabled={testBusy || !testSession} onClick={() => void runTurn()}>
                {testBusy ? "Thinking…" : "Guest speaks"}
              </AdminButton>
              {[
                "I'd like a table for tomorrow at South Plainfield",
                "Party of 4 at 7 PM, name is Priya Sharma, phone 7325551212",
                "Yes, that's correct",
                "Move my reservation to 8 PM, confirmation DD-TEST01",
                "Cancel my reservation, phone 7325551212",
                "Are you available Friday evening?",
                "Put me on the waitlist",
                "It's a birthday dinner",
              ].map((q) => (
                <AdminButton key={q} size="sm" variant="outline" onClick={() => setTestInput(q)}>
                  {q.slice(0, 42)}
                  {q.length > 42 ? "…" : ""}
                </AdminButton>
              ))}
            </div>
            {testReply && (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">
                {testReply}
              </pre>
            )}
          </AdminCard>
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold">Scenario checklist</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
              <li>Create reservation</li>
              <li>Modify / cancel / lookup</li>
              <li>Unknown vs returning customer (CRM phone)</li>
              <li>No availability → alternatives / waitlist</li>
              <li>Closed / blocked date</li>
              <li>Large group / birthday / special requests</li>
              <li>Interruption / language switch / transfer recommend</li>
            </ul>
            <ul className="mt-4 max-h-72 space-y-2 overflow-auto text-sm">
              {timeline.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
              ))}
            </ul>
          </AdminCard>
        </div>
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
