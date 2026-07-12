/**
 * Customer Service — public CRM API for admin + context enrichment.
 * Planner / Reservation Engine never call this directly for DB access patterns;
 * AI receives CRM via Context Aggregator only.
 */

import { displayName, monthDayMatches, normalizePhone, withinDays } from "./client";
import { logCommunication } from "./communicationHistory";
import {
  ensureLoyalty,
  findCustomerByIdentity,
  linkReservationToCustomer,
  listCustomers,
  listMemory,
  listPreferences,
  listSegments,
  upsertCustomer,
  getCustomer,
  addNote,
  listNotes,
  mergeCustomers,
  exportCustomerData,
  requestCustomerDeletion,
  writeAudit,
} from "./crmRepository";
import { generateCustomerInsights, listOpenInsights } from "./customerInsights";
import { learnFromReservation, learnFromText, getKnownPreferenceKeys } from "./customerMemory";
import { getCustomerTimeline } from "./customerTimeline";
import { awardPoints } from "./loyaltyEngine";
import { refreshSegments } from "./segmentationEngine";
import { listVisits, recordVisit } from "./visitHistory";
import { listCommunications } from "./communicationHistory";
import { crmTable } from "./client";
import type { CrmContextPackage, CrmCustomer, CrmDashboard } from "./types";

export async function resolveCrmContext(input: {
  locationId: string;
  message?: string;
  phone?: string | null;
  email?: string | null;
  customerName?: string | null;
  conversationId?: string | null;
}): Promise<CrmContextPackage> {
  const phone = input.phone ?? extractPhone(input.message ?? "");
  const email = input.email ?? extractEmail(input.message ?? "");
  let customer = await findCustomerByIdentity({
    locationId: input.locationId,
    phone,
    email,
  });

  // Soft create only when identity is strong enough (phone)
  if (!customer && phone && input.customerName) {
    customer = await upsertCustomer({
      locationId: input.locationId,
      fullName: input.customerName,
      phone,
      email,
    });
  }

  if (!customer || !customer.aiPersonalizationConsent) {
    return emptyContext(customer);
  }

  const [prefs, memory, segments, loyalty, known] = await Promise.all([
    listPreferences(customer.id),
    listMemory(customer.id),
    listSegments(customer.id),
    ensureLoyalty(customer.id),
    getKnownPreferenceKeys(customer.id),
  ]);

  const preferenceMap: Record<string, string> = {};
  for (const p of prefs) {
    if (p.value) preferenceMap[p.key] = p.value;
  }
  const memoryMap: Record<string, unknown> = {};
  for (const m of memory) memoryMap[m.key] = m.value;

  const name = displayName(customer);
  const birthdaySoon = withinDays(customer.dateOfBirth, 14) || monthDayMatches(customer.dateOfBirth);
  const anniversarySoon = withinDays(customer.anniversary, 14) || monthDayMatches(customer.anniversary);
  const returning = customer.visitCount > 0;

  const summaryParts = [
    returning ? `Returning guest ${name}` : `Guest ${name}`,
    customer.isVip ? "VIP" : null,
    loyalty.tier !== "silver" ? `${loyalty.tier} loyalty` : null,
    preferenceMap.favorite_dish ? `favorite dish ${preferenceMap.favorite_dish}` : null,
    preferenceMap.seating ? `prefers ${preferenceMap.seating}` : null,
    preferenceMap.dietary ? `dietary ${preferenceMap.dietary}` : null,
    birthdaySoon ? "birthday soon" : null,
    anniversarySoon ? "anniversary soon" : null,
    memoryMap.favorite_time ? `often books ${(memoryMap.favorite_time as { time?: string }).time}` : null,
  ].filter(Boolean);

  return {
    customerId: customer.id,
    returning,
    displayName: name,
    status: customer.status,
    isVip: customer.isVip,
    loyalty,
    preferences: preferenceMap,
    memory: memoryMap,
    segments,
    knownFields: known,
    birthdaySoon,
    anniversarySoon,
    personalizationAllowed: true,
    summary: summaryParts.join(" · "),
  };
}

function emptyContext(customer: CrmCustomer | null): CrmContextPackage {
  return {
    customerId: customer?.id ?? null,
    returning: false,
    displayName: customer ? displayName(customer) : null,
    status: customer?.status ?? null,
    isVip: false,
    loyalty: null,
    preferences: {},
    memory: {},
    segments: [],
    knownFields: [],
    birthdaySoon: false,
    anniversarySoon: false,
    personalizationAllowed: false,
    summary: customer ? "Personalization consent off" : "No CRM profile",
  };
}

