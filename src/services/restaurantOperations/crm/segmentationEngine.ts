import { crmTable, monthDayMatches, withinDays } from "./client";
import { addTimelineEvent, ensureLoyalty, listPreferences } from "./crmRepository";
import type { CrmCustomer } from "./types";

export async function refreshSegments(customer: CrmCustomer): Promise<string[]> {
  const segments = new Set<string>();
  const loyalty = await ensureLoyalty(customer.id);
  const prefs = await listPreferences(customer.id);

  if (customer.isVip || loyalty.tier === "platinum" || customer.visitCount >= 12) segments.add("vip");
  if (customer.visitCount >= 4) segments.add("frequent_visitor");
  if (customer.visitCount <= 1) segments.add("new_guest");
  if (customer.status === "inactive" || (customer.lastVisit && daysSince(customer.lastVisit) > 90)) {
    segments.add("inactive");
  }
  if (prefs.some((p) => p.key === "has_kids" && p.value === "true")) segments.add("family");
  if (prefs.some((p) => p.key === "dietary" && /vegetarian|vegan|jain/i.test(p.value ?? ""))) {
    segments.add("vegetarian");
  }
  if (monthDayMatches(customer.dateOfBirth) || withinDays(customer.dateOfBirth, 30)) {
    segments.add("birthday_this_month");
  }
  if (monthDayMatches(customer.anniversary) || withinDays(customer.anniversary, 30)) {
    segments.add("anniversary_this_month");
  }
  if (customer.lifetimeValue >= 500) segments.add("high_spend");
  if (customer.lifetimeValue > 0 && customer.lifetimeValue < 80) segments.add("low_spend");
  if (loyalty.tier === "gold" || loyalty.tier === "platinum") segments.add("loyalty_elite");

  try {
    const t = crmTable("crm_segments");
    if (t) {
      await t.delete().eq("customer_id", customer.id);
      if (segments.size) {
        await t.insert(
          [...segments].map((segment_key) => ({
            customer_id: customer.id,
            segment_key,
            score: 1,
            source: "auto",
          })),
        );
      }
    }
  } catch {
    /* optional */
  }

  if (customer.isVip !== segments.has("vip")) {
    const c = crmTable("crm_customers");
    if (c) await c.update({ is_vip: segments.has("vip"), updated_at: new Date().toISOString() }).eq("id", customer.id);
  }

  await addTimelineEvent(customer.id, "segment_refresh", "Segments updated", [...segments].join(", ") || "none");
  return [...segments];
}

function daysSince(iso: string): number {
  const d = new Date(`${iso}T00:00:00`);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
