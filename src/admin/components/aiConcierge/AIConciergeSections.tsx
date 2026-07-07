import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import AdminCard from "../ui/Card";
import AdminToggle from "../ui/Toggle";
import AdminInput from "../ui/Input";
import AdminTextarea from "../ui/Textarea";
import AdminSelect from "../ui/Select";
import AdminButton from "../ui/Button";
import AdminBadge from "../ui/Badge";
import DataTable from "../shared/DataTable";
import { useAdminTheme } from "../../context/AdminThemeContext";
import type { AIConciergePermissions } from "../../../services/aiAdmin/permissions";
import type {
  AIFollowupRow,
  AIPersonalityRow,
  AIPromptVersionRow,
  AIProviderSettingsRow,
  AISettingsRow,
  AISuggestedQuestionRow,
  AIAnalyticsSummary,
} from "../../../types/aiAdmin";
import { PROMPT_VARIABLES } from "../../../services/aiAdmin/defaults";
import type { TableColumn } from "../../types";
import { LOCATIONS, type LocationId } from "../../../config/locations";
import {
  deleteSuggestedQuestion,
  exportRowsCsv,
  exportRowsJson,
  listConversationLogs,
  listErrorLogs,
  markKnowledgeSync,
  reorderSuggestedQuestions,
  runAISandbox,
  upsertFollowup,
  upsertSuggestedQuestion,
} from "../../../services/aiAdmin/repository";

type SectionProps = {
  permissions: AIConciergePermissions;
  disabled?: boolean;
};

