import type { CampaignTemplate } from "./types";
import { outletDisplayName } from "./campaignBuilder";

export function generateVoicemail(input: {
  name: string;
  locationId: string;
  callType: string;
  template?: CampaignTemplate | null;
  vars?: Record<string, string>;
}): string {
  const outlet = outletDisplayName(input.locationId);
  const vars = {
    name: input.name || "there",
    outlet,
    ...(input.vars ?? {}),
  };

  const hint = input.template?.voicemailHint;
  if (hint) {
    return hint.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key as keyof typeof vars] ?? "");
  }

  switch (input.callType) {
    case "reservation_reminder":
    case "same_day_reminder":
      return `Hi ${vars.name}, this is Cheffy from ${outlet} with a reminder about your reservation. Please call us back if you need to make any changes. Thank you.`;
    case "birthday_greeting":
      return `Happy Birthday from everyone at ${outlet}, ${vars.name}! Enjoy a complimentary dessert on your next visit.`;
    case "waitlist_availability":
      return `Hi ${vars.name}, a table opened at ${outlet}. Please call us back soon if you still need a seat.`;
    default:
      return `Hi ${vars.name}, this is Cheffy from ${outlet}. Please give us a call when you have a moment. Thank you.`;
  }
}
