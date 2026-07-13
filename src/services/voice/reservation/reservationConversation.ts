/**
 * Voice Reservation Agent — conversation orchestrator.
 * Reuses Reservation Engine / CRM; does not duplicate booking logic.
 */

import { findCustomerByIdentity } from "../../restaurantOperations/crm";
import { nowIso } from "../client";
import { checkLiveAvailability } from "./availabilityChecker";
import { buildConfirmationSummary, formatSuccessConfirmation } from "./confirmationGenerator";
import { runCancellationWorkflow } from "./cancellationWorkflow";
import { runModificationWorkflow } from "./modificationWorkflow";
import {
  collectFromUtterance,
  detectWorkflow,
  isReservationIntent,
  locationDisplayName,
} from "./reservationCollector";
import { executeReservation } from "./reservationExecutor";
import {
  getActiveReservationCall,
  insertCallOutcome,
  insertReservationCall,
  insertReservationEvent,
  insertReservationMetric,
  updateReservationCall,
} from "./repository";
import { buildConversationSummary } from "./summaryGenerator";
import { suggestUpsells, shouldRecommendHumanTransfer } from "./upsellEngine";
import { runWaitlistWorkflow } from "./waitlistWorkflow";
import type {
  CollectedReservation,
  OccasionKind,
  VoiceReservationCall,
  VoiceReservationTurnResult,
  VoiceReservationWorkflow,
} from "./types";

function affirmative(text: string): boolean {
  return /\b(yes|yeah|yep|correct|that's right|that is right|confirm|looks good|sounds good|perfect|ok|okay|sure)\b/i.test(
    text,
  );
}

function negative(text: string): boolean {
  return /\b(no|nope|wrong|incorrect|change|wait|actually|hold on)\b/i.test(text);
}

function wantsWaitlist(text: string): boolean {
  return /\b(waitlist|wait list|put me on|add me|join)\b/i.test(text);
}

function historyFromMemory(
  turns: Array<{ role: string; content: string }> | undefined,
): Array<{ role: string; content: string }> {
  return (turns ?? []).slice(-12);
}

async function ensureCall(input: {
  sessionId: string;
  locationId: string;
  conversationId?: string | null;
  workflow: VoiceReservationWorkflow;
  collected?: CollectedReservation;
}): Promise<VoiceReservationCall | null> {
  const existing = await getActiveReservationCall(input.sessionId);
  if (existing) {
    if (existing.workflow !== input.workflow) {
      return (
        (await updateReservationCall(existing.id, {
          workflow: input.workflow,
          locationId: input.locationId,
        })) ?? existing
      );
    }
    return existing;
  }
  return insertReservationCall({
    sessionId: input.sessionId,
    locationId: input.locationId,
    conversationId: input.conversationId,
    workflow: input.workflow,
    collected: input.collected,
  });
}

