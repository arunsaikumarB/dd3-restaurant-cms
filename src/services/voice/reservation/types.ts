/**
 * Voice Reservation Agent — conversation orchestration types.
 * Reservation truth lives in Restaurant Operations Reservation Engine.
 */

import type { ReservationGuestInput, ReservationRecord } from "../../restaurantOperations/reservations/types";

export type VoiceReservationWorkflow =
  | "create"
  | "modify"
  | "cancel"
  | "lookup"
  | "availability"
  | "waitlist";

export type VoiceReservationStage =
  | "idle"
  | "collecting"
  | "checking_availability"
  | "confirming"
  | "executing"
  | "upselling"
  | "completed"
  | "failed"
  | "waitlisted"
  | "cancelled"
  | "transfer_recommended";

export type CollectedReservation = ReservationGuestInput & {
  verified?: boolean;
  outletConfirmed?: boolean;
};

export type VoiceReservationCall = {
  id: string;
  sessionId: string;
  locationId: string;
  conversationId: string | null;
  workflow: VoiceReservationWorkflow;
  stage: VoiceReservationStage;
  collected: CollectedReservation;
  pendingConfirmation: boolean;
  reservationId: string | null;
  confirmationCode: string | null;
  outcome: string | null;
  transferRecommended: boolean;
  transferReason: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type VoiceReservationTurnResult = {
  handled: boolean;
  assistantText: string;
  stage: VoiceReservationStage;
  workflow: VoiceReservationWorkflow;
  missingFields: string[];
  reservation: ReservationRecord | null;
  confirmationCode: string | null;
  transferRecommended: boolean;
  transferReason: string | null;
  upsellHint: string | null;
  callId: string | null;
  awaitingConfirmation: boolean;
};

export type OccasionKind =
  | "birthday"
  | "anniversary"
  | "business"
  | "date_night"
  | "graduation"
  | "family"
  | "corporate"
  | "wedding"
  | "baby_shower"
  | null;

export type UpsellSuggestion = {
  kind: string;
  message: string;
};