function extractPhone(text: string): string | null {
  const m = text.match(/(\+?\d[\d\s\-().]{8,}\d)/);
  return m ? normalizePhone(m[1]!) : null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

/** Called after AI / reservation events — does not modify Reservation Engine. */
export async function syncCrmAfterReservation(input: {
  locationId: string;
  reservationId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  date?: string | null;
  time?: string | null;
  guests?: number | null;
  occasion?: string | null;
  highChair?: boolean;
  outdoor?: boolean | null;
  booth?: boolean | null;
  window?: boolean | null;
  dietary?: string[];
  tableId?: string | null;
  status?: string;
}): Promise<CrmCustomer | null> {
  const customer = await upsertCustomer({
    locationId: input.locationId,
    fullName: input.customerName,
    phone: input.phone,
    email: input.email,
  });
  if (!customer) return null;

  await linkReservationToCustomer(input.reservationId, customer.id);
  await learnFromReservation({
    customerId: customer.id,
    occasion: input.occasion,
    highChair: input.highChair,
    outdoor: input.outdoor,
    booth: input.booth,
    window: input.window,
    dietary: input.dietary,
    time: input.time,
    tableId: input.tableId,
    guests: input.guests,
  });
  await recordVisit({
    customerId: customer.id,
    locationId: input.locationId,
    reservationId: input.reservationId,
    visitType: "reservation",
    visitDate: input.date,
    visitTime: input.time,
    partySize: input.guests,
    occasion: input.occasion,
    status: input.status ?? "pending",
  });
  await awardPoints(customer.id, 10, "Reservation activity");
  await refreshSegments(customer);
  await generateCustomerInsights(customer);
  return customer;
}

export async function syncCrmAfterConversation(input: {
  locationId: string;
  message: string;
  reply?: string;
  conversationId?: string | null;
  phone?: string | null;
  customerName?: string | null;
}): Promise<void> {
  const ctx = await resolveCrmContext({
    locationId: input.locationId,
    message: input.message,
    phone: input.phone,
    customerName: input.customerName,
    conversationId: input.conversationId,
  });
  if (!ctx.customerId) return;
  await learnFromText(ctx.customerId, `${input.message}\n${input.reply ?? ""}`, "conversation");
  await logCommunication({
    customerId: ctx.customerId,
    locationId: input.locationId,
    channel: "ai_chat",
    direction: "inbound",
    body: input.message,
    summary: input.reply?.slice(0, 200),
    conversationId: input.conversationId,
  });
  const customer = await getCustomer(ctx.customerId);
  if (customer) {
    await refreshSegments(customer);
    await generateCustomerInsights(customer);
  }
}

export async function getCrmDashboard(locationId?: string): Promise<CrmDashboard> {
  const customers = await listCustomers({ locationId, limit: 500 });
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const newCustomers = customers.filter((c) => new Date(c.createdAt) >= monthAgo).length;
  const returning = customers.filter((c) => c.visitCount > 1).length;
  const vip = customers.filter((c) => c.isVip).length;
  const birthdaysToday = customers.filter((c) => monthDayMatches(c.dateOfBirth, today)).length;
  const anniversaries = customers.filter((c) => monthDayMatches(c.anniversary, today)).length;
  const inactive = customers.filter((c) => c.status === "inactive" || (c.lastVisit && daysSince(c.lastVisit) > 90)).length;
  const avgVisits = customers.length
    ? Number((customers.reduce((s, c) => s + c.visitCount, 0) / customers.length).toFixed(1))
    : 0;
  const avgLtv = customers.length
    ? Number((customers.reduce((s, c) => s + c.lifetimeValue, 0) / customers.length).toFixed(1))
    : 0;

  const tierMap = new Map<string, number>();
  for (const c of customers) {
    const loyalty = await ensureLoyalty(c.id);
    tierMap.set(loyalty.tier, (tierMap.get(loyalty.tier) ?? 0) + 1);
  }

  const segMap = new Map<string, number>();
  try {
    const t = crmTable("crm_segments");
    if (t) {
      const { data } = await t.select("segment_key").limit(2000);
      for (const row of (data ?? []) as Array<{ segment_key: string }>) {
        segMap.set(row.segment_key, (segMap.get(row.segment_key) ?? 0) + 1);
      }
    }
  } catch {
    /* optional */
  }

  return {
    totalCustomers: customers.length,
    newCustomers,
    returningCustomers: returning,
    vipCount: vip,
    birthdaysToday,
    anniversariesToday: anniversaries,
    inactiveCustomers: inactive,
    averageVisits: avgVisits,
    averageLifetimeValue: avgLtv,
    loyaltyDistribution: [...tierMap.entries()].map(([label, value]) => ({ label, value })),
    segmentCounts: [...segMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12),
    topCustomers: customers
      .slice()
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue || b.visitCount - a.visitCount)
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        name: displayName(c),
        visits: c.visitCount,
        ltv: c.lifetimeValue,
      })),
  };
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86400000);
}

export {
  listCustomers,
  getCustomer,
  upsertCustomer,
  listPreferences,
  listMemory,
  listSegments,
  listVisits,
  listCommunications,
  getCustomerTimeline,
  generateCustomerInsights,
  listOpenInsights,
  addNote,
  listNotes,
  mergeCustomers,
  exportCustomerData,
  requestCustomerDeletion,
  writeAudit,
  ensureLoyalty,
  awardPoints,
  refreshSegments,
  findCustomerByIdentity,
};
