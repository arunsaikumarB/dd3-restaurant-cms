/**
 * Enterprise Workflow Automation — types.
 * Event-driven; does not redesign Reservation / CRM / Events / AI cores.
 */

export type DomainEventSource =
  | "reservations"
  | "crm"
  | "catering"
  | "ai_planner"
  | "reflection"
  | "knowledge"
  | "pos"
  | "payments"
  | "voice"
  | "reviews"
  | "system";

export type DomainEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "duplicate"
  | "ignored";

export type WorkflowInstanceStatus =
  | "running"
  | "completed"
  | "failed"
  | "retried"
  | "cancelled"
  | "paused"
  | "waiting_approval"
  | "waiting_delay";

export type WorkflowNodeType =
  | "trigger"
  | "condition"
  | "decision"
  | "task"
  | "notification"
  | "approval"
  | "delay"
  | "parallel"
  | "merge"
  | "end";

export type RuleOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "exists" | "contains";

export type DomainEventType =
  | "ReservationCreated"
  | "ReservationModified"
  | "ReservationCancelled"
  | "ReservationCheckedIn"
  | "ReservationCompleted"
  | "CustomerCreated"
  | "CustomerUpdated"
  | "CustomerBirthday"
  | "LeadQualified"
  | "ProposalGenerated"
  | "QuoteApproved"
  | "EventConfirmed"
  | "PaymentReceived"
  | "ReviewSubmitted"
  | "ComplaintRaised"
  | "LoyaltyTierChanged"
  | "PlannerGoalCompleted"
  | "ReflectionEscalated"
  | string;

export type DomainEvent = {
  id: string;
  eventType: DomainEventType;
  source: DomainEventSource;
  entityType: string | null;
  entityId: string | null;
  locationId: string | null;
  payload: Record<string, unknown>;
  version: number;
  correlationId: string | null;
  idempotencyKey: string | null;
  status: DomainEventStatus;
  processedAt: string | null;
  createdAt: string;
};

export type PublishEventInput = {
  eventType: DomainEventType;
  source: DomainEventSource;
  entityType?: string | null;
  entityId?: string | null;
  locationId?: string | null;
  payload?: Record<string, unknown>;
  version?: number;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  config?: Record<string, unknown>;
};

export type WorkflowEdge = {
  from: string;
  to: string;
  when?: string;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowDefinition = {
  id: string;
  locationId: string | null;
  code: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  active: boolean;
  currentVersion: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowVersion = {
  id: string;
  definitionId: string;
  version: number;
  graph: WorkflowGraph;
  rules: unknown[];
  published: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type WorkflowInstance = {
  id: string;
  definitionId: string;
  versionId: string | null;
  eventId: string | null;
  locationId: string | null;
  status: WorkflowInstanceStatus;
  currentNode: string | null;
  context: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  retryCount: number;
};

export type WorkflowStep = {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeType: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  attempt: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
};

export type WorkflowTask = {
  id: string;
  instanceId: string | null;
  locationId: string | null;
  title: string;
  description: string | null;
  department: string;
  ownerName: string | null;
  priority: string;
  status: string;
  dueAt: string | null;
  dependsOn: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
};

export type WorkflowApproval = {
  id: string;
  instanceId: string | null;
  locationId: string | null;
  title: string;
  stage: string;
  status: string;
  actor: string | null;
  comment: string | null;
  timeoutAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type WorkflowNotification = {
  id: string;
  instanceId: string | null;
  locationId: string | null;
  channel: string;
  templateKey: string | null;
  recipient: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  retryCount: number;
  error: string | null;
  createdAt: string;
};

export type WorkflowRule = {
  id: string;
  locationId: string | null;
  code: string;
  name: string;
  description: string | null;
  eventType: string | null;
  condition: { field?: string; op?: RuleOperator; value?: unknown };
  action: Record<string, unknown>;
  active: boolean;
  priority: number;
};

export type DeadLetterItem = {
  id: string;
  instanceId: string | null;
  eventId: string | null;
  locationId: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  status: string;
  retryCount: number;
  createdAt: string;
  resolvedAt: string | null;
};

export type EventRegistryEntry = {
  id: string;
  eventType: string;
  source: string;
  description: string | null;
  active: boolean;
};

export type WorkflowSettings = {
  id: string;
  locationId: string;
  maxRetries: number;
  defaultTimeoutMinutes: number;
  enableAutomation: boolean;
  metadata: Record<string, unknown>;
};

export type WorkflowAnalyticsSnapshot = {
  executions: number;
  successRate: number;
  failureRate: number;
  avgDurationSeconds: number;
  retries: number;
  pendingTasks: number;
  pendingApprovals: number;
  notificationSuccessRate: number;
  mostUsed: Array<{ code: string; name: string; count: number }>;
  deadLetters: number;
  departmentWorkload: Array<{ department: string; count: number }>;
};
