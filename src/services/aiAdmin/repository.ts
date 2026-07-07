/**
 * Supabase CRUD for AI Concierge admin tables (migration 032).
 * Application code only — never run this file in the Supabase SQL Editor.
 * Database schema: supabase/migrations/032_ai_management.sql
 */
import { createClientIfConfigured, createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import type {
  AIAnalyticsSummary,
  AIConversationLogRow,
  AIErrorLogRow,
  AIFollowupRow,
  AIPersonalityRow,
  AIPromptVersionRow,
  AIProviderSettingsRow,
  AISettingsRow,
  AISuggestedQuestionRow,
  AIToolLogRow,
  AISandboxResult,
} from "../../types/aiAdmin";
import {
  createDefaultPersonalityRow,
  createDefaultProviderRow,
  createDefaultSettingsRow,
  DEFAULT_SYSTEM_PROMPT,
} from "./defaults";

function client() {
  const supabase = createClientIfConfigured();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

/** Supabase client scoped to AI admin tables (migration 032). */
function aiTable(name: string) {
  // Tables are added in migration 032; cast until database.ts is extended.
  return (client() as unknown as { from: (table: string) => ReturnType<ReturnType<typeof createClient>["from"]> }).from(name);
}

const memory = {
  settings: createDefaultSettingsRow(null),
  personality: createDefaultPersonalityRow(null),
  provider: createDefaultProviderRow(),
  prompts: [] as AIPromptVersionRow[],
  suggestions: [] as AISuggestedQuestionRow[],
  followups: [] as AIFollowupRow[],
  conversationLogs: [] as AIConversationLogRow[],
  toolLogs: [] as AIToolLogRow[],
  errorLogs: [] as AIErrorLogRow[],
};

function mapSettings(row: Record<string, unknown>): AISettingsRow {
  return row as unknown as AISettingsRow;
}

export async function fetchAISettings(locationId: string | null = null): Promise<AISettingsRow> {
  if (!isSupabaseConfigured()) return { ...memory.settings, location_id: locationId };

  let query = aiTable("ai_settings").select("*");
  query = locationId ? query.eq("location_id", locationId) : query.is("location_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (data) return mapSettings(data);

  const seed = createDefaultSettingsRow(locationId);
  const { data: inserted, error: insertError } = await aiTable("ai_settings")
    .insert(seed)
    .select("*")
    .single();
  if (insertError) throw insertError;
  return mapSettings(inserted);
}

export async function saveAISettings(
  settings: AISettingsRow,
  userId?: string | null,
): Promise<AISettingsRow> {
  if (!isSupabaseConfigured()) {
    memory.settings = settings;
    return settings;
  }

  const payload = {
    ...settings,
    updated_by: userId ?? settings.updated_by,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await aiTable("ai_settings")
    .update(payload)
    .eq("id", settings.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapSettings(data);
}

export async function fetchAIPersonality(locationId: string | null = null): Promise<AIPersonalityRow> {
  if (!isSupabaseConfigured()) return { ...memory.personality, location_id: locationId };

  let query = aiTable("ai_personality").select("*");
  query = locationId ? query.eq("location_id", locationId) : query.is("location_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (data) return data as AIPersonalityRow;

  const seed = createDefaultPersonalityRow(locationId);
  const { data: inserted, error: insertError } = await aiTable("ai_personality")
    .insert(seed)
    .select("*")
    .single();
  if (insertError) throw insertError;
  return inserted as AIPersonalityRow;
}

export async function saveAIPersonality(
  personality: AIPersonalityRow,
  userId?: string | null,
): Promise<AIPersonalityRow> {
  if (!isSupabaseConfigured()) {
    memory.personality = personality;
    return personality;
  }

  const { data, error } = await aiTable("ai_personality")
    .update({ ...personality, updated_by: userId ?? personality.updated_by })
    .eq("id", personality.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AIPersonalityRow;
}

export async function fetchAIProviderSettings(): Promise<AIProviderSettingsRow> {
  if (!isSupabaseConfigured()) return memory.provider;

  const { data, error } = await aiTable("ai_provider_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as AIProviderSettingsRow;

  const seed = createDefaultProviderRow();
  const { data: inserted, error: insertError } = await aiTable("ai_provider_settings")
    .insert(seed)
    .select("*")
    .single();
  if (insertError) throw insertError;
  return inserted as AIProviderSettingsRow;
}

export async function saveAIProviderSettings(
  provider: AIProviderSettingsRow,
  userId?: string | null,
): Promise<AIProviderSettingsRow> {
  if (!isSupabaseConfigured()) {
    memory.provider = provider;
    return provider;
  }

  const { data, error } = await aiTable("ai_provider_settings")
    .update({ ...provider, updated_by: userId ?? provider.updated_by })
    .eq("id", provider.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AIProviderSettingsRow;
}

export async function listPromptVersions(): Promise<AIPromptVersionRow[]> {
  if (!isSupabaseConfigured()) return memory.prompts;

  const { data, error } = await aiTable("ai_prompt_versions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AIPromptVersionRow[];
}

export async function fetchActivePrompt(): Promise<AIPromptVersionRow | null> {
  const versions = await listPromptVersions();
  const active = versions.find((v) => v.is_active);
  if (active) return active;
  if (!isSupabaseConfigured()) return null;

  const { data } = await aiTable("ai_prompt_versions")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  return (data as AIPromptVersionRow | null) ?? null;
}

export async function savePromptVersion(
  input: Pick<AIPromptVersionRow, "version" | "content" | "notes" | "is_active">,
  userId?: string | null,
): Promise<AIPromptVersionRow> {
  if (input.is_active && isSupabaseConfigured()) {
    await aiTable("ai_prompt_versions").update({ is_active: false }).eq("is_active", true);
  }

  const row: AIPromptVersionRow = {
    id: crypto.randomUUID(),
    version: input.version,
    content: input.content,
    notes: input.notes ?? null,
    is_active: input.is_active,
    created_by: userId ?? null,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    if (row.is_active) memory.prompts = memory.prompts.map((p) => ({ ...p, is_active: false }));
    memory.prompts.unshift(row);
    return row;
  }

  const { data, error } = await aiTable("ai_prompt_versions").insert(row).select("*").single();
  if (error) throw error;
  return data as AIPromptVersionRow;
}

export function getDefaultPromptContent(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

export async function listSuggestedQuestions(
  category?: string,
  locationId?: string | null,
): Promise<AISuggestedQuestionRow[]> {
  if (!isSupabaseConfigured()) {
    return memory.suggestions.filter(
      (s) => (!category || s.category === category) && (locationId == null || s.location_id === locationId),
    );
  }

  let query = aiTable("ai_suggested_questions").select("*").order("sort_order");
  if (category) query = query.eq("category", category);
  if (locationId) query = query.eq("location_id", locationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AISuggestedQuestionRow[];
}

export async function upsertSuggestedQuestion(
  row: Partial<AISuggestedQuestionRow> & Pick<AISuggestedQuestionRow, "label" | "prompt" | "category">,
): Promise<AISuggestedQuestionRow> {
  const payload = {
    id: row.id ?? crypto.randomUUID(),
    location_id: row.location_id ?? null,
    category: row.category,
    label: row.label,
    prompt: row.prompt,
    emoji: row.emoji ?? null,
    sort_order: row.sort_order ?? 0,
    enabled: row.enabled ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const idx = memory.suggestions.findIndex((s) => s.id === payload.id);
    if (idx >= 0) memory.suggestions[idx] = { ...memory.suggestions[idx], ...payload };
    else memory.suggestions.push(payload as AISuggestedQuestionRow);
    return payload as AISuggestedQuestionRow;
  }

  const { data, error } = await aiTable("ai_suggested_questions")
    .upsert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as AISuggestedQuestionRow;
}

export async function deleteSuggestedQuestion(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    memory.suggestions = memory.suggestions.filter((s) => s.id !== id);
    return;
  }
  const { error } = await aiTable("ai_suggested_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderSuggestedQuestions(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    ids.forEach((id, index) => {
      const row = memory.suggestions.find((s) => s.id === id);
      if (row) row.sort_order = index;
    });
    return;
  }
  await Promise.all(
    ids.map((id, sort_order) =>
      aiTable("ai_suggested_questions").update({ sort_order }).eq("id", id),
    ),
  );
}

export async function listFollowups(topic?: string): Promise<AIFollowupRow[]> {
  if (!isSupabaseConfigured()) {
    return memory.followups.filter((f) => !topic || f.topic === topic);
  }
  let query = aiTable("ai_followups").select("*").order("sort_order");
  if (topic) query = query.eq("topic", topic);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AIFollowupRow[];
}

export async function upsertFollowup(
  row: Partial<AIFollowupRow> & Pick<AIFollowupRow, "topic" | "label" | "prompt">,
): Promise<AIFollowupRow> {
  const payload = {
    id: row.id ?? crypto.randomUUID(),
    location_id: row.location_id ?? null,
    topic: row.topic,
    label: row.label,
    prompt: row.prompt,
    sort_order: row.sort_order ?? 0,
    enabled: row.enabled ?? true,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const idx = memory.followups.findIndex((f) => f.id === payload.id);
    if (idx >= 0) memory.followups[idx] = { ...memory.followups[idx], ...payload };
    else memory.followups.push(payload as AIFollowupRow);
    return payload as AIFollowupRow;
  }

  const { data, error } = await aiTable("ai_followups").upsert(payload).select("*").single();
  if (error) throw error;
  return data as AIFollowupRow;
}

export async function deleteFollowup(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    memory.followups = memory.followups.filter((f) => f.id !== id);
    return;
  }
  const { error } = await aiTable("ai_followups").delete().eq("id", id);
  if (error) throw error;
}

export async function markKnowledgeSync(
  locationId: string | null,
  status: AISettingsRow["knowledge_status"],
): Promise<void> {
  const settings = await fetchAISettings(locationId);
  settings.knowledge_last_sync_at = new Date().toISOString();
  settings.knowledge_status = status;
  await saveAISettings(settings);
}

export async function listConversationLogs(options: {
  page?: number;
  pageSize?: number;
  locationId?: string;
  search?: string;
}): Promise<{ rows: AIConversationLogRow[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!isSupabaseConfigured()) {
    let rows = [...memory.conversationLogs];
    if (options.locationId) rows = rows.filter((r) => r.location_id === options.locationId);
    if (options.search) {
      const q = options.search.toLowerCase();
      rows = rows.filter((r) => r.conversation_id.toLowerCase().includes(q));
    }
    return { rows: rows.slice(from, to + 1), total: rows.length };
  }

  let query = aiTable("ai_conversation_logs")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range(from, to);
  if (options.locationId) query = query.eq("location_id", options.locationId);
  if (options.search) query = query.ilike("conversation_id", `%${options.search}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as AIConversationLogRow[], total: count ?? 0 };
}

export async function listToolLogs(conversationLogId?: string): Promise<AIToolLogRow[]> {
  if (!isSupabaseConfigured()) {
    return memory.toolLogs.filter((t) => !conversationLogId || t.conversation_log_id === conversationLogId);
  }
  let query = aiTable("ai_tool_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (conversationLogId) query = query.eq("conversation_log_id", conversationLogId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AIToolLogRow[];
}

export async function listErrorLogs(page = 1, pageSize = 25): Promise<{ rows: AIErrorLogRow[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!isSupabaseConfigured()) {
    return { rows: memory.errorLogs.slice(from, to + 1), total: memory.errorLogs.length };
  }

  const { data, error, count } = await aiTable("ai_error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as AIErrorLogRow[], total: count ?? 0 };
}

export async function appendConversationLog(
  row: Omit<AIConversationLogRow, "id"> & { id?: string },
): Promise<AIConversationLogRow> {
  const payload: AIConversationLogRow = { id: row.id ?? crypto.randomUUID(), ...row } as AIConversationLogRow;
  if (!isSupabaseConfigured()) {
    memory.conversationLogs.unshift(payload);
    return payload;
  }
  const { data, error } = await aiTable("ai_conversation_logs").insert(payload).select("*").single();
  if (error) throw error;
  return data as AIConversationLogRow;
}

export async function appendErrorLog(
  row: Omit<AIErrorLogRow, "id" | "created_at">,
): Promise<void> {
  const payload = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    memory.errorLogs.unshift(payload);
    return;
  }
  const { error } = await aiTable("ai_error_logs").insert(payload);
  if (error) throw error;
}

export async function fetchAIAnalytics(): Promise<AIAnalyticsSummary> {
  const { rows } = await listConversationLogs({ page: 1, pageSize: 500 });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const today = rows.filter((r) => now - new Date(r.started_at).getTime() < day);
  const weekly = rows.filter((r) => now - new Date(r.started_at).getTime() < 7 * day);
  const monthly = rows.filter((r) => now - new Date(r.started_at).getTime() < 30 * day);

  const avgMessageCount =
    rows.length > 0 ? rows.reduce((s, r) => s + r.message_count, 0) / rows.length : 0;
  const durations = rows.filter((r) => r.duration_ms != null);
  const avgDurationMs =
    durations.length > 0 ? durations.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / durations.length : 0;

  const toolCounts = new Map<string, number>();
  const logs = await listToolLogs();
  for (const log of logs) {
    toolCounts.set(log.tool_name, (toolCounts.get(log.tool_name) ?? 0) + 1);
  }

  const locationCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.location_id) continue;
    locationCounts.set(row.location_id, (locationCounts.get(row.location_id) ?? 0) + 1);
  }

  return {
    totalConversations: rows.length,
    todayConversations: today.length,
    weeklyConversations: weekly.length,
    monthlyConversations: monthly.length,
    avgMessageCount: Math.round(avgMessageCount * 10) / 10,
    avgDurationMs: Math.round(avgDurationMs),
    topQuestions: [],
    topTools: [...toolCounts.entries()]
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topLocations: [...locationCounts.entries()]
      .map(([locationId, count]) => ({ locationId, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function runAISandbox(input: {
  message: string;
  locationId: string;
  locationName: string;
}): Promise<AISandboxResult> {
  const started = performance.now();
  const conversationId = `sandbox-${crypto.randomUUID()}`;

  const { buildCMSKnowledge } = await import("../cms/knowledge");
  const { enrichAIRequest } = await import("../ai/context");
  const { CONCIERGE_API_PATH } = await import("../ai/providers/providerTypes");

  const knowledge = await buildCMSKnowledge(input.locationId as never);
  const request = enrichAIRequest(
    { message: input.message, history: [], conversationId },
    knowledge,
  );

  const response = await fetch(CONCIERGE_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: request.message,
      history: [],
      cmsContext: request.cmsContext,
      toolResults: request.toolResults,
      session: request.session,
      conversationId,
      stream: false,
    }),
  });

  const latencyMs = Math.round(performance.now() - started);

  if (!response.ok) {
    await appendErrorLog({
      error_type: "provider",
      provider: "gemini",
      location_id: input.locationId,
      message: `Sandbox request failed (${response.status})`,
      retried: false,
      metadata: { sandbox: true },
    });
    throw new Error(`Sandbox request failed (${response.status})`);
  }

  const body = (await response.json()) as { content?: string; provider?: string; model?: string };

  await appendConversationLog({
    conversation_id: conversationId,
    location_id: input.locationId,
    provider: body.provider ?? "gemini",
    model: body.model ?? null,
    message_count: 2,
    tool_call_count: request.toolResults?.length ?? 0,
    duration_ms: latencyMs,
    error_count: 0,
    is_sandbox: true,
    metadata: { locationName: input.locationName },
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
  });

  return {
    content: body.content ?? "",
    provider: body.provider ?? "gemini",
    model: body.model ?? "default",
    latencyMs,
    toolResults: request.toolResults ?? [],
    cmsContext: request.cmsContext ?? {},
    session: request.session ?? {},
  };
}

export function exportRowsCsv<T extends Record<string, unknown>>(rows: T[], filename: string): void {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys.map((k) => JSON.stringify(row[k] ?? "")).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRowsJson<T>(rows: T[], filename: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
