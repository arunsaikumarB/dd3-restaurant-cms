import { crmTable } from "./client";
import { addTimelineEvent, listMemory, listPreferences } from "./crmRepository";

/** Write preference only if missing or new confidence is higher. */
export async function upsertPreference(input: {
  customerId: string;
  key: string;
  value: string;
  confidence?: number;
  source?: string;
}): Promise<void> {
  try {
    const t = crmTable("crm_preferences");
    if (!t) return;
    const confidence = input.confidence ?? 0.8;
    const { data: existing } = await t
      .select("confidence, preference_value")
      .eq("customer_id", input.customerId)
      .eq("preference_key", input.key)
      .maybeSingle();
    if (existing) {
      const row = existing as { confidence: number; preference_value: string | null };
      if (Number(row.confidence ?? 0) > confidence && row.preference_value) return;
    }
    await t.upsert(
      {
        customer_id: input.customerId,
        preference_key: input.key,
        preference_value: input.value,
        confidence,
        source: input.source ?? "inferred",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,preference_key" },
    );
  } catch {
    /* optional */
  }
}

export async function upsertMemory(input: {
  customerId: string;
  key: string;
  value: Record<string, unknown>;
  confidence?: number;
  source?: string;
}): Promise<void> {
  try {
    const t = crmTable("crm_memory");
    if (!t) return;
    const confidence = input.confidence ?? 0.75;
    const { data: existing } = await t
      .select("confidence")
      .eq("customer_id", input.customerId)
      .eq("memory_key", input.key)
      .maybeSingle();
    if (existing && Number((existing as { confidence: number }).confidence ?? 0) > confidence) return;
    await t.upsert(
      {
        customer_id: input.customerId,
        memory_key: input.key,
        memory_value: input.value,
        confidence,
        source: input.source ?? "inferred",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,memory_key" },
    );
  } catch {
    /* optional */
  }
}

/** Infer preferences from free text / reservation payload without overwriting stronger facts. */
export async function learnFromText(customerId: string, text: string, source = "conversation"): Promise<string[]> {
  const learned: string[] = [];
  const q = text.toLowerCase();

  const rules: Array<{ re: RegExp; key: string; value: string; confidence: number }> = [
    { re: /\bvegetarian\b/, key: "dietary", value: "vegetarian", confidence: 0.9 },
    { re: /\bvegan\b/, key: "dietary", value: "vegan", confidence: 0.9 },
    { re: /\bjain\b/, key: "dietary", value: "jain", confidence: 0.9 },
    { re: /\bspicy\b/, key: "spice_level", value: "high", confidence: 0.7 },
    { re: /\bmild\b/, key: "spice_level", value: "mild", confidence: 0.7 },
    { re: /\ballerg(?:y|ies|ic)\b/, key: "allergies", value: "mentioned", confidence: 0.6 },
    { re: /\bhigh\s*chair\b|\bkids?\b|\bchildren\b/, key: "has_kids", value: "true", confidence: 0.75 },
    { re: /\bbooth\b/, key: "seating", value: "booth", confidence: 0.8 },
    { re: /\bwindow\b/, key: "seating", value: "window", confidence: 0.8 },
    { re: /\boutdoor\b/, key: "seating", value: "outdoor", confidence: 0.8 },
    { re: /\bbirthday\b/, key: "occasion_affinity", value: "birthday", confidence: 0.7 },
    { re: /\banniversary\b/, key: "occasion_affinity", value: "anniversary", confidence: 0.7 },
  ];

  for (const rule of rules) {
    if (rule.re.test(q)) {
      await upsertPreference({
        customerId,
        key: rule.key,
        value: rule.value,
        confidence: rule.confidence,
        source,
      });
      learned.push(rule.key);
    }
  }

  const dish = text.match(/\bfavorite(?:\s+dish)?\s+is\s+([A-Za-z][A-Za-z\s]{2,40})/i)
    ?? text.match(/\b(?:love|loved|prefer)\s+(?:the\s+)?([A-Za-z][A-Za-z\s]{2,30})/i);
  if (dish?.[1]) {
    const value = dish[1].trim();
    await upsertPreference({ customerId, key: "favorite_dish", value, confidence: 0.7, source });
    await upsertMemory({
      customerId,
      key: "favorite_dishes",
      value: { latest: value },
      confidence: 0.7,
      source,
    });
    learned.push("favorite_dish");
  }

  if (learned.length) {
    await addTimelineEvent(customerId, "preference_learned", "Preferences updated", learned.join(", "));
  }
  return learned;
}

export async function learnFromReservation(input: {
  customerId: string;
  occasion?: string | null;
  highChair?: boolean;
  outdoor?: boolean | null;
  booth?: boolean | null;
  window?: boolean | null;
  dietary?: string[];
  time?: string | null;
  tableId?: string | null;
  guests?: number | null;
}): Promise<void> {
  if (input.occasion) {
    await upsertPreference({ customerId: input.customerId, key: "occasion_affinity", value: input.occasion, confidence: 0.85, source: "reservation" });
  }
  if (input.highChair) {
    await upsertPreference({ customerId: input.customerId, key: "has_kids", value: "true", confidence: 0.9, source: "reservation" });
  }
  if (input.outdoor) await upsertPreference({ customerId: input.customerId, key: "seating", value: "outdoor", confidence: 0.85, source: "reservation" });
  if (input.booth) await upsertPreference({ customerId: input.customerId, key: "seating", value: "booth", confidence: 0.85, source: "reservation" });
  if (input.window) await upsertPreference({ customerId: input.customerId, key: "seating", value: "window", confidence: 0.85, source: "reservation" });
  for (const d of input.dietary ?? []) {
    await upsertPreference({ customerId: input.customerId, key: "dietary", value: d, confidence: 0.9, source: "reservation" });
  }
  if (input.time) {
    await upsertMemory({
      customerId: input.customerId,
      key: "favorite_time",
      value: { time: input.time },
      confidence: 0.65,
      source: "reservation",
    });
  }
  if (input.tableId) {
    await upsertMemory({
      customerId: input.customerId,
      key: "favorite_table",
      value: { tableId: input.tableId },
      confidence: 0.6,
      source: "reservation",
    });
  }
  if (input.guests) {
    await upsertMemory({
      customerId: input.customerId,
      key: "family_size",
      value: { typicalParty: input.guests },
      confidence: 0.7,
      source: "reservation",
    });
  }
}

export async function getKnownPreferenceKeys(customerId: string): Promise<string[]> {
  const [prefs, memory] = await Promise.all([listPreferences(customerId), listMemory(customerId)]);
  return [...prefs.map((p) => p.key), ...memory.map((m) => m.key)];
}
