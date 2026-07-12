/**
 * Central Event Engine — single source of truth for catering lifecycle.
 * Planner talks only via Catering Tool; never accesses CRM tables directly.
 * CRM updates use existing CRM public APIs only.
 */

import { normalizePhone } from "./client";
import { logAiConversation, logProposalSent } from "./communications";
import { captureOrReuseLead, qualifyLead, setLeadStatus } from "./leadService";
import { recommendMenu, saveMenuForEvent } from "./menuPlanner";
import { recommendPackages, resolvePackage } from "./packageEngine";
import { createOrReviseQuote } from "./quoteEngine";
import {
  findOpenEventByLead,
  getEvent,
  getLatestQuote,
  getSettings,
  insertEvent,
  listApprovals,
  listEvents,
  updateEvent,
  updateQuote,
} from "./repository";
import { createTasksForEvent } from "./taskManager";
import { advanceWorkflow, cancelEventWorkflow, progressForStage, workflowVisual } from "./workflowEngine";
import type {
  CateringAction,
  CateringRecommendation,
  EventEngineResult,
  EventNeeds,
  EventRequirements,
  MissingEventField,
} from "./types";
import {
  addNote,
  awardPoints,
  findCustomerByIdentity,
  upsertCustomer,
} from "../crm";

const FOLLOW_UPS: Record<MissingEventField, string> = {
  outlet: "Which Desi Dhamaka location should host or supply the catering?",
  customerName: "Who should we put this event inquiry under?",
  phone: "What's the best phone number for the catering team to reach you?",
  eventDate: "What date is the event?",
  guestCount: "About how many guests are you expecting?",
  eventType: "What kind of event is this — birthday, corporate, wedding, or something else?",
};

export function detectCateringAction(message: string): CateringAction {
  const q = message.toLowerCase();
  if (/\b(cancel|cancelled)\b/.test(q)) return "cancel";
  if (/\b(approve|approval|sign off)\b/.test(q)) return "approve";
  if (/\b(revise|revision|update quote|new quote)\b/.test(q)) return "revise";
  if (/\b(quote|quotation|estimate|pricing|price)\b/.test(q)) return "quote";
  if (/\b(package|packages|silver|gold|platinum)\b/.test(q)) return "packages";
  if (/\b(menu|starters|buffet menu)\b/.test(q)) return "menu";
  if (/\b(book|confirm|deposit|reserve the date)\b/.test(q)) return "book";
  if (/\b(status|where is my|progress)\b/.test(q)) return "status";
  if (/\b(recommend|suggestion|what do you suggest)\b/.test(q)) return "recommend";
  if (/\b(qualify|details|requirements)\b/.test(q)) return "qualify";
  return "inquire";
}

