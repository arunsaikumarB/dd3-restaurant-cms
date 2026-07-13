/**
 * Handoff notifications — dashboard + browser queue; email/SMS queued for delivery workers.
 * Slack/Teams reserved for future integrations.
 */

import { insertHandoffNotification } from "./repository";

export async function notifyHandoffChannels(input: {
  locationId: string;
  sessionId?: string | null;
  escalationId?: string | null;
  transferId?: string | null;
  subject: string;
  body: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const base = {
    locationId: input.locationId,
    sessionId: input.sessionId,
    escalationId: input.escalationId,
    transferId: input.transferId,
    subject: input.subject,
    body: input.body,
    payload: input.payload ?? {},
  };

  await insertHandoffNotification({
    ...base,
    channel: "dashboard",
    status: "sent",
  });

  await insertHandoffNotification({
    ...base,
    channel: "browser",
    status: "queued",
  });

  if (input.recipientEmail) {
    await insertHandoffNotification({
      ...base,
      channel: "email",
      recipient: input.recipientEmail,
      status: "queued",
    });
  }

  if (input.recipientPhone) {
    await insertHandoffNotification({
      ...base,
      channel: "sms",
      recipient: input.recipientPhone,
      status: "queued",
    });
  }
}
