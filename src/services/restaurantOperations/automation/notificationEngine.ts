/**
 * Notification abstraction — in-app / email now; SMS/WhatsApp/Push/Voice later.
 */

import { insertNotification, listNotifications, updateNotification } from "./repository";
import { renderTemplate } from "./taskEngine";
import type { WorkflowNotification } from "./types";

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  reservation_created: {
    subject: "New reservation",
    body: "Reservation {{entityId}} created for {{customerName}} ({{guests}} guests).",
  },
  reservation_reminder: {
    subject: "Reservation reminder",
    body: "Reminder: reservation {{entityId}} is upcoming.",
  },
  birthday_offer: {
    subject: "Birthday celebration offer",
    body: "A birthday reservation was booked — apply birthday courtesy.",
  },
  birthday_coupon: {
    subject: "Happy Birthday from Desi Dhamaka",
    body: "Enjoy a complimentary dessert on us for your celebration.",
  },
  birthday_greeting: {
    subject: "Happy Birthday!",
    body: "Wishing {{customerName}} a wonderful birthday from Desi Dhamaka.",
  },
};

export async function enqueueNotification(input: {
  instanceId?: string | null;
  locationId?: string | null;
  channel?: string;
  templateKey?: string | null;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  vars?: Record<string, unknown>;
  scheduledAt?: string | null;
}): Promise<WorkflowNotification | null> {
  const tpl = input.templateKey ? TEMPLATES[input.templateKey] : null;
  const vars = input.vars ?? {};
  const subject = input.subject ?? (tpl ? renderTemplate(tpl.subject, vars) : "Workflow notification");
  const body = input.body ?? (tpl ? renderTemplate(tpl.body, vars) : JSON.stringify(vars));

  const row = await insertNotification({
    instanceId: input.instanceId ?? null,
    locationId: input.locationId ?? null,
    channel: input.channel ?? "in_app",
    templateKey: input.templateKey ?? null,
    recipient: input.recipient ?? null,
    subject,
    body,
    status: "queued",
    scheduledAt: input.scheduledAt ?? null,
  });

  if (row) {
    // Deliver immediately for in_app / email abstraction (no external provider in this phase)
    try {
      await updateNotification(row.id, {
        status: "sent",
        sentAt: new Date().toISOString(),
      });
      return { ...row, status: "sent", sentAt: new Date().toISOString() };
    } catch {
      await updateNotification(row.id, {
        status: "failed",
        error: "delivery failed",
        retryCount: row.retryCount + 1,
      });
    }
  }
  return row;
}

export async function getNotifications(opts: {
  locationId?: string;
  status?: string;
}): Promise<WorkflowNotification[]> {
  return listNotifications(opts);
}

export async function retryNotification(id: string): Promise<void> {
  await updateNotification(id, {
    status: "sent",
    sentAt: new Date().toISOString(),
    error: null,
  });
}
