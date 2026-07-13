import { getLocationConfig, type LocationId } from "../../../config/locations";
import type { ScriptContext } from "./types";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * Dynamic script engine — templates + CRM/ops context. No hardcoded campaign scripts.
 * Planner still owns live conversation intent after the guest answers.
 */
export function generateOutboundScript(ctx: ScriptContext): string {
  const vars: Record<string, string> = {
    name: ctx.name || "there",
    outlet: ctx.outlet || "Desi Dhamaka",
    date: ctx.date ?? "",
    time: ctx.time ?? "",
    guests: String(ctx.guests ?? ""),
    confirmationCode: ctx.confirmationCode ?? "",
    offer: ctx.offer ?? "a special thank-you",
    partySize: ctx.partySize ?? String(ctx.guests ?? ""),
  };

  if (ctx.scriptHint) {
    const filled = fill(ctx.scriptHint, vars);
    return polishScript(ctx.callType, filled, vars);
  }

  return polishScript(ctx.callType, "", vars);
}

function polishScript(callType: string, hint: string, vars: Record<string, string>): string {
  const name = vars.name;
  const outlet = vars.outlet;

  switch (callType) {
    case "birthday_greeting":
      return (
        hint ||
        `Happy Birthday, ${name}! Everyone at ${outlet} wishes you a wonderful birthday. As a thank you for being our customer, we'd like to offer you a complimentary dessert on your next visit.`
      );
    case "anniversary_greeting":
      return (
        hint ||
        `Hello ${name}, congratulations on your anniversary from all of us at ${outlet}. We'd love to help you celebrate — would you like me to check a table for you?`
      );
    case "reservation_reminder":
    case "same_day_reminder":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. Just a reminder that your reservation is ${vars.date ? `on ${vars.date}` : "coming up"}${vars.time ? ` at ${vars.time}` : ""}${vars.guests ? ` for ${vars.guests} guests` : ""}. Would you like to confirm, modify, or cancel?`
      );
    case "reservation_confirmation":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. I'm calling to confirm your reservation${vars.confirmationCode ? ` ${vars.confirmationCode}` : ""}${vars.date ? ` on ${vars.date}` : ""}${vars.time ? ` at ${vars.time}` : ""}. Does everything still look good?`
      );
    case "waitlist_availability":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. Good news — a table is available${vars.partySize ? ` for your party of ${vars.partySize}` : ""}. Would you like me to hold it for you?`
      );
    case "cancellation_confirmation":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. I'm confirming that your reservation has been cancelled. We hope to welcome you another time — would you like to book a new visit?`
      );
    case "customer_feedback":
    case "review_request":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. Thank you for dining with us. Do you have a moment to share how your visit went?`
      );
    case "missed_call_callback":
    case "manual_staff_call":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet} returning your call. How can I help you today?`
      );
    case "special_promotions":
    case "buffet_promotion":
    case "happy_hour_promotion":
    case "festival_greetings":
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. I wanted to share ${vars.offer} with you. Would you like me to tell you more or help with a reservation?`
      );
    default:
      return (
        hint ||
        `Hello ${name}, this is Cheffy from ${outlet}. I'm calling with a quick update. Is now a good time?`
      );
  }
}

export function outletDisplayName(locationId: string): string {
  try {
    return getLocationConfig(locationId as LocationId)?.name ?? "Desi Dhamaka";
  } catch {
    return "Desi Dhamaka";
  }
}
