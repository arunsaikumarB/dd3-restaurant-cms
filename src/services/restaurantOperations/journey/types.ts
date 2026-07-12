/**
 * Enterprise Customer Journey Engine — types.
 */

export type JourneyStageCode =
  | "visitor"
  | "first_reservation"
  | "first_visit"
  | "returning"
  | "frequent"
  | "vip"
  | "loyal"
  | "inactive"
  | "at_risk"
  | "win_back"
  | "reactivated"
  | "advocate"
  | string;

export type JourneyRuleOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "exists" | "contains";

export type JourneyCondition =
  | { field?: string; op?: JourneyRuleOp; value?: unknown }
  | { all: JourneyCondition[] }
  | { any: JourneyCondition[] };

export type JourneySignals = {
  customerId: string;
  locationId: string;
  reservationCount: number;
  visitCount: number;
  daysSinceLastVisit: number | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  isVip: boolean;
  cancelCount: number;
  noShowCount: number;
  cateringCount: number;
  positiveReviews: number;
  negativeReviews: number;
  aiInteractions: number;
  familyVisits: number;
  birthdayInDays: number | null;
  anniversaryInDays: number | null;
  occasionHints: string[];
};

export type JourneyScores = {
  engagementScore: number;
  visitScore: number;
  loyaltyScore: number;
  aiScore: number;
  reviewScore: number;
  cancellationRisk: number;
  churnRisk: number;
  retentionScore: number;
  relationshipScore: number;
};

export type JourneyStage = {
  id: string;
  locationId: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
};

export type JourneyRule = {
  id: string;
  locationId: string | null;
  code: string;
  name: string;
  fromStage: string | null;
  toStage: string;
  condition: JourneyCondition;
  priority: number;
  active: boolean;
};

export type CustomerJourney = {
  id: string;
  locationId: string;
  customerId: string;
  stageCode: string;
  previousStage: string | null;
  scores: JourneyScores;
  nextBestAction: string | null;
  nextBestActionReason: string | null;
  segmentCodes: string[];
  metadata: Record<string, unknown>;
  stageChangedAt: string;
  updatedAt: string;
};

export type JourneyMilestone = {
  id: string;
  locationId: string | null;
  customerId: string;
  milestoneCode: string;
  title: string;
  achievedAt: string;
  metadata: Record<string, unknown>;
};

export type JourneyRecommendation = {
  id: string;
  locationId: string | null;
  customerId: string;
  actionCode: string;
  title: string;
  reason: string | null;
  priority: number;
  status: string;
  createdAt: string;
};

export type JourneyEvent = {
  id: string;
  locationId: string | null;
  customerId: string | null;
  eventType: string;
  title: string;
  summary: string | null;
  source: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type JourneySegment = {
  id: string;
  locationId: string | null;
  code: string;
  name: string;
  description: string | null;
  condition: JourneyCondition;
  active: boolean;
};

export type JourneyDefinition = {
  id: string;
  locationId: string | null;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  currentVersion: number;
  graph: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
};

export type JourneySettings = {
  id: string;
  locationId: string;
  inactiveDays: number;
  atRiskDays: number;
  vipVisitThreshold: number;
  frequentVisitThreshold: number;
  enableCampaigns: boolean;
};

export type JourneyContextPackage = {
  customerId: string | null;
  stage: string | null;
  stageName: string | null;
  relationshipScore: number;
  engagementScore: number;
  churnRisk: number;
  retentionScore: number;
  nextBestAction: string | null;
  nextBestActionReason: string | null;
  milestones: string[];
  upcomingMilestones: string[];
  riskScore: number;
  recommendedOffers: string[];
  segments: string[];
  summary: string;
};

export type JourneyAnalyticsSnapshot = {
  totalJourneys: number;
  retentionRate: number;
  repeatVisitRate: number;
  churnRiskCount: number;
  vipGrowth: number;
  stageDistribution: Array<{ stage: string; count: number }>;
  milestoneCompletions: number;
  campaignTriggers: number;
  avgRelationshipScore: number;
  topSegments: Array<{ code: string; count: number }>;
};
