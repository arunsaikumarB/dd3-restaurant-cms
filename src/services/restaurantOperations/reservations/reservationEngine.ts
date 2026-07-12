/**
 * Centralized Reservation Engine — single source of truth.
 * Planner / Voice / Admin / Staff all call this; never duplicate booking logic.
 */

import { makeConfirmationCode, normalizePhone, resTable } from "./client";
import { getAvailability, isSlotAvailable } from "./availabilityEngine";
import { enqueueNotification } from "./notificationService";
import { validateAgainstRules } from "./reservationRules";
import {
  findReservation,
  insertReservationEvent,
  mapReservationRow,
  upsertGuestProfile,
} from "./reservationRepository";
import { assignTable, findBestTable } from "./tableAssignment";
import { joinWaitlist } from "./waitlistEngine";
import type {
  MissingReservationField,
  ReservationAction,
  ReservationEngineResult,
  ReservationGuestInput,
} from "./types";

const FOLLOW_UPS: Record<MissingReservationField, string> = {
  outlet: "Which Desi Dhamaka location would you like to visit?",
  date: "What date would you like to reserve?",
  time: "What time works best for you?",
  guests: "How many guests will be joining you?",
  customerName: "May I have a name for the reservation?",
  phone: "What's the best phone number to reach you?",
  email: "Would you like to share an email for confirmation?",
};

export function detectMissingFields(input: ReservationGuestInput): MissingReservationField[] {
  const missing: MissingReservationField[] = [];
  if (!input.locationId) missing.push("outlet");
  if (!input.date) missing.push("date");
  if (!input.time) missing.push("time");
  if (input.guests == null || input.guests < 1) missing.push("guests");
  if (!input.customerName?.trim()) missing.push("customerName");
  if (!input.phone?.trim()) missing.push("phone");
  return missing;
}

export function detectActionFromMessage(message: string): ReservationAction {
  const q = message.toLowerCase();
  if (/\b(cancel|cancelled)\b/.test(q)) return "cancel";
  if (/\b(modify|change|update|reschedule)\b/.test(q)) return /\breschedule\b/.test(q) ? "reschedule" : "modify";
  if (/\b(confirm|confirmation)\b/.test(q) && /\b(code|number|reservation)\b/.test(q)) return "lookup";
  if (/\b(available|availability|open table|free)\b/.test(q)) return "availability";
  if (/\b(waitlist|wait list)\b/.test(q)) return "waitlist";
  if (/\b(look up|lookup|find my|my reservation|forgot)\b/.test(q)) return "lookup";
  return "create";
}

