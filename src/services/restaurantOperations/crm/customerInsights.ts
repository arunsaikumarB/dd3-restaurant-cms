import { crmTable, monthDayMatches, withinDays } from "./client";
import { ensureLoyalty, listPreferences, listSegments } from "./crmRepository";
import type { CrmCustomer, CrmInsight } from "./types";

function daysSinceSafe(iso: string | null): number {
  if (!iso) return 9999;
  const d = new Date(`${iso}T00:00:00`);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export async function generateCustomerInsights(customer: CrmCustomer): Promise<CrmInsight[]> {
  const insights: Array<Omit<CrmInsight, "id">> = [];
  const loyalty = await ensureLoyalty(customer.id);
  const prefs = await listPreferences(customer.id);
  const segments = await listSegments(customer.id);

  if (withinDays(customer.dateOfBirth, 14) || monthDayMatches(customer.dateOfBirth)) {
    insights.push({
      customerId: customer.id,
      insightType: "birthday_offer",
      title: "Birthday offer",
      reason: "Guest birthday is soon or today.",
      priority: "high",
      status: "open",
    });
  }
  if (withinDays(customer.anniversary, 14) || monthDayMatches(customer.anniversary)) {
    insights.push({
      customerId: customer.id,
      insightType: "anniversary_offer",
      title: "Anniversary offer",
      reason: "Guest anniversary is soon or today.",
      priority: "high",
      status: "open",
    });
  }
  if (daysSinceSafe(customer.lastVisit) > 60 && customer.visitCount > 0) {
    insights.push({
      customerId: customer.id,
      insightType: "invite_back",
      title: "Invite back",
      reason: `No visit in ${daysSinceSafe(customer.lastVisit)} days.`,
      priority: "medium",
      status: "open",
    });
  }
  if (daysSinceSafe(customer.lastVisit) > 120) {
    insights.push({
      customerId: customer.id,
      insightType: "win_back",
      title: "Win-back campaign",
      reason: "Long inactivity — win-back recommended.",
      priority: "high",
      status: "open",
    });
  }
  if (customer.visitCount >= 8 && !customer.isVip && loyalty.tier !== "platinum") {
    insights.push({
      customerId: customer.id,
      insightType: "vip_upgrade",
      title: "VIP upgrade",
      reason: "Frequent visits qualify for VIP recognition.",
      priority: "medium",
      status: "open",
    });
  }
  if (loyalty.points >= 100) {
    insights.push({
      customerId: customer.id,
      insightType: "loyalty_reward",
      title: "Loyalty reward ready",
      reason: `${loyalty.points} points available.`,
      priority: "low",
      status: "open",
    });
  }
  const favoriteDish = prefs.find((p) => p.key === "favorite_dish");
  if (favoriteDish?.value) {
    insights.push({
      customerId: customer.id,
      insightType: "favorite_dish_promo",
      title: `Promote ${favoriteDish.value}`,
      reason: "Known favorite dish.",
      priority: "low",
      status: "open",
    });
  }
  if (segments.includes("frequent_visitor")) {
    insights.push({
      customerId: customer.id,
      insightType: "suggested_reservation",
      title: "Suggest reservation",
      reason: "Frequent guest — proactive booking outreach.",
      priority: "medium",
      status: "open",
    });
  }

  try {
    const t = crmTable("crm_insights");
    if (t && insights.length) {
      await t.delete().eq("customer_id", customer.id).eq("status", "open");
      const { data } = await t
        .insert(
          insights.map((i) => ({
            customer_id: i.customerId,
            insight_type: i.insightType,
            title: i.title,
            reason: i.reason,
            priority: i.priority,
            status: i.status,
            evidence: { segments, tier: loyalty.tier },
          })),
        )
        .select("id, customer_id, insight_type, title, reason, priority, status");
      return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        customerId: (r.customer_id as string | null) ?? null,
        insightType: String(r.insight_type),
        title: String(r.title),
        reason: (r.reason as string | null) ?? null,
        priority: String(r.priority),
        status: String(r.status),
      }));
    }
  } catch {
    /* optional */
  }

  return insights.map((i, idx) => ({ ...i, id: `local-${idx}` }));
}

export async function listOpenInsights(locationId?: string, limit = 40): Promise<CrmInsight[]> {
  try {
    const t = crmTable("crm_insights");
    if (!t) return [];
    let q = t.select("*").eq("status", "open").order("created_at", { ascending: false }).limit(limit);
    if (locationId) q = q.eq("location_id", locationId);
    const { data } = await q;
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      customerId: (r.customer_id as string | null) ?? null,
      insightType: String(r.insight_type),
      title: String(r.title),
      reason: (r.reason as string | null) ?? null,
      priority: String(r.priority),
      status: String(r.status),
    }));
  } catch {
    return [];
  }
}
