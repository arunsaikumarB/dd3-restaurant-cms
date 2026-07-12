/**
 * Event Lead Management — never lose a lead; dedupe by phone + open status.
 */

import {
  findLeadByPhone,
  insertLead,
  listLeads,
  updateLead,
} from "./repository";
import type {
  EventLead,
  EventLeadPriority,
  EventLeadSource,
  EventLeadStatus,
  EventRequirements,
} from "./types";

export async function captureOrReuseLead(input: EventRequirements & {
  messagePreview?: string;
}): Promise<{ lead: EventLead; created: boolean } | null> {
  const name = input.customerName?.trim() || "Guest";
  if (input.phone) {
    const existing = await findLeadByPhone(input.locationId, input.phone);
    if (existing) {
      const updated = await updateLead(existing.id, {
        customerName: name !== "Guest" ? name : existing.customerName,
        email: input.email ?? existing.email,
        eventType: input.eventType ?? existing.eventType,
        messagePreview: input.messagePreview ?? existing.messagePreview,
        priority: input.priority ?? existing.priority,
      });
      return { lead: updated ?? existing, created: false };
    }
  }

  const lead = await insertLead({
    locationId: input.locationId,
    customerName: name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    source: input.source ?? "ai_chat",
    salesOwner: input.salesOwner ?? null,
    priority: input.priority ?? inferPriority(input),
    status: "new",
    eventType: input.eventType ?? null,
    messagePreview: input.messagePreview ?? null,
    conversationId: input.conversationId ?? null,
  });
  if (!lead) return null;
  return { lead, created: true };
}

function inferPriority(input: EventRequirements): EventLeadPriority {
  const guests = input.guestCount ?? 0;
  if (guests >= 80 || input.eventType === "wedding") return "urgent";
  if (guests >= 40 || input.eventType === "corporate") return "high";
  if (guests >= 20) return "medium";
  return "low";
}

export async function qualifyLead(leadId: string): Promise<EventLead | null> {
  return updateLead(leadId, { status: "qualified" });
}

export async function setLeadStatus(
  leadId: string,
  status: EventLeadStatus,
): Promise<EventLead | null> {
  return updateLead(leadId, { status });
}

export async function getLeadsForOutlet(
  locationId: string,
  status?: string,
): Promise<EventLead[]> {
  return listLeads({ locationId, status, limit: 200 });
}

export function leadSourceFromChannel(channel?: string): EventLeadSource {
  const c = (channel ?? "").toLowerCase();
  if (c.includes("chat") || c === "ai") return "ai_chat";
  if (c.includes("phone") || c.includes("call")) return "phone";
  if (c.includes("walk")) return "walk_in";
  if (c.includes("refer")) return "referral";
  if (c.includes("web") || c.includes("form")) return "website";
  return "ai_chat";
}
