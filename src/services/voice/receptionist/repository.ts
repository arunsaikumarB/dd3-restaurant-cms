/* eslint-disable @typescript-eslint/no-explicit-any */
import { voiceTable, nowIso } from "../client";
import type {
  CallSummary,
  HospitalityProfile,
  PersonalityProfile,
  SilenceRules,
} from "./types";

export async function listGreetingTemplates(locationId: string) {
  const t = voiceTable("voice_greetings");
  if (!t) return [];
  const { data } = await t.select("*").eq("location_id", locationId).eq("active", true);
  return data ?? [];
}

export async function upsertGreetingTemplate(input: {
  locationId: string;
  code: string;
  language: string;
  template: string;
  timeOfDay?: string | null;
  returningCustomer?: boolean;
  holidayKey?: string | null;
  festivalKey?: string | null;
  eventKey?: string | null;
}) {
  const t = voiceTable("voice_greetings");
  if (!t) return null;
  const { data } = await t
    .upsert(
      {
        location_id: input.locationId,
        code: input.code,
        language: input.language,
        template: input.template,
        time_of_day: input.timeOfDay ?? null,
        returning_customer: input.returningCustomer ?? false,
        holiday_key: input.holidayKey ?? null,
        festival_key: input.festivalKey ?? null,
        event_key: input.eventKey ?? null,
        active: true,
        updated_at: nowIso(),
      },
      { onConflict: "location_id,code,language" },
    )
    .select("*")
    .single();
  return data;
}

export async function getPersonality(locationId: string): Promise<PersonalityProfile | null> {
  const t = voiceTable("voice_personality");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  if (!data) return null;
  return {
    locationId: data.location_id,
    speakingSpeed: Number(data.speaking_speed ?? 1),
    pauseDurationMs: Number(data.pause_duration_ms ?? 350),
    greetingStyle: data.greeting_style ?? "warm",
    closingStyle: data.closing_style ?? "grateful",
    energyLevel: data.energy_level ?? "balanced",
    hospitalityTone: data.hospitality_tone ?? "warm_professional",
  };
}

export async function upsertPersonality(
  locationId: string,
  patch: Partial<Omit<PersonalityProfile, "locationId">>,
): Promise<PersonalityProfile | null> {
  const t = voiceTable("voice_personality");
  if (!t) return null;
  const existing = await getPersonality(locationId);
  const { data } = await t
    .upsert(
      {
        location_id: locationId,
        speaking_speed: patch.speakingSpeed ?? existing?.speakingSpeed ?? 1,
        pause_duration_ms: patch.pauseDurationMs ?? existing?.pauseDurationMs ?? 350,
        greeting_style: patch.greetingStyle ?? existing?.greetingStyle ?? "warm",
        closing_style: patch.closingStyle ?? existing?.closingStyle ?? "grateful",
        energy_level: patch.energyLevel ?? existing?.energyLevel ?? "balanced",
        hospitality_tone: patch.hospitalityTone ?? existing?.hospitalityTone ?? "warm_professional",
        updated_at: nowIso(),
      },
      { onConflict: "location_id" },
    )
    .select("*")
    .single();
  if (!data) return null;
  return getPersonality(locationId);
}

export async function getHospitality(locationId: string): Promise<HospitalityProfile | null> {
  const t = voiceTable("voice_hospitality");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  if (!data) return null;
  return {
    locationId: data.location_id,
    restaurantBrand: data.restaurant_brand ?? "Desi Dhamaka",
    assistantName: data.assistant_name ?? "Cheffy",
    namasteEnabled: data.namaste_enabled !== false,
    neverRobotic: data.never_robotic !== false,
    confirmUnderstanding: data.confirm_understanding !== false,
    reservationDeferralMessage:
      data.reservation_deferral_message ??
      "I can share hours, directions, and menu details. Booking will be handled shortly.",
    closingMessage:
      data.closing_message ??
      "Thank you for calling Desi Dhamaka. We look forward to welcoming you soon!",
  };
}

export async function upsertHospitality(
  locationId: string,
  patch: Partial<Omit<HospitalityProfile, "locationId">>,
): Promise<HospitalityProfile | null> {
  const t = voiceTable("voice_hospitality");
  if (!t) return null;
  const existing = await getHospitality(locationId);
  await t.upsert(
    {
      location_id: locationId,
      restaurant_brand: patch.restaurantBrand ?? existing?.restaurantBrand ?? "Desi Dhamaka",
      assistant_name: patch.assistantName ?? existing?.assistantName ?? "Cheffy",
      namaste_enabled: patch.namasteEnabled ?? existing?.namasteEnabled ?? true,
      never_robotic: patch.neverRobotic ?? existing?.neverRobotic ?? true,
      confirm_understanding: patch.confirmUnderstanding ?? existing?.confirmUnderstanding ?? true,
      reservation_deferral_message:
        patch.reservationDeferralMessage ?? existing?.reservationDeferralMessage ?? "",
      closing_message: patch.closingMessage ?? existing?.closingMessage ?? "",
      updated_at: nowIso(),
    },
    { onConflict: "location_id" },
  );
  return getHospitality(locationId);
}