export function extractEventRequirements(
  message: string,
  locationId: string,
  history: Array<{ role: string; content: string }> = [],
): EventRequirements {
  const blob = [...history.map((h) => h.content), message].join("\n");
  const req: EventRequirements = { locationId, source: "ai_chat" };

  const dateIso = blob.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (dateIso) req.eventDate = dateIso[1];
  const dateUs = blob.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?\b/);
  if (!req.eventDate && dateUs) {
    const y = dateUs[3] ?? String(new Date().getFullYear());
    req.eventDate = `${y}-${dateUs[1]!.padStart(2, "0")}-${dateUs[2]!.padStart(2, "0")}`;
  }

  const time24 = blob.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const time12 = blob.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (time24) req.eventTime = `${time24[1]!.padStart(2, "0")}:${time24[2]}`;
  else if (time12) {
    let h = Number(time12[1]);
    const m = time12[2] ?? "00";
    const ap = time12[3]!.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    req.eventTime = `${String(h).padStart(2, "0")}:${m}`;
  }

  const guests =
    blob.match(/\b(\d{1,3})\s*(guests?|people|persons?|pax)\b/i) ??
    blob.match(/\b(for|party of)\s+(\d{1,3})\b/i);
  if (guests) {
    const n = Number(guests[1] && /^\d+$/.test(guests[1]) ? guests[1] : guests[2]);
    if (n > 0) req.guestCount = n;
  }

  const budget = blob.match(/\$\s*(\d{2,6})|\bbudget(?:\s+of)?\s*\$?\s*(\d{2,6})/i);
  if (budget) req.budget = Number(budget[1] ?? budget[2]);

  const phone = blob.match(/(\+?\d[\d\s\-().]{8,}\d)/);
  if (phone) req.phone = normalizePhone(phone[1]!);

  const email = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) req.email = email[0];

  const name = blob.match(/\b(?:name is|my name(?:'s| is)|under)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (name) req.customerName = name[1];

  const typeMap: Array<[RegExp, string]> = [
    [/\bwedding\b/i, "wedding"],
    [/\breception\b/i, "reception"],
    [/\bbirthday\b/i, "birthday"],
    [/\banniversary\b/i, "anniversary"],
    [/\bcorporate\b/i, "corporate"],
    [/\boffice\s*lunch\b/i, "office_lunch"],
    [/\bbaby\s*shower\b/i, "baby_shower"],
    [/\bgraduation\b/i, "graduation"],
    [/\bprivate\s*dining\b/i, "private_dining"],
    [/\bfestival\b/i, "festival"],
    [/\boutdoor\b/i, "outdoor_catering"],
    [/\bbuffet\b/i, "buffet"],
  ];
  for (const [re, t] of typeMap) {
    if (re.test(blob)) {
      req.eventType = t;
      break;
    }
  }

  const dietary: string[] = [];
  if (/\bjain\b/i.test(blob)) dietary.push("jain");
  if (/\bvegetarian\b|\bveg\b/i.test(blob) && !/\bnon[-\s]?veg\b/i.test(blob)) dietary.push("veg");
  if (/\bnon[-\s]?veg\b/i.test(blob)) dietary.push("non-veg");
  if (/\bkids?\b/i.test(blob)) dietary.push("kids");
  if (dietary.length) req.dietary = dietary;

  const needs: EventNeeds = {};
  if (/\bdecorat/i.test(blob)) needs.decorations = true;
  if (/\bcake\b/i.test(blob)) needs.cake = true;
  if (/\bphoto/i.test(blob)) needs.photography = true;
  if (/\bdj\b/i.test(blob)) needs.dj = true;
  if (/\bmusic\b/i.test(blob)) needs.music = true;
  if (/\bprojector\b/i.test(blob)) needs.projector = true;
  if (/\blive\s*counter\b/i.test(blob)) needs.liveCounter = true;
  if (/\bkids?\b/i.test(blob)) needs.kids = true;
  if (Object.keys(needs).length) req.needs = needs;

  if (/\bbuffet\b/i.test(blob)) req.servingStyle = "buffet";
  if (/\bplated\b/i.test(blob)) req.servingStyle = "plated";
  if (/\blive\s*station/i.test(blob)) req.servingStyle = "live_stations";
  if (/\bdelivery\b/i.test(blob)) req.serviceMode = "delivery";
  if (/\bpick\s*up\b|\bpickup\b/i.test(blob)) req.serviceMode = "pickup";
  if (/\bon[-\s]?site\b|\bat\s+the\s+restaurant\b/i.test(blob)) {
    req.serviceMode = "on_site";
    req.venueType = "restaurant";
  }
  if (/\bour\s+(office|home|venue)|customer\s+venue|offsite/i.test(blob)) {
    req.venueType = "customer_venue";
  }

  const cuisine = blob.match(/\b(andhra|hyderabadi|north indian|south indian|indo-chinese)\b/i);
  if (cuisine) req.cuisine = cuisine[1]!.toLowerCase();

  const pkg = blob.match(/\b(silver|gold|platinum|corp_lunch|corporate lunch|birthday deluxe)\b/i);
  if (pkg) {
    const p = pkg[1]!.toLowerCase();
    if (p.includes("corporate") || p === "corp_lunch") req.packageCode = "CORP_LUNCH";
    else if (p.includes("birthday")) req.packageCode = "BDAY_DELUXE";
    else req.packageCode = p.toUpperCase();
  }

  return req;
}

export function detectMissingFields(req: EventRequirements): MissingEventField[] {
  const missing: MissingEventField[] = [];
  if (!req.locationId) missing.push("outlet");
  if (!req.customerName?.trim()) missing.push("customerName");
  if (!req.phone?.trim()) missing.push("phone");
  if (!req.eventDate) missing.push("eventDate");
  if (req.guestCount == null || req.guestCount < 1) missing.push("guestCount");
  if (!req.eventType) missing.push("eventType");
  return missing;
}

function result(
  action: CateringAction,
  partial: Partial<EventEngineResult> & { message: string; ok: boolean },
): EventEngineResult {
  return {
    ok: partial.ok,
    action,
    missingFields: partial.missingFields ?? [],
    followUpQuestion: partial.followUpQuestion ?? null,
    message: partial.message,
    lead: partial.lead ?? null,
    event: partial.event ?? null,
    quote: partial.quote ?? null,
    packages: partial.packages ?? [],
    recommendations: partial.recommendations ?? null,
    menu: partial.menu ?? null,
    data: partial.data,
  };
}

/** Soft CRM link via public CRM APIs only — Planner never calls this. */
export async function syncCrmAfterCatering(input: {
  locationId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  eventId?: string | null;
  eventType?: string | null;
  guestCount?: number | null;
  stage?: string | null;
}): Promise<string | null> {
  try {
    const customer = await upsertCustomer({
      locationId: input.locationId,
      fullName: input.customerName,
      phone: input.phone,
      email: input.email ?? null,
    });
    if (!customer) {
      const existing = await findCustomerByIdentity({
        locationId: input.locationId,
        phone: input.phone,
        email: input.email ?? undefined,
      });
      return existing?.id ?? null;
    }
    await addNote(
      customer.id,
      `Catering/event touchpoint${input.eventType ? ` (${input.eventType})` : ""}${
        input.guestCount ? ` · ${input.guestCount} guests` : ""
      }${input.stage ? ` · stage ${input.stage}` : ""}${input.eventId ? ` · event ${input.eventId}` : ""}`,
      "catering_engine",
    );
    if (input.stage === "confirmed" || input.stage === "deposit_received") {
      await awardPoints(customer.id, 50, "Catering booking confirmed");
    }
    return customer.id;
  } catch {
    return null;
  }
}

async function ensureLeadAndEvent(
  req: EventRequirements,
  messagePreview?: string,
): Promise<{ lead: NonNullable<EventEngineResult["lead"]>; event: NonNullable<EventEngineResult["event"]>; created: boolean } | null> {
  const captured = await captureOrReuseLead({ ...req, messagePreview });
  if (!captured) return null;

  let event = await findOpenEventByLead(captured.lead.id);
  if (!event) {
    const title = `${req.eventType ?? "Event"} — ${req.customerName ?? captured.lead.customerName}`;
    event = await insertEvent({
      leadId: captured.lead.id,
      locationId: req.locationId,
      customerId: captured.lead.customerId,
      title,
      eventType: req.eventType ?? "custom",
      workflowStage: "inquiry",
      eventDate: req.eventDate ?? null,
      eventTime: req.eventTime ?? null,
      guestCount: req.guestCount ?? null,
      budget: req.budget ?? null,
      venueType: req.venueType ?? "restaurant",
      venueAddress: req.venueAddress ?? null,
      cuisine: req.cuisine ?? null,
      dietary: req.dietary ?? [],
      servingStyle: req.servingStyle ?? null,
      serviceMode: req.serviceMode ?? null,
      needs: req.needs ?? {},
      specialRequests: req.specialRequests ?? null,
      conversationId: req.conversationId ?? null,
      progressPercent: progressForStage("inquiry"),
    });
  } else {
    event = await updateEvent(event.id, {
      eventType: req.eventType ?? event.eventType,
      eventDate: req.eventDate ?? event.eventDate,
      eventTime: req.eventTime ?? event.eventTime,
      guestCount: req.guestCount ?? event.guestCount,
      budget: req.budget ?? event.budget,
      venueType: req.venueType ?? event.venueType,
      venueAddress: req.venueAddress ?? event.venueAddress,
      cuisine: req.cuisine ?? event.cuisine,
      dietary: req.dietary ?? event.dietary,
      servingStyle: req.servingStyle ?? event.servingStyle,
      serviceMode: req.serviceMode ?? event.serviceMode,
      needs: { ...event.needs, ...(req.needs ?? {}) },
      specialRequests: req.specialRequests ?? event.specialRequests,
    });
  }
  if (!event) return null;
  return { lead: captured.lead, event, created: captured.created };
}

export async function runEventEngine(input: {
  action?: CateringAction;
  locationId: string;
  message?: string;
  fields?: EventRequirements;
  history?: Array<{ role: string; content: string }>;
  conversationId?: string | null;
  eventId?: string;
  actor?: string;
  comment?: string;
}): Promise<EventEngineResult> {
  const action =
    input.action ??
    (input.message ? detectCateringAction(input.message) : "inquire");

  const extracted = input.message
    ? extractEventRequirements(input.message, input.locationId, input.history ?? [])
    : { locationId: input.locationId };
  const req: EventRequirements = {
    ...extracted,
    ...input.fields,
    locationId: input.locationId,
    conversationId: input.conversationId ?? input.fields?.conversationId ?? null,
    source: input.fields?.source ?? extracted.source ?? "ai_chat",
  };

  if (action === "packages") {
    const packages = await recommendPackages(input.locationId, req, 5);
    return result(action, {
      ok: true,
      packages,
      message: packages.length
        ? `Available packages: ${packages.map((p) => `${p.name} (from $${p.basePrice}+$${p.pricePerGuest}/guest)`).join("; ")}.`
        : "No packages configured yet for this outlet.",
      recommendations: {
        packages,
        menuHints: [],
        upsells: ["Cake", "Live counter", "Decor package"],
        notes: ["Packages can be customized with add-ons."],
      },
    });
  }

  if (action === "status" && input.eventId) {
    const event = await getEvent(input.eventId);
    if (!event) {
      return result(action, { ok: false, message: "I couldn't find that event." });
    }
    const visual = workflowVisual(event.workflowStage);
    return result(action, {
      ok: true,
      event,
      message: `Event "${event.title}" is at ${event.workflowStage.replace(/_/g, " ")} (${visual.percent}% complete).`,
      data: { workflow: visual },
    });
  }

  if (action === "cancel") {
    const bundled = await ensureLeadAndEvent(req, input.message);
    const event = input.eventId ? await getEvent(input.eventId) : bundled?.event;
    if (!event) {
      return result(action, {
        ok: false,
        missingFields: detectMissingFields(req).slice(0, 2),
        followUpQuestion: FOLLOW_UPS.phone,
        message: "I need the event details or phone number to cancel.",
      });
    }
    const cancelled = await cancelEventWorkflow(event, input.comment ?? "Cancelled via catering tool");
    return result(action, {
      ok: true,
      event: cancelled,
      lead: bundled?.lead ?? null,
      message: `I've cancelled the event "${event.title}".`,
    });
  }

  // Soft capture on any inquire path — avoid duplicates
  const partialMissing = detectMissingFields(req);
  const criticalForQuote = partialMissing.filter((f) =>
    ["phone", "eventDate", "guestCount"].includes(f),
  );

  if (action === "inquire" || action === "qualify") {
    // Collect conversationally — only ask for missing critical fields
    if (partialMissing.includes("guestCount") && !req.eventDate) {
      return result(action, {
        ok: false,
        missingFields: ["guestCount", "eventDate"],
        followUpQuestion: `${FOLLOW_UPS.guestCount} Also, ${FOLLOW_UPS.eventDate.toLowerCase()}`,
        message: "I'd love to help plan this. A couple of details will get us started.",
      });
    }
    if (partialMissing.length && partialMissing.length > 2) {
      const primary = partialMissing[0]!;
      return result(action, {
        ok: false,
        missingFields: [primary],
        followUpQuestion: FOLLOW_UPS[primary],
        message: "Happy to help with catering — just a quick detail.",
      });
    }

    const bundled = await ensureLeadAndEvent(req, input.message);
    if (!bundled) {
      return result(action, {
        ok: false,
        message: "I couldn't save the inquiry right now. Please try again or use the catering form.",
      });
    }

    let { lead, event } = bundled;
    if (action === "qualify" || partialMissing.length === 0) {
      lead = (await qualifyLead(lead.id)) ?? lead;
      event = (await advanceWorkflow(event, "qualification")) ?? event;
    }

    const packages = await recommendPackages(input.locationId, req, 3);
    const { menu, hints } = recommendMenu(req, packages[0] ?? null);
    const recommendations: CateringRecommendation = {
      packages,
      menuHints: hints,
      upsells: [
        ...(req.needs?.cake ? [] : ["Celebration cake"]),
        ...(req.needs?.liveCounter ? [] : ["Live dosa / chaat counter"]),
        "Decor upgrade",
        "Reservation + catering combo for VIP table",
      ],
      notes: [],
    };

    await logAiConversation({
      locationId: input.locationId,
      leadId: lead.id,
      eventId: event.id,
      conversationId: req.conversationId ?? null,
      summary: `Catering ${action}: ${req.eventType ?? "event"} · ${req.guestCount ?? "?"} guests`,
      body: input.message,
    });

    if (req.phone && req.customerName) {
      const customerId = await syncCrmAfterCatering({
        locationId: input.locationId,
        customerName: req.customerName,
        phone: req.phone,
        email: req.email,
        eventId: event.id,
        eventType: event.eventType,
        guestCount: event.guestCount,
        stage: event.workflowStage,
      });
      if (customerId) {
        await updateEvent(event.id, { customerId });
        event = { ...event, customerId };
      }
    }

    const settings = await getSettings(input.locationId);
    const budgetTooLow =
      req.budget != null &&
      packages[0] &&
      req.budget < packages[0].basePrice + packages[0].pricePerGuest * (req.guestCount ?? packages[0].minGuests) * 0.7;

    return result(action, {
      ok: true,
      lead,
      event,
      packages,
      recommendations,
      data: {
        menuDraft: menu,
        budgetTooLow: Boolean(budgetTooLow),
        minGuests: settings?.minGuests ?? 20,
        missingOptional: partialMissing,
      },
      message: budgetTooLow
        ? `Thanks — I've logged this as lead ${lead.id.slice(0, 8)}. Your budget may be tight for ${req.guestCount} guests; I can suggest a leaner package or adjust the menu.`
        : `Thanks — I've logged your ${req.eventType ?? "event"} inquiry${req.guestCount ? ` for ${req.guestCount} guests` : ""}. Top package suggestion: ${packages[0]?.name ?? "custom menu"}.`,
    });
  }

  if (action === "recommend" || action === "menu") {
    const packages = await recommendPackages(input.locationId, req, 3);
    const pkg =
      (req.packageCode ? await resolvePackage(input.locationId, req.packageCode) : null) ??
      packages[0] ??
      null;
    const { menu, hints } = recommendMenu(req, pkg);
    const bundled = req.phone || req.customerName ? await ensureLeadAndEvent(req, input.message) : null;
    let savedMenu = null;
    if (bundled && action === "menu") {
      savedMenu = await saveMenuForEvent(bundled.event.id, input.locationId, menu);
    }
    return result(action, {
      ok: true,
      lead: bundled?.lead ?? null,
      event: bundled?.event ?? null,
      packages,
      menu: savedMenu,
      recommendations: {
        packages,
        menuHints: hints,
        upsells: ["Dessert station", "Live counter", "Premium decor"],
        notes: hints,
      },
      data: { menuDraft: menu },
      message: `I'd recommend ${pkg?.name ?? "a custom menu"} with ${menu.mains.slice(0, 2).join(" & ") || "chef selections"}.`,
    });
  }

  if (action === "quote" || action === "revise") {
    if (criticalForQuote.length) {
      const primary = criticalForQuote[0]!;
      return result(action, {
        ok: false,
        missingFields: criticalForQuote,
        followUpQuestion: FOLLOW_UPS[primary],
        message: "I can prepare a quotation once I have a few key details.",
      });
    }
    const bundled = await ensureLeadAndEvent(req, input.message);
    if (!bundled) {
      return result(action, { ok: false, message: "Unable to create quotation context." });
    }
    let { lead, event } = bundled;
    const packages = await recommendPackages(input.locationId, req, 3);
    const pkg =
      (req.packageCode ? await resolvePackage(input.locationId, req.packageCode) : null) ??
      (event.packageId ? packages.find((p) => p.id === event.packageId) ?? null : null) ??
      packages[0] ??
      null;

    if (pkg) {
      event = (await updateEvent(event.id, { packageId: pkg.id })) ?? event;
    }

    const { menu } = recommendMenu(req, pkg);
    await saveMenuForEvent(event.id, input.locationId, menu);

    const quote = await createOrReviseQuote({
      event,
      pkg,
      req,
      revise: action === "revise",
      notes: req.specialRequests,
    });

    event = (await advanceWorkflow(event, action === "revise" ? "negotiation" : "proposal", {
      quoteId: quote?.id,
      actor: input.actor ?? "cheffy",
    })) ?? event;
    lead = (await setLeadStatus(lead.id, "proposal_sent")) ?? lead;
    await logProposalSent({
      locationId: input.locationId,
      eventId: event.id,
      leadId: lead.id,
      summary: quote ? `Quote v${quote.version} · $${quote.grandTotal.toFixed(2)}` : "Proposal prepared",
    });

    if (req.phone && req.customerName) {
      const customerId = await syncCrmAfterCatering({
        locationId: input.locationId,
        customerName: req.customerName,
        phone: req.phone,
        email: req.email,
        eventId: event.id,
        eventType: event.eventType,
        guestCount: event.guestCount,
        stage: event.workflowStage,
      });
      if (customerId) event = (await updateEvent(event.id, { customerId })) ?? event;
    }

    return result(action, {
      ok: Boolean(quote),
      lead,
      event,
      quote,
      packages,
      message: quote
        ? `Quotation v${quote.version} is ready — grand total $${quote.grandTotal.toFixed(2)} (tax & service included). Pending manager review.`
        : "I couldn't generate the quotation. Please try again.",
    });
  }

  if (action === "approve") {
    const bundled = await ensureLeadAndEvent(req, input.message);
    const event = input.eventId ? await getEvent(input.eventId) : bundled?.event;
    if (!event) {
      return result(action, { ok: false, message: "No event found to approve." });
    }
    const quote = await getLatestQuote(event.id);
    if (quote) {
      await updateQuote(quote.id, { approvalStatus: "pending_manager" });
    }
    const advanced = await advanceWorkflow(event, "approval", {
      quoteId: quote?.id,
      actor: input.actor ?? "manager",
      comment: input.comment,
    });
    return result(action, {
      ok: true,
      event: advanced,
      quote,
      lead: bundled?.lead ?? null,
      message: "Moved to approval — manager / owner can sign off next.",
      data: { approvals: await listApprovals(event.id) },
    });
  }

  if (action === "book") {
    if (criticalForQuote.length) {
      const primary = criticalForQuote[0]!;
      return result(action, {
        ok: false,
        missingFields: criticalForQuote,
        followUpQuestion: FOLLOW_UPS[primary],
        message: "Before we confirm, I still need a few details.",
      });
    }
    const bundled = await ensureLeadAndEvent(req, input.message);
    if (!bundled) {
      return result(action, { ok: false, message: "Unable to book without an event record." });
    }
    let { lead, event } = bundled;
    let quote = await getLatestQuote(event.id);
    if (!quote) {
      const packages = await recommendPackages(input.locationId, req, 1);
      const pkg = packages[0] ?? null;
      if (pkg) event = (await updateEvent(event.id, { packageId: pkg.id })) ?? event;
      quote = await createOrReviseQuote({ event, pkg, req });
    }
    const settings = await getSettings(input.locationId);
    const deposit = quote
      ? Math.round(quote.grandTotal * (settings?.depositPercent ?? 0.3) * 100) / 100
      : 0;
    event =
      (await updateEvent(event.id, {
        depositRequired: deposit,
        depositReceived: 0,
      })) ?? event;
    event = (await advanceWorkflow(event, "deposit_pending", { quoteId: quote?.id })) ?? event;
    if (quote) await updateQuote(quote.id, { approvalStatus: "pending_customer" });
    await createTasksForEvent(event);
    lead = (await setLeadStatus(lead.id, "negotiation")) ?? lead;

    if (req.phone && req.customerName) {
      const customerId = await syncCrmAfterCatering({
        locationId: input.locationId,
        customerName: req.customerName,
        phone: req.phone,
        email: req.email,
        eventId: event.id,
        eventType: event.eventType,
        guestCount: event.guestCount,
        stage: "deposit_pending",
      });
      if (customerId) event = (await updateEvent(event.id, { customerId })) ?? event;
    }

    return result(action, {
      ok: true,
      lead,
      event,
      quote,
      message: `You're almost booked — deposit of $${deposit.toFixed(2)} is pending. Once received, we'll confirm and kick off prep tasks.`,
    });
  }

  // Default: list upcoming for outlet context
  const upcoming = await listEvents({
    locationId: input.locationId,
    from: new Date().toISOString().slice(0, 10),
    limit: 10,
  });
  return result(action, {
    ok: true,
    message: "Catering engine ready. Share event date, guest count, and contact to open a lead.",
    data: { upcomingCount: upcoming.length },
  });
}
