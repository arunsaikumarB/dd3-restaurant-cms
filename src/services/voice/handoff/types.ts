/**
 * Human Handoff & Live Staff Collaboration — types.
 * AI remains on the call until staff accepts; no outbound dialing in this phase.
 */

export type HandoffStaffRole =
  | "super_admin"
  | "manager"
  | "host"
  | "reservations"
  | "support"
  | "staff"
  | "catering"
  | "events";

export type AgentAvailability = "available" | "busy" | "offline" | "away";

export type EscalationScenario =
  | "manager_request"
  | "complaint"
  | "refund"
  | "vip"
  | "large_party"
  | "corporate"
  | "wedding"
  | "accessibility"
  | "complex_reservation"
  | "misunderstanding"
  | "low_confidence"
  | "no_knowledge"
  | "payment_issue"
  | "emergency"
  | "staff_requested"
  | "reservation_transfer"
  | "other";

export type EscalationStatus =
  | "recommended"
  | "queued"
  | "transferring"
  | "accepted"
  | "completed"
  | "cancelled"
  | "failed"
  | "callback";

export type TransferMode = "warm" | "cold" | "supervisor" | "conference";

export type TransferStatus =
  | "waiting"
  | "ringing"
  | "accepted"
  | "rejected"
  | "missed"
  | "completed"
  | "failed";

export type TaskType =
  | "callback"
  | "follow_up"
  | "manager_review"
  | "refund_review"
  | "complaint_ticket"
  | "vip_follow_up"
  | "reservation_confirmation";

export type VoiceDepartment = {
  id: string;
  locationId: string;
  code: string;
  name: string;
  description: string | null;
  priorityDefault: number;
  active: boolean;
};

export type VoiceLiveAgent = {
  id: string;
  locationId: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  departmentCode: string;
  role: HandoffStaffRole;
  status: AgentAvailability;
  maxConcurrent: number;
  activeCalls: number;
  lastHeartbeatAt: string | null;
};

export type EscalationRule = {
  id: string;
  locationId: string;
  code: string;
  name: string;
  triggers: string[];
  departmentCode: string;
  priority: number;
  transferMode: TransferMode;
  autoQueue: boolean;
  enabled: boolean;
};

export type VoiceEscalation = {
  id: string;
  sessionId: string;
  locationId: string;
  reason: string;
  scenario: EscalationScenario;
  priority: number;
  departmentCode: string;
  status: EscalationStatus;
  conversationSummary: string | null;
  plannerGoal: string | null;
  reflectionConfidence: number | null;
  reservationStatus: string | null;
  crmSnapshot: Record<string, unknown>;
  customerSentiment: string | null;
  knowledgeUsed: string[];
  suggestedAction: string | null;
  transferMode: TransferMode;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type VoiceTransfer = {
  id: string;
  escalationId: string;
  sessionId: string;
  locationId: string;
  departmentCode: string;
  transferMode: TransferMode;
  status: TransferStatus;
  fromAgent: string;
  toAgentId: string | null;
  acceptedBy: string | null;
  queuedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  waitMs: number;
  contextPayload: TransferContextPayload;
  audit: Array<Record<string, unknown>>;
};

export type TransferContextPayload = {
  customerName?: string | null;
  phone?: string | null;
  language?: string | null;
  currentGoal?: string | null;
  plannerGoal?: string | null;
  plannerOutput?: string | null;
  conversationTimeline?: Array<{ role: string; text: string; at?: string }>;
  reservationStatus?: string | null;
  confirmationCode?: string | null;
  crmProfile?: Record<string, unknown>;
  previousVisits?: unknown[];
  dietaryPreferences?: string[];
  specialRequests?: string | null;
  aiSummary?: string | null;
  suggestedNextAction?: string | null;
  sentiment?: string | null;
  reflectionConfidence?: number | null;
  knowledgeUsed?: string[];
};

export type VoiceCallTask = {
  id: string;
  sessionId: string | null;
  locationId: string;
  escalationId: string | null;
  transferId: string | null;
  taskType: TaskType;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  createdAt: string;
};

export type VoiceStaffNote = {
  id: string;
  sessionId: string;
  locationId: string;
  authorName: string | null;
  note: string;
  createdAt: string;
};

export type CallbackQueueItem = {
  id: string;
  locationId: string;
  sessionId: string | null;
  escalationId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  reason: string | null;
  departmentCode: string;
  priority: number;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
};

export type AgentAssistBundle = {
  suggestedResponses: string[];
  policyReferences: string[];
  ragHints: string[];
  customerHistory: string[];
  reservationInfo: string[];
  currentOffers: string[];
  silent: true;
};

export type WrapUpResult = {
  summary: string;
  outcome: string;
  reservationResult: string | null;
  followUpNeeded: boolean;
  customerSentiment: string;
  agentNotes: string | null;
  suggestedTasks: TaskType[];
};

export type HandoffDashboardSnapshot = {
  activeCalls: number;
  aiHandling: number;
  escalated: number;
  waitingTransfers: number;
  transferred: number;
  completed: number;
  averageWaitMs: number;
  agentsAvailable: number;
  agentsBusy: number;
  agentsOffline: number;
};

export type HandoffAnalyticsSnapshot = {
  escalationRate: number;
  transferRate: number;
  averageHandleTimeMs: number;
  averageWaitMs: number;
  transferSuccess: number;
  missedTransfers: number;
  staffResponseMs: number;
  aiResolutionRate: number;
  humanResolutionRate: number;
  totalEscalations: number;
  totalTransfers: number;
};

export type EscalationEvaluation = {
  shouldEscalate: boolean;
  scenario: EscalationScenario;
  reason: string;
  priority: number;
  departmentCode: string;
  transferMode: TransferMode;
  autoQueue: boolean;
  sentiment: string;
};