function SectionHeader({ title, description }: { title: string; description?: string }) {
  const { dark } = useAdminTheme();
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>{description}</p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 border-b border-admin-border/40 last:border-0 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <span className="text-sm">{label}</span>
      <AdminToggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function GeneralSection({
  settings,
  setSettings,
  permissions,
  disabled,
}: SectionProps & {
  settings: AISettingsRow;
  setSettings: (s: AISettingsRow) => void;
}) {
  const patchGeneral = (patch: Partial<AISettingsRow["general"]>) =>
    setSettings({ ...settings, general: { ...settings.general, ...patch } });

  return (
    <AdminCard id="ai-section-general" className="ai-concierge-section">
      <SectionHeader title="General" description="Enable Cheffy features and global assistant behavior." />
      <div className="grid gap-1">
        <ToggleRow label="Enable AI Concierge" checked={!!settings.general.ai_enabled} onChange={(v) => patchGeneral({ ai_enabled: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Floating Assistant" checked={!!settings.general.floating_assistant} onChange={(v) => patchGeneral({ floating_assistant: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Welcome Animation" checked={!!settings.general.welcome_animation} onChange={(v) => patchGeneral({ welcome_animation: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Voice Greeting (future)" checked={!!settings.general.voice_greeting} onChange={(v) => patchGeneral({ voice_greeting: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Typing Animation" checked={!!settings.general.typing_animation} onChange={(v) => patchGeneral({ typing_animation: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Recommendation Cards" checked={!!settings.general.recommendation_cards} onChange={(v) => patchGeneral({ recommendation_cards: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Follow-up Suggestions" checked={!!settings.general.follow_up_suggestions} onChange={(v) => patchGeneral({ follow_up_suggestions: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Dynamic Chips" checked={!!settings.general.dynamic_chips} onChange={(v) => patchGeneral({ dynamic_chips: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Conversation Memory" checked={!!settings.general.conversation_memory} onChange={(v) => patchGeneral({ conversation_memory: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Hospitality Personality" checked={!!settings.general.hospitality_personality} onChange={(v) => patchGeneral({ hospitality_personality: v })} disabled={disabled || !permissions.canEditGeneral} />
        <ToggleRow label="Maintenance Mode" checked={!!settings.general.maintenance_mode} onChange={(v) => patchGeneral({ maintenance_mode: v })} disabled={disabled || !permissions.canEditGeneral} />
      </div>
      <div className="mt-4">
        <AdminSelect
          label="Default Location Behavior"
          value={settings.general.default_location_behavior ?? "visitor_selected"}
          onChange={(v) => patchGeneral({ default_location_behavior: v as never })}
          options={[
            { value: "visitor_selected", label: "Use visitor selected location" },
            { value: "south-plainfield", label: "Default to South Plainfield" },
            { value: "prompt", label: "Prompt visitor to choose" },
          ]}
        />
      </div>
    </AdminCard>
  );
}

export function PersonalitySection({
  personality,
  setPersonality,
  permissions,
  disabled,
}: SectionProps & {
  personality: AIPersonalityRow;
  setPersonality: (p: AIPersonalityRow) => void;
}) {
  const ro = disabled || !permissions.canEditPersonality;
  return (
    <AdminCard id="ai-section-personality" className="ai-concierge-section">
      <SectionHeader title="Personality" description="Cheffy's voice, greetings, and hospitality tone." />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminInput label="Assistant Name" value={personality.assistant_name} onChange={(e) => setPersonality({ ...personality, assistant_name: e.target.value })} disabled={ro} />
        <AdminSelect label="Restaurant Tone" value={personality.tone} onChange={(v) => setPersonality({ ...personality, tone: v as AIPersonalityRow["tone"] })} options={[
          { value: "friendly", label: "Friendly" },
          { value: "professional", label: "Professional" },
          { value: "luxury", label: "Luxury" },
          { value: "casual", label: "Casual" },
          { value: "family", label: "Family" },
        ]} />
        <AdminSelect label="Emoji Level" value={personality.emoji_level} onChange={(v) => setPersonality({ ...personality, emoji_level: v as AIPersonalityRow["emoji_level"] })} options={[
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]} />
      </div>
      <div className="mt-4 grid gap-4">
        <AdminTextarea label="Greeting Message" value={personality.greeting_message ?? ""} onChange={(e) => setPersonality({ ...personality, greeting_message: e.target.value })} rows={2} disabled={ro} />
        <AdminTextarea label="Welcome Back Message" value={personality.welcome_back_message ?? ""} onChange={(e) => setPersonality({ ...personality, welcome_back_message: e.target.value })} rows={2} disabled={ro} />
        <AdminTextarea label="Farewell Message" value={personality.farewell_message ?? ""} onChange={(e) => setPersonality({ ...personality, farewell_message: e.target.value })} rows={2} disabled={ro} />
      </div>
    </AdminCard>
  );
}

export function KnowledgeSection({
  settings,
  setSettings,
  permissions,
  disabled,
  onRefresh,
}: SectionProps & {
  settings: AISettingsRow;
  setSettings: (s: AISettingsRow) => void;
  onRefresh: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const patchKnowledge = (patch: Partial<AISettingsRow["knowledge"]>) =>
    setSettings({ ...settings, knowledge: { ...settings.knowledge, ...patch } });

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await markKnowledgeSync(settings.location_id, "healthy");
      onRefresh();
    } finally {
      setSyncing(false);
    }
  };

  const statusBadge = settings.knowledge_status === "healthy" ? "success" : settings.knowledge_status === "error" ? "danger" : "warning";

  return (
    <AdminCard id="ai-section-knowledge" className="ai-concierge-section">
      <SectionHeader title="Knowledge" description="Control which CMS modules Cheffy can access." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminBadge variant={statusBadge}>{settings.knowledge_status}</AdminBadge>
        <span className="text-sm text-admin-muted">
          Last sync: {settings.knowledge_last_sync_at ? new Date(settings.knowledge_last_sync_at).toLocaleString() : "Never"}
        </span>
        <AdminButton variant="secondary" size="sm" onClick={() => void handleRefresh()} disabled={syncing || disabled || !permissions.canEditKnowledge}>
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Refresh Knowledge
        </AdminButton>
      </div>
      <div className="grid gap-1 md:grid-cols-2">
        {([
          ["homepage", "Homepage"],
          ["offers", "Offers"],
          ["gallery", "Gallery"],
          ["reviews", "Reviews"],
          ["seo", "SEO"],
          ["restaurant_settings", "Restaurant Settings"],
          ["menu", "Menu (future)"],
          ["reservations", "Reservations (future)"],
          ["chefgaa", "ChefGaa (future)"],
        ] as const).map(([key, label]) => (
          <ToggleRow
            key={key}
            label={label}
            checked={!!settings.knowledge[key]}
            onChange={(v) => patchKnowledge({ [key]: v })}
            disabled={disabled || !permissions.canEditKnowledge || key === "menu" || key === "reservations" || key === "chefgaa"}
          />
        ))}
      </div>
    </AdminCard>
  );
}

export function ProviderSection({
  provider,
  setProvider,
  permissions,
  disabled,
}: SectionProps & {
  provider: AIProviderSettingsRow;
  setProvider: (p: AIProviderSettingsRow) => void;
}) {
  const ro = disabled || !permissions.canEditProvider;
  return (
    <AdminCard id="ai-section-providers" className="ai-concierge-section">
      <SectionHeader title="AI Provider" description="Model parameters — API keys remain in secure environment variables." />
      <div className="mb-4 flex items-center gap-2">
        <AdminBadge variant="success">{provider.provider}</AdminBadge>
        <AdminBadge variant={provider.status === "active" ? "outline" : "warning"}>{provider.status}</AdminBadge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminSelect label="Provider" value={provider.provider} onChange={(v) => setProvider({ ...provider, provider: v as AIProviderSettingsRow["provider"] })} options={[
          { value: "gemini", label: "Gemini (active)" },
          { value: "openai", label: "OpenAI (future)" },
          { value: "claude", label: "Claude (future)" },
          { value: "mock", label: "Mock" },
        ]} />
        <AdminInput label="Model" value={provider.model ?? ""} placeholder="Auto from env" onChange={(e) => setProvider({ ...provider, model: e.target.value || null })} disabled={ro} />
        <AdminInput label="Temperature" type="number" step="0.01" value={provider.temperature} onChange={(e) => setProvider({ ...provider, temperature: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Top P" type="number" step="0.01" value={provider.top_p} onChange={(e) => setProvider({ ...provider, top_p: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Top K" type="number" value={provider.top_k} onChange={(e) => setProvider({ ...provider, top_k: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Max Output Tokens" type="number" value={provider.max_output_tokens} onChange={(e) => setProvider({ ...provider, max_output_tokens: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Retry Count" type="number" value={provider.retry_count} onChange={(e) => setProvider({ ...provider, retry_count: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Timeout (ms)" type="number" value={provider.timeout_ms} onChange={(e) => setProvider({ ...provider, timeout_ms: Number(e.target.value) })} disabled={ro} />
      </div>
      <div className="mt-4">
        <ToggleRow label="Streaming" checked={provider.streaming_enabled} onChange={(v) => setProvider({ ...provider, streaming_enabled: v })} disabled={ro} />
      </div>
    </AdminCard>
  );
}

export function PromptSection({
  activePrompt,
  defaultPrompt,
  onSave,
  permissions,
  disabled,
}: SectionProps & {
  activePrompt: AIPromptVersionRow | null;
  defaultPrompt: string;
  onSave: (content: string, version: string, notes: string) => Promise<void>;
}) {
  const [content, setContent] = useState(activePrompt?.content ?? defaultPrompt);
  const [version, setVersion] = useState(activePrompt?.version ?? `v${new Date().toISOString().slice(0, 10)}`);
  const [notes, setNotes] = useState(activePrompt?.notes ?? "");
  const ro = disabled || !permissions.canEditPrompt;

  useEffect(() => {
    setContent(activePrompt?.content ?? defaultPrompt);
    if (activePrompt?.version) setVersion(activePrompt.version);
    setNotes(activePrompt?.notes ?? "");
  }, [activePrompt, defaultPrompt]);

  return (
    <AdminCard id="ai-section-prompt" className="ai-concierge-section">
      <SectionHeader title="System Prompt" description="Versioned prompt management with rollback support." />
      <div className="mb-3 flex flex-wrap gap-2">
        {PROMPT_VARIABLES.map((v) => (
          <AdminBadge key={v} variant="outline">{v}</AdminBadge>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <AdminInput label="Prompt Version" value={version} onChange={(e) => setVersion(e.target.value)} disabled={ro} />
        <AdminInput label="Prompt Notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={ro} />
      </div>
      <AdminTextarea label="System Prompt" value={content} onChange={(e) => setContent(e.target.value)} rows={12} disabled={ro} />
      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton disabled={ro} onClick={() => void onSave(content, version, notes)}>Save & Activate</AdminButton>
        <AdminButton variant="secondary" disabled={ro} onClick={() => setContent(defaultPrompt)}>Reset to Default</AdminButton>
      </div>
    </AdminCard>
  );
}

export function ConversationSection({
  settings,
  setSettings,
  permissions,
  disabled,
}: SectionProps & {
  settings: AISettingsRow;
  setSettings: (s: AISettingsRow) => void;
}) {
  const patch = (patch: Partial<AISettingsRow["conversation"]>) =>
    setSettings({ ...settings, conversation: { ...settings.conversation, ...patch } });
  const ro = disabled || !permissions.canEditConversation;

  return (
    <AdminCard id="ai-section-conversation" className="ai-concierge-section">
      <SectionHeader title="Conversation" description="Session memory, typing, and streaming behavior." />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminInput label="Session Timeout (minutes)" type="number" value={settings.conversation.session_timeout_minutes ?? 30} onChange={(e) => patch({ session_timeout_minutes: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Memory Length (turns)" type="number" value={settings.conversation.memory_length ?? 12} onChange={(e) => patch({ memory_length: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Maximum Messages" type="number" value={settings.conversation.max_messages ?? 40} onChange={(e) => patch({ max_messages: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Context Window" type="number" value={settings.conversation.context_window ?? 12} onChange={(e) => patch({ context_window: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Welcome Back Duration (minutes)" type="number" value={settings.conversation.welcome_back_duration_minutes ?? 30} onChange={(e) => patch({ welcome_back_duration_minutes: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Typing Delay (ms)" type="number" value={settings.conversation.typing_delay_ms ?? 550} onChange={(e) => patch({ typing_delay_ms: Number(e.target.value) })} disabled={ro} />
        <AdminSelect label="Streaming Speed" value={settings.conversation.streaming_speed ?? "normal"} onChange={(v) => patch({ streaming_speed: v as never })} options={[
          { value: "slow", label: "Slow" },
          { value: "normal", label: "Normal" },
          { value: "fast", label: "Fast" },
        ]} />
        <AdminSelect label="Conversation Reset" value={settings.conversation.conversation_reset ?? "manual"} onChange={(v) => patch({ conversation_reset: v as never })} options={[
          { value: "manual", label: "Manual" },
          { value: "session", label: "Per session" },
          { value: "daily", label: "Daily" },
        ]} />
      </div>
      <div className="mt-4">
        <SectionHeader title="Recommendations" description="Toggle recommendation card types." />
        <div className="grid gap-1 md:grid-cols-2">
          {([
            ["family", "Family"],
            ["vegetarian", "Vegetarian"],
            ["spicy", "Spicy"],
            ["kids", "Kids"],
            ["budget", "Budget"],
            ["celebration", "Celebration"],
            ["office_lunch", "Office Lunch"],
            ["menu_recommendations", "Menu (future)"],
          ] as const).map(([key, label]) => (
            <ToggleRow key={key} label={label} checked={!!settings.recommendations[key]} onChange={(v) => setSettings({ ...settings, recommendations: { ...settings.recommendations, [key]: v } })} disabled={ro || key === "menu_recommendations"} />
          ))}
        </div>
      </div>
    </AdminCard>
  );
}

export function SuggestionsSection({
  suggestions,
  followups,
  onReload,
  permissions,
  disabled,
}: SectionProps & {
  suggestions: AISuggestedQuestionRow[];
  followups: AIFollowupRow[];
  onReload: () => void;
}) {
  const ro = disabled || !permissions.canEditSuggestions;

  const moveSuggestion = async (id: string, dir: -1 | 1) => {
    const sorted = [...suggestions].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sorted.length) return;
    [sorted[idx], sorted[swap]] = [sorted[swap], sorted[idx]];
    await reorderSuggestedQuestions(sorted.map((s) => s.id));
    onReload();
  };

  return (
    <AdminCard id="ai-section-suggestions" className="ai-concierge-section">
      <SectionHeader title="Suggestions" description="Quick chips, homepage prompts, and follow-up questions." />
      <h3 className="text-sm font-semibold mb-2">Quick Action Chips</h3>
      <div className="space-y-2 mb-6">
        {[...suggestions].sort((a, b) => a.sort_order - b.sort_order).map((row) => (
          <div key={row.id} className="flex items-center gap-2 rounded-lg border border-admin-border/50 p-2">
            <AdminToggle checked={row.enabled} onChange={(v) => void upsertSuggestedQuestion({ ...row, enabled: v }).then(onReload)} />
            <span className="flex-1 text-sm">{row.label}</span>
            <AdminButton variant="ghost" size="sm" disabled={ro} onClick={() => void moveSuggestion(row.id, -1)}><ChevronUp size={14} /></AdminButton>
            <AdminButton variant="ghost" size="sm" disabled={ro} onClick={() => void moveSuggestion(row.id, 1)}><ChevronDown size={14} /></AdminButton>
            <AdminButton variant="ghost" size="sm" disabled={ro} onClick={() => void deleteSuggestedQuestion(row.id).then(onReload)}>Delete</AdminButton>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-semibold mb-2">Follow-up Suggestions</h3>
      <div className="space-y-2">
        {followups.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-admin-border/50 p-2 text-sm">
            <span><AdminBadge variant="outline">{row.topic}</AdminBadge> {row.label}</span>
            <AdminToggle checked={row.enabled} onChange={(v) => void upsertFollowup({ ...row, enabled: v }).then(onReload)} />
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

export function AnalyticsSection({ analytics }: { analytics: AIAnalyticsSummary | null }) {
  if (!analytics) return null;
  const stats = [
    { label: "Total Conversations", value: String(analytics.totalConversations) },
    { label: "Today", value: String(analytics.todayConversations) },
    { label: "This Week", value: String(analytics.weeklyConversations) },
    { label: "This Month", value: String(analytics.monthlyConversations) },
    { label: "Avg Messages", value: String(analytics.avgMessageCount) },
    { label: "Avg Response", value: `${analytics.avgDurationMs} ms` },
  ];
  return (
    <AdminCard id="ai-section-analytics" className="ai-concierge-section">
      <SectionHeader title="Analytics" description="Conversation metrics from Cheffy logs." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <AdminCard key={stat.label}>
            <p className="text-sm text-admin-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </AdminCard>
        ))}
      </div>
      {analytics.topTools.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Top Tools Used</h3>
          <div className="flex flex-wrap gap-2">
            {analytics.topTools.map((t) => (
              <AdminBadge key={t.tool} variant="outline">{t.tool}: {t.count}</AdminBadge>
            ))}
          </div>
        </div>
      )}
    </AdminCard>
  );
}

export function TestingSection({
  locationId,
  permissions,
  disabled,
}: SectionProps & { locationId: LocationId }) {
  const [prompt, setPrompt] = useState("What offers do you have today?");
  const [result, setResult] = useState<Awaited<ReturnType<typeof runAISandbox>> | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runAISandbox({
        message: prompt,
        locationId,
        locationName: LOCATIONS[locationId].name,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sandbox failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <AdminCard id="ai-section-testing" className="ai-concierge-section">
      <SectionHeader title="Testing Playground" description="Sandbox — does not modify production guest conversations." />
      <AdminTextarea label="Test Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} disabled={disabled || !permissions.canRunSandbox} />
      <AdminButton className="mt-3" onClick={() => void run()} disabled={running || disabled || !permissions.canRunSandbox}>
        {running ? "Running…" : "Run Sandbox Test"}
      </AdminButton>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <AdminBadge variant="outline">Provider: {result.provider}</AdminBadge>
            <AdminBadge variant="outline">Model: {result.model}</AdminBadge>
            <AdminBadge variant="success">Latency: {result.latencyMs}ms</AdminBadge>
          </div>
          <AdminCard><strong>Response</strong><p className="mt-2 whitespace-pre-wrap">{result.content}</p></AdminCard>
          <details><summary className="cursor-pointer font-medium">Tools Executed ({result.toolResults.length})</summary><pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result.toolResults, null, 2)}</pre></details>
          <details><summary className="cursor-pointer font-medium">Context Sent</summary><pre className="mt-2 overflow-auto text-xs">{JSON.stringify({ cmsContext: result.cmsContext, session: result.session }, null, 2)}</pre></details>
        </div>
      )}
    </AdminCard>
  );
}

export function LogsSection({ permissions }: SectionProps) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listConversationLogs>>["rows"]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listConversationLogs({ search, page: 1, pageSize: 50 });
    setRows(data.rows);
    setLoading(false);
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const columns: TableColumn<(typeof rows)[number]>[] = useMemo(
    () => [
      { key: "conversation_id", label: "Conversation ID", render: (r) => r.conversation_id.slice(0, 12) + "…" },
      { key: "location_id", label: "Location", render: (r) => r.location_id ?? "—" },
      { key: "provider", label: "Provider", render: (r) => r.provider ?? "—" },
      { key: "message_count", label: "Messages", render: (r) => String(r.message_count) },
      { key: "tool_call_count", label: "Tools", render: (r) => String(r.tool_call_count) },
      { key: "duration_ms", label: "Duration", render: (r) => (r.duration_ms != null ? `${r.duration_ms}ms` : "—") },
      { key: "started_at", label: "Started", render: (r) => new Date(r.started_at).toLocaleString() },
    ],
    [],
  );

  return (
    <AdminCard id="ai-section-logs" className="ai-concierge-section">
      <SectionHeader title="Conversation Logs" description="No PII, prompts, or API keys are stored." />
      <div className="mb-4 flex flex-wrap gap-2">
        <AdminInput label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <AdminButton variant="secondary" onClick={() => void load()}>Search</AdminButton>
        {permissions.canExportLogs && (
          <>
            <AdminButton variant="secondary" onClick={() => exportRowsCsv(rows as never[], "cheffy-conversations.csv")}>Export CSV</AdminButton>
            <AdminButton variant="secondary" onClick={() => exportRowsJson(rows, "cheffy-conversations.json")}>Export JSON</AdminButton>
          </>
        )}
      </div>
      <DataTable columns={columns as unknown as TableColumn<Record<string, unknown>>[]} data={rows as unknown as Record<string, unknown>[]} loading={loading} emptyTitle="No conversation logs yet." hideToolbar />
    </AdminCard>
  );
}

export function ErrorLogsSection({ permissions }: SectionProps) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listErrorLogs>>["rows"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listErrorLogs().then((d) => { setRows(d.rows); setLoading(false); });
  }, []);

  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "error_type", label: "Type", render: (r) => r.error_type },
    { key: "provider", label: "Provider", render: (r) => r.provider ?? "—" },
    { key: "location_id", label: "Location", render: (r) => r.location_id ?? "—" },
    { key: "message", label: "Message", render: (r) => r.message },
    { key: "retried", label: "Retried", render: (r) => (r.retried ? "Yes" : "No") },
    { key: "created_at", label: "Time", render: (r) => new Date(r.created_at).toLocaleString() },
  ];

  return (
    <AdminCard id="ai-section-errors" className="ai-concierge-section">
      <SectionHeader title="Error Logs" description="Provider, tool, timeout, and streaming errors." />
      <DataTable columns={columns as unknown as TableColumn<Record<string, unknown>>[]} data={rows as unknown as Record<string, unknown>[]} loading={loading} emptyTitle="No errors logged." hideToolbar />
      {permissions.canRetryErrors && rows.length > 0 && (
        <AdminButton variant="secondary" className="mt-3" onClick={() => void listErrorLogs().then((d) => setRows(d.rows))}>Refresh</AdminButton>
      )}
    </AdminCard>
  );
}

export function AdvancedSection({
  settings,
  setSettings,
  permissions,
  disabled,
}: SectionProps & {
  settings: AISettingsRow;
  setSettings: (s: AISettingsRow) => void;
}) {
  const patch = (patch: Partial<AISettingsRow["advanced"]>) =>
    setSettings({ ...settings, advanced: { ...settings.advanced, ...patch } });
  const ro = disabled || !permissions.canEditAdvanced;

  return (
    <AdminCard id="ai-section-advanced" className="ai-concierge-section">
      <SectionHeader title="Advanced" description="Cache, retries, failover, and experimental features." />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminInput label="Cache Duration (seconds)" type="number" value={settings.advanced.cache_duration_seconds ?? 60} onChange={(e) => patch({ cache_duration_seconds: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Retry Attempts" type="number" value={settings.advanced.retry_attempts ?? 1} onChange={(e) => patch({ retry_attempts: Number(e.target.value) })} disabled={ro} />
        <AdminInput label="Streaming Buffer (ms)" type="number" value={settings.advanced.streaming_buffer_ms ?? 50} onChange={(e) => patch({ streaming_buffer_ms: Number(e.target.value) })} disabled={ro} />
      </div>
      <div className="mt-4 grid gap-1">
        <ToggleRow label="Provider Failover (future)" checked={!!settings.advanced.provider_failover} onChange={(v) => patch({ provider_failover: v })} disabled={ro} />
        <ToggleRow label="Experimental Features" checked={!!settings.advanced.experimental_features} onChange={(v) => patch({ experimental_features: v })} disabled={ro} />
      </div>
    </AdminCard>
  );
}

export function LocationOverridesSection({
  personality,
  setPersonality,
  permissions,
  disabled,
}: SectionProps & {
  personality: AIPersonalityRow;
  setPersonality: (p: AIPersonalityRow) => void;
}) {
  const ro = disabled || !permissions.canEditPersonality;
  const overrides = (personality.location_overrides ?? {}) as Record<string, { greeting?: string; offers?: string }>;

  const patchLocation = (loc: LocationId, field: "greeting" | "offers", value: string) => {
    setPersonality({
      ...personality,
      location_overrides: {
        ...overrides,
        [loc]: { ...overrides[loc], [field]: value },
      },
    });
  };

  return (
    <AdminCard id="ai-section-location" className="ai-concierge-section">
      <SectionHeader title="Location Overrides" description="Per-outlet greetings and suggestions — never mixed between locations." />
      <div className="grid gap-6">
        {(Object.keys(LOCATIONS) as LocationId[]).map((loc) => (
          <div key={loc} className="rounded-xl border border-admin-border/40 p-4">
            <h3 className="font-semibold mb-3">{LOCATIONS[loc].name}</h3>
            <div className="grid gap-3">
              <AdminTextarea label="Custom Greeting" value={overrides[loc]?.greeting ?? ""} onChange={(e) => patchLocation(loc, "greeting", e.target.value)} rows={2} disabled={ro} />
              <AdminInput label="Offers Hint" value={overrides[loc]?.offers ?? ""} onChange={(e) => patchLocation(loc, "offers", e.target.value)} disabled={ro} placeholder="Optional location-specific offers note" />
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}