export function extractReservationFields(
  message: string,
  locationId: string,
  history: Array<{ role: string; content: string }> = [],
): ReservationGuestInput {
  const blob = [...history.map((h) => h.content), message].join("\n");
  const input: ReservationGuestInput = { locationId, source: "ai" };

  const dateIso = blob.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (dateIso) input.date = dateIso[1];
  const dateUs = blob.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?\b/);
  if (!input.date && dateUs) {
    const y = dateUs[3] ?? String(new Date().getFullYear());
    input.date = `${y}-${dateUs[1]!.padStart(2, "0")}-${dateUs[2]!.padStart(2, "0")}`;
  }
  if (!input.date && /\btomorrow\b/i.test(blob)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    input.date = d.toISOString().slice(0, 10);
  }
  if (!input.date && /\btoday\b/i.test(blob)) {
    input.date = new Date().toISOString().slice(0, 10);
  }

  const time24 = blob.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const time12 = blob.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (time24) input.time = `${time24[1]!.padStart(2, "0")}:${time24[2]}`;
  else if (time12) {
    let h = Number(time12[1]);
    const m = time12[2] ?? "00";
    const ap = time12[3]!.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    input.time = `${String(h).padStart(2, "0")}:${m}`;
  }

  const guests = blob.match(/\b(\d{1,2})\s*(guests?|people|persons?|pax)\b/i)
    ?? blob.match(/\b(party of|for)\s+(\d{1,2})\b/i);
  if (guests) {
    const n = Number(guests[1] && /^\d+$/.test(guests[1]) ? guests[1] : guests[2]);
    if (n > 0) input.guests = n;
  }

  const phone = blob.match(/(\+?\d[\d\s\-().]{8,}\d)/);
  if (phone) input.phone = normalizePhone(phone[1]!);

  const email = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) input.email = email[0];

  const name = blob.match(/\b(?:name is|my name(?:'s| is)|under)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (name) input.customerName = name[1];

  const code = blob.match(/\b(DD-[A-Z0-9]{4,8})\b/i);
  if (code) input.confirmationCode = code[1]!.toUpperCase();

  if (/\bbirthday\b/i.test(blob)) input.occasion = "birthday";
  if (/\banniversary\b/i.test(blob)) input.occasion = "anniversary";
  if (/\bhigh\s*chair\b/i.test(blob)) input.highChair = true;
  if (/\boutdoor\b/i.test(blob)) {
    input.outdoor = true;
    input.seatingPreference = "outdoor";
  }
  if (/\bindoor\b/i.test(blob)) {
    input.indoor = true;
    input.seatingPreference = "indoor";
  }
  if (/\bbooth\b/i.test(blob)) {
    input.booth = true;
    input.seatingPreference = "booth";
  }
  if (/\bwindow\b/i.test(blob)) {
    input.window = true;
    input.seatingPreference = "window";
  }

  return input;
}

function result(
  action: ReservationAction,
  partial: Partial<ReservationEngineResult> & { message: string; ok: boolean },
): ReservationEngineResult {
  return {
    ok: partial.ok,
    action,
    missingFields: partial.missingFields ?? [],
    followUpQuestion: partial.followUpQuestion ?? null,
    reservation: partial.reservation ?? null,
    slots: partial.slots ?? [],
    waitlist: partial.waitlist ?? null,
    message: partial.message,
    data: partial.data,
  };
}

export async function runReservationEngine(input: {
  action?: ReservationAction;
  locationId: string;
  message?: string;
  fields?: ReservationGuestInput;
  history?: Array<{ role: string; content: string }>;
  conversationId?: string | null;
}): Promise<ReservationEngineResult> {
  const action =
    input.action ??
    (input.message ? detectActionFromMessage(input.message) : "create");

  const extracted = input.message
    ? extractReservationFields(input.message, input.locationId, input.history ?? [])
    : { locationId: input.locationId };
  const fields: ReservationGuestInput = {
    ...extracted,
    ...input.fields,
    locationId: input.locationId,
    conversationId: input.conversationId ?? input.fields?.conversationId ?? null,
    source: input.fields?.source ?? extracted.source ?? "ai",
  };

  if (action === "availability") {
    if (!fields.date) {
      return result(action, {
        ok: false,
        missingFields: ["date"],
        followUpQuestion: FOLLOW_UPS.date,
        message: "I need a date to check availability.",
      });
    }
    const slots = await getAvailability({
      locationId: input.locationId,
      date: fields.date,
      guests: fields.guests,
    });
    const open = slots.filter((s) => s.available).map((s) => s.time);
    return result(action, {
      ok: true,
      slots,
      message: open.length
        ? `Available times on ${fields.date}: ${open.slice(0, 8).join(", ")}.`
        : `No tables available on ${fields.date}. I can add you to the waitlist.`,
      data: { openCount: open.length },
    });
  }

  if (action === "lookup") {
    const found = await findReservation({
      confirmationCode: fields.confirmationCode,
      phone: fields.phone,
      locationId: input.locationId,
      id: fields.reservationId,
    });
    if (!found) {
      return result(action, {
        ok: false,
        missingFields: fields.confirmationCode || fields.phone ? [] : ["phone"],
        followUpQuestion: fields.phone ? null : FOLLOW_UPS.phone,
        message: "I couldn't find that reservation. Share the confirmation code or phone number used to book.",
      });
    }
    return result(action, {
      ok: true,
      reservation: found,
      message: `Found reservation ${found.confirmationCode ?? found.id.slice(0, 8)} for ${found.customerName} on ${found.date} at ${found.time} (${found.guests} guests, ${found.status}).`,
    });
  }

  if (action === "cancel") {
    const found = await findReservation({
      confirmationCode: fields.confirmationCode,
      phone: fields.phone,
      locationId: input.locationId,
      id: fields.reservationId,
    });
    if (!found) {
      return result(action, {
        ok: false,
        message: "I need your confirmation code or phone to cancel.",
        missingFields: ["phone"],
        followUpQuestion: FOLLOW_UPS.phone,
      });
    }
    const t = resTable("reservations");
    if (!t) return result(action, { ok: false, message: "Reservation service unavailable." });
    await t.update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", found.id);
    await insertReservationEvent(found.id, input.locationId, "cancelled", {});
    await enqueueNotification({
      locationId: input.locationId,
      reservationId: found.id,
      eventType: "reservation_cancelled",
    });
    return result(action, {
      ok: true,
      reservation: { ...found, status: "cancelled" },
      message: `Cancelled reservation ${found.confirmationCode ?? found.id.slice(0, 8)}.`,
    });
  }

  if (action === "confirm" || action === "reject") {
    const found = await findReservation({
      id: fields.reservationId,
      confirmationCode: fields.confirmationCode,
      locationId: input.locationId,
    });
    if (!found) return result(action, { ok: false, message: "Reservation not found." });
    const status = action === "confirm" ? "confirmed" : "cancelled";
    const t = resTable("reservations");
    if (!t) return result(action, { ok: false, message: "Reservation service unavailable." });
    await t.update({ status, updated_at: new Date().toISOString() }).eq("id", found.id);
    await insertReservationEvent(found.id, input.locationId, action === "confirm" ? "confirmed" : "rejected", {});
    await enqueueNotification({
      locationId: input.locationId,
      reservationId: found.id,
      eventType: action === "confirm" ? "reservation_confirmed" : "reservation_rejected",
    });
    return result(action, {
      ok: true,
      reservation: { ...found, status },
      message: action === "confirm" ? "Reservation confirmed." : "Reservation rejected.",
    });
  }

  if (action === "modify" || action === "reschedule") {
    const found = await findReservation({
      id: fields.reservationId,
      confirmationCode: fields.confirmationCode,
      phone: fields.phone,
      locationId: input.locationId,
    });
    if (!found) {
      return result(action, {
        ok: false,
        message: "I need your confirmation code or phone to modify the reservation.",
        missingFields: ["phone"],
        followUpQuestion: FOLLOW_UPS.phone,
      });
    }
    const nextDate = fields.date ?? found.date;
    const nextTime = fields.time ?? found.time;
    const nextGuests = fields.guests ?? found.guests;
    const rules = await validateAgainstRules(input.locationId, {
      locationId: input.locationId,
      date: nextDate,
      time: nextTime,
      guests: nextGuests,
      phone: found.phone,
      email: fields.email ?? found.email ?? undefined,
    });
    if (!rules.ok) return result(action, { ok: false, message: rules.errors.join(" ") });
    const slot = await isSlotAvailable({
      locationId: input.locationId,
      date: nextDate,
      time: nextTime,
      guests: nextGuests,
    });
    if (!slot.available) {
      return result(action, {
        ok: false,
        message: slot.reason ?? "That slot is no longer available.",
      });
    }
    const t = resTable("reservations");
    if (!t) return result(action, { ok: false, message: "Reservation service unavailable." });
    const { data } = await t
      .update({
        date: nextDate,
        time: nextTime.length === 5 ? `${nextTime}:00` : nextTime,
        guests: nextGuests,
        special_request: fields.specialRequests ?? found.specialRequest,
        occasion: fields.occasion ?? found.occasion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", found.id)
      .select("*")
      .single();
    const updated = data ? mapReservationRow(data as Record<string, unknown>) : { ...found, date: nextDate, time: nextTime, guests: nextGuests };
    await insertReservationEvent(found.id, input.locationId, "modified", { nextDate, nextTime, nextGuests });
    await enqueueNotification({
      locationId: input.locationId,
      reservationId: found.id,
      eventType: "reservation_modified",
    });
    return result(action, {
      ok: true,
      reservation: updated,
      message: `Updated reservation to ${nextDate} at ${nextTime} for ${nextGuests} guests.`,
    });
  }

  if (action === "waitlist") {
    const missing = detectMissingFields({ ...fields, date: fields.date ?? "skip", time: fields.time ?? "skip" })
      .filter((f) => f !== "date" && f !== "time");
    if (missing.length) {
      return result(action, {
        ok: false,
        missingFields: missing,
        followUpQuestion: FOLLOW_UPS[missing[0]!],
        message: "I can add you to the waitlist once I have a few details.",
      });
    }
    const entry = await joinWaitlist({
      locationId: input.locationId,
      guestName: fields.customerName!,
      phone: fields.phone!,
      email: fields.email,
      partySize: fields.guests!,
      preferredDate: fields.date,
      preferredTime: fields.time,
      conversationId: fields.conversationId,
    });
    if (!entry) return result(action, { ok: false, message: "Unable to join waitlist right now." });
    return result(action, {
      ok: true,
      waitlist: entry,
      message: `You're #${entry.queuePosition} on the waitlist (about ${entry.estimatedWaitMinutes ?? 15} minutes). We'll notify you when a table opens.`,
    });
  }

  // create / collect
  const missing = detectMissingFields(fields);
  if (missing.length) {
    return result("collect", {
      ok: false,
      missingFields: missing,
      followUpQuestion: FOLLOW_UPS[missing[0]!],
      message: "I can help book a table — just need a couple more details.",
      data: { collected: fields },
    });
  }

  const rules = await validateAgainstRules(input.locationId, fields);
  if (!rules.ok) return result("create", { ok: false, message: rules.errors.join(" ") });

  const slot = await isSlotAvailable({
    locationId: input.locationId,
    date: fields.date!,
    time: fields.time!,
    guests: fields.guests!,
  });

  if (!slot.available) {
    if (rules.settings.allowWaitlist) {
      return result("create", {
        ok: false,
        message: `${slot.reason ?? "No availability"}. Would you like to join the waitlist?`,
        data: { suggestWaitlist: true },
      });
    }
    return result("create", { ok: false, message: slot.reason ?? "No availability for that slot." });
  }

  // Duplicate soft-check: same phone + date + time
  const dup = await findReservation({ phone: fields.phone, locationId: input.locationId });
  if (dup && dup.date === fields.date && dup.time === fields.time && dup.status !== "cancelled") {
    return result("create", {
      ok: false,
      reservation: dup,
      message: `You already have reservation ${dup.confirmationCode ?? dup.id.slice(0, 8)} at that time.`,
    });
  }

  const guestId = await upsertGuestProfile({
    locationId: input.locationId,
    phone: fields.phone!,
    email: fields.email,
    fullName: fields.customerName!,
    dietary: fields.dietaryRestrictions,
  });

  const table = await findBestTable({
    locationId: input.locationId,
    date: fields.date!,
    time: fields.time!,
    guests: fields.guests!,
    preference: fields.seatingPreference,
  });

  const code = makeConfirmationCode();
  const t = resTable("reservations");
  if (!t) return result("create", { ok: false, message: "Reservation service unavailable." });

  const { data, error } = await t
    .insert({
      location_id: input.locationId,
      customer_name: fields.customerName!.trim(),
      phone: fields.phone!.trim(),
      email: fields.email?.trim() || null,
      date: fields.date,
      time: fields.time!.length === 5 ? `${fields.time}:00` : fields.time,
      guests: fields.guests,
      special_request: fields.specialRequests ?? null,
      status: "pending",
      confirmation_code: code,
      source: fields.source ?? "ai",
      occasion: fields.occasion ?? null,
      accessibility_needs: fields.accessibilityNeeds ?? null,
      high_chair: Boolean(fields.highChair),
      outdoor_requested: fields.outdoor ?? null,
      booth_requested: fields.booth ?? null,
      window_requested: fields.window ?? null,
      dietary_restrictions: fields.dietaryRestrictions ?? [],
      children_count: fields.childrenCount ?? 0,
      guest_id: guestId,
      table_id: table?.id ?? null,
      conversation_id: fields.conversationId ?? null,
      duration_minutes: rules.settings.defaultDurationMinutes,
    })
    .select("*")
    .single();

  if (error || !data) {
    return result("create", {
      ok: false,
      message: error?.message ?? "Could not create reservation.",
    });
  }

  const reservation = mapReservationRow(data as Record<string, unknown>);
  if (table) await assignTable(reservation.id, table.id);
  await insertReservationEvent(reservation.id, input.locationId, "created", { confirmationCode: code });
  await enqueueNotification({
    locationId: input.locationId,
    reservationId: reservation.id,
    eventType: "reservation_created",
    payload: { confirmationCode: code },
  });

  return result("create", {
    ok: true,
    reservation,
    message: `Reservation requested for ${reservation.customerName} on ${reservation.date} at ${reservation.time} for ${reservation.guests}. Confirmation code: ${code}.${table ? ` Suggested table: ${table.tableNumber}.` : ""} Our team will confirm shortly.`,
  });
}