async function completeCall(
  call: VoiceReservationCall,
  patch: {
    stage: VoiceReservationCall["stage"];
    outcome: string;
    reservationId?: string | null;
    confirmationCode?: string | null;
    collected?: CollectedReservation;
    transferRecommended?: boolean;
    transferReason?: string | null;
    turns?: number;
    plannerGoal?: string | null;
    confidence?: number | null;
  },
): Promise<void> {
  const summary = buildConversationSummary({
    workflow: call.workflow,
    status: patch.outcome,
    collected: (patch.collected ?? call.collected) as unknown as Record<string, unknown>,
    confirmationCode: patch.confirmationCode ?? call.confirmationCode,
    turns: patch.turns,
  });
  await updateReservationCall(call.id, {
    stage: patch.stage,
    outcome: patch.outcome,
    reservationId: patch.reservationId ?? call.reservationId,
    confirmationCode: patch.confirmationCode ?? call.confirmationCode,
    collected: patch.collected ?? call.collected,
    pendingConfirmation: false,
    transferRecommended: patch.transferRecommended ?? call.transferRecommended,
    transferReason: patch.transferReason ?? call.transferReason,
    completedAt: nowIso(),
  });
  await insertReservationEvent(call.id, call.sessionId, "completed", {
    outcome: patch.outcome,
    summary,
  });
  await insertReservationMetric({
    locationId: call.locationId,
    sessionId: call.sessionId,
    callId: call.id,
    workflow: call.workflow,
    outcome: patch.outcome,
    turns: patch.turns ?? 0,
    success: patch.stage === "completed" || patch.stage === "waitlisted" || patch.stage === "cancelled",
  });
  await insertCallOutcome({
    sessionId: call.sessionId,
    locationId: call.locationId,
    outcomeType: patch.outcome,
    reservationId: patch.reservationId ?? call.reservationId,
    confirmationCode: patch.confirmationCode ?? call.confirmationCode,
    summary,
    plannerGoal: patch.plannerGoal ?? `voice_reservation_${call.workflow}`,
    confidence: patch.confidence ?? null,
    escalationRecommendation: patch.transferReason ?? null,
    metadata: {
      stage: patch.stage,
      transferRecommended: patch.transferRecommended ?? false,
    },
  });
}

function turnResult(
  partial: Omit<VoiceReservationTurnResult, "handled"> & { handled?: boolean },
): VoiceReservationTurnResult {
  return { handled: true, ...partial };
}

/**
 * Process one guest utterance for reservation workflows.
 * Returns handled:false when this is not a reservation conversation.
 */
