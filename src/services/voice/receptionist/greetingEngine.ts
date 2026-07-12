import { getLocationConfig, type LocationId } from "../../../config/locations";
import { listGreetingTemplates } from "./repository";
import type { GreetingContext, GreetingResult } from "./types";

function timeOfDay(d = new Date()): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function fill(template: string, ctx: GreetingContext & { timeOfDay: string; brand: string; assistant: string }) {
  return template
    .replace(/\{\{location\}\}/gi, ctx.locationName)
    .replace(/\{\{restaurant\}\}/gi, ctx.brand)
    .replace(/\{\{assistant\}\}/gi, ctx.assistant)
    .replace(/\{\{name\}\}/gi, ctx.customerName || "there")
    .replace(/\{\{timeOfDay\}\}/gi, ctx.timeOfDay);
}

export async function buildGreeting(ctx: GreetingContext): Promise<GreetingResult> {
  const tod = timeOfDay();
  const loc = getLocationConfig(ctx.locationId as LocationId);
  const locationName = loc?.name ?? ctx.locationName ?? ctx.locationId;
  const templates = await listGreetingTemplates(ctx.locationId);
  const lang = ctx.language === "auto" ? "en" : ctx.language;

  const scored = (templates as Array<Record<string, unknown>>).map((t) => {
    let score = 0;
    if (String(t.language) === lang) score += 10;
    if (ctx.returningCustomer && t.returning_customer) score += 8;
    if (ctx.holidayKey && t.holiday_key === ctx.holidayKey) score += 12;
    if (ctx.festivalKey && t.festival_key === ctx.festivalKey) score += 12;
    if (ctx.eventKey && t.event_key === ctx.eventKey) score += 10;
    if (t.time_of_day === tod) score += 5;
    if (t.code === "default") score += 1;
    return { t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.t;

  const template =
    (best?.template as string | undefined) ||
    `Namaste! Thank you for calling Desi Dhamaka {{location}}. I'm Cheffy, your AI restaurant assistant. How may I help you today?`;

  const text = fill(template, {
    ...ctx,
    locationName,
    timeOfDay: tod,
    brand: "Desi Dhamaka",
    assistant: "Cheffy",
  });

  return {
    text,
    code: String(best?.code ?? "default"),
    language: lang,
    timeOfDay: tod,
  };
}
