/**
 * Enterprise Outbound AI Calling Platform — types.
 * Reuses Voice Gateway / Planner / Reservation / CRM / Handoff — no duplicate engines.
 */

export type OutboundCampaignType =
  | "one_time"
  | "scheduled"
  | "recurring"
  | "event_triggered"
  | "crm_triggered"
  | "restaurant_triggered"
  | "ai_recommended";

export type OutboundCallType =
  | "reservation_confirmation"
  | "reservation_reminder"
  | "same_day_reminder"
  | "waitlist_availability"
  | "reservation_modification_followup"
  | "cancellation_confirmation"
  | "birthday_greeting"
  | "anniversary_greeting"
  | "loyalty_reward"
  | "festival_greetings"
  | "special_promotions"
  | "buffet_promotion"
  | "happy_hour_promotion"
  | "event_invitations"
  | "catering_followup"
  | "corporate_event_followup"
  | "private_party_followup"
  | "customer_feedback"
  | "review_request"
  | "lost_customer_reengagement"
  | "missed_call_callback"
  | "manual_staff_call"
  | "future_campaign";

export type OutboundCampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type OutboundCallStatus =
  | "queued"
  | "dialing"
  | "ringing"
  | "answered"
  | "voicemail"
  | "busy"
  | "rejected"
  | "no_answer"
  | "transferred"
  | "completed"
  | "failed"
  | "opted_out"
  | "compliance_blocked";

export type OutboundTriggerCode =
  | "reservation_created"
  | "reservation_tomorrow"
  | "reservation_today"
  | "birthday"
  | "anniversary"
  | "no_visit_90_days"
  | "loyalty_milestone"
  | "new_offer_published"
  | "waitlist_available"
  | "manager_requested_callback"
  | "customer_requested_callback"
  | "missed_call"
  | "failed_reservation"
  | "crm_segment";

export type AudienceFilter = {
  locationId?: string;
  vipOnly?: boolean;
  loyaltyTier?: string[];
  preferredOutlet?: string;
  language?: string;
  minVisits?: number;
  maxDaysSinceVisit?: number;
  minDaysSinceVisit?: number;
  birthdayMonth?: number;
  anniversaryMonth?: number;
  segment?: string;
  phones?: string[];
  customerIds?: string[];
  reservationDate?: string;
  hasUpcomingReservation?: boolean;
};

export type RetryPolicy = {
  maxAttempts: number;
  retryDelayMinutes: number;
  respectBusinessHours: boolean;
  retryScheduleHours?: number[];
};

export type CampaignSchedule = {
  startAt?: string | null;
  timezone?: string;
  recurringCron?: string | null;
  immediate?: boolean;
};

export type OutboundCampaign = {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  campaignType: OutboundCampaignType;
  callType: OutboundCallType;
  status: OutboundCampaignStatus;
  triggerCode: OutboundTriggerCode | null;
  audienceFilter: AudienceFilter;
  schedule: CampaignSchedule;
  retryPolicy: RetryPolicy;
  templateId: string | null;
  transferMode: string;
  approvalRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CampaignTemplate = {
  id: string;
  locationId: string;
  code: string;
  name: string;
  callType: string;
  scriptHint: string | null;
  voicemailHint: string | null;
  variables: string[];
  active: boolean;
};

export type CampaignRun = {
  id: string;
  campaignId: string;
  locationId: string;
  status: string;
  audienceCount: number;
  placedCount: number;
  answeredCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type OutboundCall = {
  id: string;
  campaignId: string | null;
  runId: string | null;
  sessionId: string | null;
  locationId: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string;
  callType: OutboundCallType | string;
  status: OutboundCallStatus;
  outcome: string | null;
  attempt: number;
  maxAttempts: number;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number;
  scriptText: string | null;
  voicemailText: string | null;
  reservationId: string | null;
  confirmationCode: string | null;
  plannerGoal: string | null;
  contextPayload: Record<string, unknown>;
  createdAt: string;
};

export type OutboundCompliance = {
  id: string;
  locationId: string;
  callingHoursStart: string;
  callingHoursEnd: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  requireConsent: boolean;
  requireRecordingConsent: boolean;
  holidayDates: string[];
  countryCode: string;
};

export type OptOutRecord = {
  id: string;
  locationId: string | null;
  phone: string;
  email: string | null;
  reason: string | null;
  active: boolean;
  createdAt: string;
};

export type AudienceMember = {
  customerId: string | null;
  name: string;
  phone: string;
  email: string | null;
  language: string;
  isVip: boolean;
  locationId: string | null;
  reservationId?: string | null;
  confirmationCode?: string | null;
  reservationDate?: string | null;
  reservationTime?: string | null;
  guests?: number | null;
  vars?: Record<string, string>;
};

export type OutboundAnalyticsSnapshot = {
  callsPlaced: number;
  callsAnswered: number;
  answerRate: number;
  confirmations: number;
  modifications: number;
  cancellations: number;
  conversions: number;
  voicemails: number;
  retries: number;
  optOuts: number;
  averageDurationMs: number;
  campaignSuccessRate: number;
};

export type ScriptContext = {
  name: string;
  outlet: string;
  date?: string;
  time?: string;
  guests?: number | string;
  confirmationCode?: string;
  offer?: string;
  partySize?: string;
  language?: string;
  callType: string;
  scriptHint?: string | null;
};