export async function processReservationTurn(input: {
  sessionId: string;
  locationId: string;
  conversationId?: string | null;
  message: string;
  history?: Array<{ role: string; content: string }>;
  callerPhone?: string | null;
  turns?: number;
  failureCount?: number;
}): Promise<VoiceReservationTurnResult> {
  const active = await getActiveReservationCall(input.sessionId);
  const intent = isReservationIntent(input.message);
  if (!active && !intent) {
    return {
      handled: false,
      assistantText: "",
      stage: "idle",
      workflow: "create",
      missingFields: [],
      reservation: null,
      confirmationCode: null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: null,
      awaitingConfirmation: false,
    };
  }

  let workflow: VoiceReservationWorkflow = active?.workflow ?? detectWorkflow(input.message);
  if (intent && !active) workflow = detectWorkflow(input.message);

  let collected: CollectedReservation = {
    ...(active?.collected ?? { locationId: input.locationId }),
    locationId: active?.collected.locationId || input.locationId,
  };
  if (input.callerPhone && !collected.phone) collected.phone = input.callerPhone;

  // Prefill CRM for known caller
  if (collected.phone && !collected.customerName) {
    try {
      const customer = await findCustomerByIdentity({
        locationId: collected.locationId,
        phone: collected.phone,
      });
      if (customer) {
        collected.customerName =
          collected.customerName || `${customer.firstName} ${customer.lastName}`.trim() || undefined;
        collected.email = collected.email || customer.email || undefined;
      }
    } catch {
      /* optional */
    }
  }

  const call =
    (await ensureCall({
      sessionId: input.sessionId,
      locationId: collected.locationId,
      conversationId: input.conversationId,
      workflow,
      collected,
    })) ?? null;

  if (!call) {
    // Soft fallback — still try engine without persistence
    return turnResult({
      assistantText: "I'd be happy to help with a reservation. Which location, and for what date and time?",
      stage: "collecting",
      workflow,
      missingFields: ["outlet", "date", "time", "guests", "customerName", "phone"],
      reservation: null,
      confirmationCode: null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: null,
      awaitingConfirmation: false,
    });
  }

  await insertReservationEvent(call.id, call.sessionId, "utterance", {
    message: input.message,
    workflow,
  });

  const history = historyFromMemory(input.history);
  const collection = await collectFromUtterance({
    message: input.message,
    locationId: collected.locationId,
    existing: collected,
    history,
  });
  collected = collection.collected;
  const occasion = (collection.occasion || (collected.occasion as OccasionKind) || null) as OccasionKind;
  if (occasion) collected.occasion = occasion;

  if (collection.workflowHint !== "create" && intent) {
    workflow = collection.workflowHint;
    await updateReservationCall(call.id, { workflow, collected, locationId: collected.locationId });
  } else {
    await updateReservationCall(call.id, { collected, locationId: collected.locationId });
  }

  // --- Confirmation gate (create) ---
  if (call.pendingConfirmation && call.workflow === "create") {
    if (affirmative(input.message)) {
      await updateReservationCall(call.id, { stage: "executing", pendingConfirmation: false });
      const avail = await checkLiveAvailability({
        locationId: collected.locationId,
        date: collected.date!,
        time: collected.time!,
        guests: collected.guests,
      });
      if (!avail.available) {
        const alts = avail.alternatives.length
          ? ` I have ${avail.alternatives.slice(0, 3).join(", ")} available instead.`
          : "";
        const offerWait =
          !avail.restaurantOpen
            ? " Would another day work?"
            : " Would you like to join the waitlist, or try a different time?";
        await updateReservationCall(call.id, { stage: "checking_availability", pendingConfirmation: false });
        await insertReservationEvent(call.id, call.sessionId, "availability_blocked", {
          reason: avail.reason,
          alternatives: avail.alternatives,
        });
        return turnResult({
          assistantText: `${avail.reason ?? "That slot isn't available."}${alts}${offerWait}`,
          stage: "checking_availability",
          workflow: "create",
          missingFields: [],
          reservation: null,
          confirmationCode: null,
          transferRecommended: false,
          transferReason: null,
          upsellHint: null,
          callId: call.id,
          awaitingConfirmation: false,
        });
      }

      let result;
      try {
        result = await executeReservation({
          action: "create",
          locationId: collected.locationId,
          fields: collected,
          message: input.message,
          conversationId: input.conversationId,
          history,
        });
      } catch {
        const transfer = shouldRecommendHumanTransfer({
          failureCount: (input.failureCount ?? 0) + 1,
          guests: collected.guests,
          occasion,
          accessibilityNeeds: Boolean(collected.accessibilityNeeds),
        });
        await completeCall(call, {
          stage: transfer.recommend ? "transfer_recommended" : "failed",
          outcome: "create_failed",
          collected,
          transferRecommended: transfer.recommend,
          transferReason: transfer.reason,
          turns: input.turns,
        });
        return turnResult({
          assistantText: transfer.recommend
            ? "I'm having trouble completing that booking. I recommend speaking with our team — would you like me to note that for staff?"
            : "I ran into a problem saving that reservation. Shall we try again with a different time?",
          stage: transfer.recommend ? "transfer_recommended" : "failed",
          workflow: "create",
          missingFields: [],
          reservation: null,
          confirmationCode: null,
          transferRecommended: transfer.recommend,
          transferReason: transfer.reason,
          upsellHint: null,
          callId: call.id,
          awaitingConfirmation: false,
        });
      }

      if (!result.ok) {
        if (/waitlist/i.test(result.message)) {
          await updateReservationCall(call.id, { stage: "checking_availability", workflow: "waitlist" });
          return turnResult({
            assistantText: result.message,
            stage: "checking_availability",
            workflow: "waitlist",
            missingFields: result.missingFields,
            reservation: null,
            confirmationCode: null,
            transferRecommended: false,
            transferReason: null,
            upsellHint: null,
            callId: call.id,
            awaitingConfirmation: false,
          });
        }
        const transfer = shouldRecommendHumanTransfer({
          failureCount: (input.failureCount ?? 0) + 1,
          guests: collected.guests,
          occasion,
        });
        await completeCall(call, {
          stage: "failed",
          outcome: "create_failed",
          collected,
          transferRecommended: transfer.recommend,
          transferReason: transfer.reason,
          turns: input.turns,
        });
        return turnResult({
          assistantText: result.message || "I couldn't complete that reservation. Shall we try another time?",
          stage: "failed",
          workflow: "create",
          missingFields: result.missingFields,
          reservation: null,
          confirmationCode: null,
          transferRecommended: transfer.recommend,
          transferReason: transfer.reason,
          upsellHint: null,
          callId: call.id,
          awaitingConfirmation: false,
        });
      }

      const code = result.reservation?.confirmationCode ?? null;
      const upsells = suggestUpsells({
        occasion,
        guests: collected.guests,
        specialRequests: collected.specialRequests,
      });
      const upsellHint = upsells[0]?.message ?? null;
      const transfer = shouldRecommendHumanTransfer({
        guests: collected.guests,
        occasion,
        accessibilityNeeds: Boolean(collected.accessibilityNeeds),
        isVip: false,
      });
      let text = formatSuccessConfirmation({
        confirmationCode: code,
        message: result.message,
        collected,
      });
      if (upsellHint) text = `${text} ${upsellHint}`;
      if (transfer.recommend) {
        text = `${text} For this type of booking, our team can also help personally if you'd like.`;
      }

      await completeCall(call, {
        stage: transfer.recommend ? "transfer_recommended" : "completed",
        outcome: "created",
        reservationId: result.reservation?.id ?? null,
        confirmationCode: code,
        collected,
        transferRecommended: transfer.recommend,
        transferReason: transfer.reason,
        turns: input.turns,
        confidence: 0.9,
      });

      return turnResult({
        assistantText: text,
        stage: transfer.recommend ? "transfer_recommended" : "completed",
        workflow: "create",
        missingFields: [],
        reservation: result.reservation,
        confirmationCode: code,
        transferRecommended: transfer.recommend,
        transferReason: transfer.reason,
        upsellHint,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }

    if (negative(input.message)) {
      await updateReservationCall(call.id, {
        stage: "collecting",
        pendingConfirmation: false,
        collected,
      });
      return turnResult({
        assistantText: "No problem — what would you like to change: the date, time, number of guests, or location?",
        stage: "collecting",
        workflow: "create",
        missingFields: collection.missing,
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }

    // Ambiguous reply while confirming — re-ask
    return turnResult({
      assistantText: buildConfirmationSummary({ collected, occasion }),
      stage: "confirming",
      workflow: "create",
      missingFields: [],
      reservation: null,
      confirmationCode: null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: call.id,
      awaitingConfirmation: true,
    });
  }

  // --- Waitlist acceptance after full book ---
  if ((call.workflow === "waitlist" || wantsWaitlist(input.message)) && (wantsWaitlist(input.message) || call.workflow === "waitlist")) {
    if (collection.missing.filter((f) => f !== "date" && f !== "time").length && !affirmative(input.message)) {
      await updateReservationCall(call.id, { workflow: "waitlist", stage: "collecting", collected });
      return turnResult({
        assistantText: collection.nextQuestion ?? "I can add you to the waitlist — may I have your name and phone number?",
        stage: "collecting",
        workflow: "waitlist",
        missingFields: collection.missing,
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    const wl = await runWaitlistWorkflow({
      locationId: collected.locationId,
      fields: collected,
      message: input.message,
      conversationId: input.conversationId,
      sessionId: input.sessionId,
      history,
    });
    await completeCall(call, {
      stage: wl.ok ? "waitlisted" : "failed",
      outcome: wl.ok ? "waitlisted" : "waitlist_failed",
      collected,
      turns: input.turns,
    });
    return turnResult({
      assistantText: wl.message,
      stage: wl.ok ? "waitlisted" : "failed",
      workflow: "waitlist",
      missingFields: wl.missingFields,
      reservation: null,
      confirmationCode: null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: call.id,
      awaitingConfirmation: false,
    });
  }

  // --- Cancel ---
  if (workflow === "cancel") {
    if (!collected.phone && !collected.confirmationCode) {
      await updateReservationCall(call.id, { workflow: "cancel", stage: "collecting", collected });
      return turnResult({
        assistantText: "I can cancel that for you. What's the phone number or confirmation code on the reservation?",
        stage: "collecting",
        workflow: "cancel",
        missingFields: ["phone"],
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    const result = await runCancellationWorkflow({
      locationId: collected.locationId,
      fields: collected,
      message: input.message,
      conversationId: input.conversationId,
      history,
    });
    if (!result.ok) {
      return turnResult({
        assistantText: result.message + " Could you share another detail so I can find it?",
        stage: "collecting",
        workflow: "cancel",
        missingFields: result.missingFields,
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    await completeCall(call, {
      stage: "cancelled",
      outcome: "cancelled",
      reservationId: result.reservation?.id ?? null,
      confirmationCode: result.reservation?.confirmationCode ?? null,
      collected,
      turns: input.turns,
    });
    return turnResult({
      assistantText: `${result.message} Would you like to book another visit another time?`,
      stage: "cancelled",
      workflow: "cancel",
      missingFields: [],
      reservation: result.reservation,
      confirmationCode: result.reservation?.confirmationCode ?? null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: call.id,
      awaitingConfirmation: false,
    });
  }

  // --- Modify ---
  if (workflow === "modify") {
    if (!collected.phone && !collected.confirmationCode) {
      await updateReservationCall(call.id, { workflow: "modify", stage: "collecting", collected });
      return turnResult({
        assistantText: "Sure — I can update that. What's the phone number or confirmation code for your reservation?",
        stage: "collecting",
        workflow: "modify",
        missingFields: ["phone"],
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    if (!collected.date && !collected.time && !collected.guests) {
      return turnResult({
        assistantText: "What would you like to change — the date, time, or number of guests?",
        stage: "collecting",
        workflow: "modify",
        missingFields: [],
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    const { result, availabilityBlocked, alternatives } = await runModificationWorkflow({
      locationId: collected.locationId,
      fields: collected,
      message: input.message,
      conversationId: input.conversationId,
      history,
    });
    if (availabilityBlocked) {
      const alts = alternatives.length ? ` Nearby options: ${alternatives.slice(0, 3).join(", ")}.` : "";
      return turnResult({
        assistantText: `${result.message}${alts}`,
        stage: "checking_availability",
        workflow: "modify",
        missingFields: [],
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    if (!result.ok) {
      return turnResult({
        assistantText: result.message,
        stage: "collecting",
        workflow: "modify",
        missingFields: result.missingFields,
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    await completeCall(call, {
      stage: "completed",
      outcome: "modified",
      reservationId: result.reservation?.id ?? null,
      confirmationCode: result.reservation?.confirmationCode ?? null,
      collected,
      turns: input.turns,
    });
    return turnResult({
      assistantText: formatSuccessConfirmation({
        confirmationCode: result.reservation?.confirmationCode,
        message: result.message,
        collected,
      }),
      stage: "completed",
      workflow: "modify",
      missingFields: [],
      reservation: result.reservation,
      confirmationCode: result.reservation?.confirmationCode ?? null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: call.id,
      awaitingConfirmation: false,
    });
  }

  // --- Lookup ---
  if (workflow === "lookup") {
    const result = await executeReservation({
      action: "lookup",
      locationId: collected.locationId,
      fields: collected,
      message: input.message,
      conversationId: input.conversationId,
      history,
    });
    if (!result.ok && result.missingFields.length) {
      return turnResult({
        assistantText: result.followUpQuestion ?? result.message,
        stage: "collecting",
        workflow: "lookup",
        missingFields: result.missingFields,
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    await completeCall(call, {
      stage: result.ok ? "completed" : "failed",
      outcome: result.ok ? "lookup_ok" : "lookup_failed",
      reservationId: result.reservation?.id ?? null,
      confirmationCode: result.reservation?.confirmationCode ?? null,
      collected,
      turns: input.turns,
    });
    return turnResult({
      assistantText: result.message,
      stage: result.ok ? "completed" : "failed",
      workflow: "lookup",
      missingFields: [],
      reservation: result.reservation,
      confirmationCode: result.reservation?.confirmationCode ?? null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: call.id,
      awaitingConfirmation: false,
    });
  }

  // --- Availability-only ---
  if (workflow === "availability") {
    if (!collected.date) {
      return turnResult({
        assistantText: "Sure — what date would you like me to check?",
        stage: "collecting",
        workflow: "availability",
        missingFields: ["date"],
        reservation: null,
        confirmationCode: null,
        transferRecommended: false,
        transferReason: null,
        upsellHint: null,
        callId: call.id,
        awaitingConfirmation: false,
      });
    }
    const avail = await checkLiveAvailability({
      locationId: collected.locationId,
      date: collected.date,
      time: collected.time,
      guests: collected.guests,
    });
    const loc = locationDisplayName(collected.locationId);
    let text: string;
    if (!avail.restaurantOpen) {
      text = avail.reason ?? `We're not open for reservations at ${loc} that day.`;
    } else if (collected.time) {
      text = avail.available
        ? `Yes — ${collected.time} is available at ${loc} on ${collected.date}. Shall I book that for you?`
        : `${avail.reason ?? "That time isn't free."}${
            avail.alternatives.length ? ` I have ${avail.alternatives.slice(0, 4).join(", ")}.` : ""
          } Would you like one of those, or join the waitlist?`;
    } else {
      text = avail.alternatives.length
        ? `At ${loc} on ${collected.date}, I have ${avail.alternatives.slice(0, 6).join(", ")}. What time works for you?`
        : `I don't see open tables at ${loc} on ${collected.date}. Would another day or the waitlist help?`;
    }
    await updateReservationCall(call.id, {
      stage: "checking_availability",
      collected,
      workflow: avail.available && collected.time ? "create" : "availability",
    });
    return turnResult({
      assistantText: text,
      stage: "checking_availability",
      workflow: "availability",
      missingFields: [],
      reservation: null,
      confirmationCode: null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: null,
      callId: call.id,
      awaitingConfirmation: false,
    });
  }

  // --- Create: collect missing fields ---
  if (collection.missing.length) {
    await updateReservationCall(call.id, { stage: "collecting", workflow: "create", collected });
    const softUpsell =
      !collection.missing.includes("guests") && occasion
        ? suggestUpsells({ occasion, guests: collected.guests, specialRequests: collected.specialRequests })[0]
            ?.message
        : null;
    let question = collection.nextQuestion ?? "Could you share a bit more so I can book that for you?";
    // Soft occasion acknowledgment once
    if (occasion && collection.missing[0] === "guests") {
      question = `Wonderful — a ${occasion.replace(/_/g, " ")}. ${question}`;
    }
    return turnResult({
      assistantText: softUpsell && collection.missing.length <= 2 ? `${question} ${softUpsell}` : question,
      stage: "collecting",
      workflow: "create",
      missingFields: collection.missing,
      reservation: null,
      confirmationCode: null,
      transferRecommended: false,
      transferReason: null,
      upsellHint: softUpsell,
      callId: call.id,
      awaitingConfirmation: false,
    });
  }

  // All required fields present → confirm before create
  await updateReservationCall(call.id, {
    stage: "confirming",
    pendingConfirmation: true,
    collected,
    workflow: "create",
  });
  await insertReservationEvent(call.id, call.sessionId, "awaiting_confirmation", { collected });

  return turnResult({
    assistantText: buildConfirmationSummary({ collected, occasion }),
    stage: "confirming",
    workflow: "create",
    missingFields: [],
    reservation: null,
    confirmationCode: null,
    transferRecommended: false,
    transferReason: null,
    upsellHint: null,
    callId: call.id,
    awaitingConfirmation: true,
  });
}

export { isReservationIntent, detectWorkflow };
