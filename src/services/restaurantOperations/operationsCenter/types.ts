/**
 * Restaurant Operations Center — types.
 * Aggregates existing modules; never owns domain logic.
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged" | "assigned" | "resolved";

export type OpsKpiSnapshot = {
  todaysReservations: number;
  guestsSeated: number;
  walkIns: number;
  availableTables: number;
  occupiedTables: number;
  waitlist: number;
  todaysCatering: number;
  upcomingEvents: number;
  vipArrivals: number;
  aiConversations: number;
  pendingApprovals: number;
  workflowFailures: number;
  openTasks: number;
  healthScore: number;
};

export type OpsTrendPoint = { label: string; value: number };

export type ExecutiveDashboard = {
  locationId: string;
  asOf: string;
  kpis: OpsKpiSnapshot;
  trends: {
    today: OpsTrendPoint[];
    week: OpsTrendPoint[];
    month: OpsTrendPoint[];
  };
};

export type LiveOperationsView = {
  reservationTimeline: Array<{
    id: string;
    time: string;
    name: string;
    guests: number;
    status: string;
    late?: boolean;
  }>;
  tableOccupancy: Array<{ id: string; tableNumber: string; status: string; capacity: number }>;
  waitlist: Array<{ id: string; name: string; partySize: number; position: number }>;
  cateringProgress: Array<{ id: string; title: string; stage: string; eventDate: string | null }>;
  workflowStatus: Array<{ id: string; status: string; startedAt: string }>;
  openTasks: number;
};

export type Customer360View = {
  customerId: string;
  profile: Record<string, unknown>;
  journeyStage: string | null;
  relationshipScore: number;
  loyalty: Record<string, unknown> | null;
  preferences: Record<string, string>;
  memory: Array<Record<string, unknown>>;
  visits: Array<Record<string, unknown>>;
  recommendations: string[];
  birthdaySoon: boolean;
  anniversarySoon: boolean;
  timeline: Array<Record<string, unknown>>;
  currentReservationId: string | null;
  currentEventId: string | null;
  openTasks: string[];
  upcomingCampaigns: string[];
};

export type OpsInsight = {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  module: string;
};

export type OpsAlert = {
  id: string;
  locationId: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  body: string | null;
  status: AlertStatus;
  assignedTo: string | null;
  sourceModule: string | null;
  sourceEntityId: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export type HealthReport = {
  overallScore: number;
  subscores: {
    reservation: number;
    workflow: number;
    satisfaction: number;
    journey: number;
    retention: number;
    waitlist: number;
    utilization: number;
    approvalSla: number;
    aiConfidence: number;
    knowledge: number;
  };
  suggestions: string[];
  recordedAt: string;
};

export type ForecastDay = {
  date: string;
  expectedReservations: number;
  busyHours: string[];
  tableDemand: number;
  cateringVolume: number;
  staffRequired: number;
  returnRate: number;
  waitlistProbability: number;
  isPeakDay: boolean;
  holidayDemand: boolean;
};

export type PerformanceMetrics = {
  reservationConversion: number;
  customerRetention: number;
  journeyProgression: number;
  workflowSuccess: number;
  avgApprovalPending: number;
  taskCompletion: number;
  openEscalations: number;
};

export type OpsReport = {
  id: string;
  locationId: string | null;
  reportType: string;
  category: string;
  title: string;
  format: string;
  content: string | null;
  status: string;
  createdAt: string;
};

export type OpsAnnouncement = {
  id: string;
  locationId: string | null;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
};

export type RealtimeEvent = {
  id: string;
  at: string;
  type: string;
  title: string;
  source: string;
};

export type SearchHit = {
  module: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type CopilotReply = {
  answer: string;
  planId: string | null;
  intent: string | null;
  usedModules: string[];
  contextSummary: string;
};