export async function getSilenceRules(locationId: string): Promise<SilenceRules | null> {
  const t = voiceTable("voice_silence_rules");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  if (!data) return null;
  return {
    locationId: data.location_id,
    prompt5s: data.prompt_5s,
    prompt10s: data.prompt_10s,
    prompt20s: data.prompt_20s,
    softPromptMs: Number(data.soft_prompt_ms ?? 5000),
    holdPromptMs: Number(data.hold_prompt_ms ?? 10000),
    endAfterMs: Number(data.end_after_ms ?? 20000),
  };
}

export async function upsertSilenceRules(
  locationId: string,
  patch: Partial<Omit<SilenceRules, "locationId">>,
): Promise<SilenceRules | null> {
  const t = voiceTable("voice_silence_rules");
  if (!t) return null;
  const existing = await getSilenceRules(locationId);
  await t.upsert(
    {
      location_id: locationId,
      prompt_5s: patch.prompt5s ?? existing?.prompt5s ?? "Are you still there?",
      prompt_10s: patch.prompt10s ?? existing?.prompt10s ?? "I'll stay on the line if you need a moment.",
      prompt_20s:
        patch.prompt20s ??
        existing?.prompt20s ??
        "I'll go ahead and end the call for now. Feel free to call us back anytime.",
      soft_prompt_ms: patch.softPromptMs ?? existing?.softPromptMs ?? 5000,
      hold_prompt_ms: patch.holdPromptMs ?? existing?.holdPromptMs ?? 10000,
      end_after_ms: patch.endAfterMs ?? existing?.endAfterMs ?? 20000,
      updated_at: nowIso(),
    },
    { onConflict: "location_id" },
  );
  return getSilenceRules(locationId);
}

export async function listEnabledLanguages(locationId: string) {
  const t = voiceTable("voice_languages");
  if (!t) return [{ language_code: "en", label: "English", enabled: true }];
  const { data } = await t.select("*").eq("location_id", locationId).eq("enabled", true);
  return data ?? [];
}

export async function insertCallSummary(input: {
  sessionId: string;
  locationId: string;
  summary: string;
  topics: string[];
  detectedIntents: string[];
  knowledgeUsed: string[];
  plannerGoal?: string | null;
  durationMs: number;
  language?: string | null;
  sentiment?: string | null;
  escalationRecommendation?: string | null;
}): Promise<CallSummary | null> {
  const t = voiceTable("voice_call_summaries");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      location_id: input.locationId,
      summary: input.summary,
      topics: input.topics,
      detected_intents: input.detectedIntents,
      knowledge_used: input.knowledgeUsed,
      planner_goal: input.plannerGoal ?? null,
      duration_ms: input.durationMs,
      language: input.language ?? null,
      sentiment: input.sentiment ?? null,
      escalation_recommendation: input.escalationRecommendation ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapSummary(data);
}

export async function listCallSummaries(locationId: string, limit = 50): Promise<CallSummary[]> {
  const t = voiceTable("voice_call_summaries");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapSummary);
}

export async function getCallSummaryForSession(sessionId: string): Promise<CallSummary | null> {
  const t = voiceTable("voice_call_summaries");
  if (!t) return null;
  const { data } = await t.select("*").eq("session_id", sessionId).maybeSingle();
  return data ? mapSummary(data) : null;
}

function mapSummary(r: any): CallSummary {
  return {
    id: r.id,
    sessionId: r.session_id,
    locationId: r.location_id,
    summary: r.summary,
    topics: Array.isArray(r.topics) ? r.topics : [],
    detectedIntents: Array.isArray(r.detected_intents) ? r.detected_intents : [],
    knowledgeUsed: Array.isArray(r.knowledge_used) ? r.knowledge_used : [],
    plannerGoal: r.planner_goal ?? null,
    durationMs: Number(r.duration_ms ?? 0),
    language: r.language ?? null,
    sentiment: r.sentiment ?? null,
    escalationRecommendation: r.escalation_recommendation ?? null,
    createdAt: r.created_at,
  };
}

export async function upsertConversationMetrics(input: {
  sessionId: string;
  locationId: string;
  turns: number;
  interruptions: number;
  silencePrompts: number;
  misunderstandings: number;
  languageSwitches: number;
  repeatRequests: number;
}): Promise<void> {
  const t = voiceTable("voice_conversation_metrics");
  if (!t) return;
  await t.insert({
    session_id: input.sessionId,
    location_id: input.locationId,
    turns: input.turns,
    interruptions: input.interruptions,
    silence_prompts: input.silencePrompts,
    misunderstandings: input.misunderstandings,
    language_switches: input.languageSwitches,
    repeat_requests: input.repeatRequests,
  });
}
