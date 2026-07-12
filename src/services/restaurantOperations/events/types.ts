/**
 * Enterprise Catering & Event Management — types.
 * Additive platform; does not redesign Reservation or CRM.
 */

export type EventLeadSource =
  | "website"
  | "ai_chat"
  | "walk_in"
  | "phone"
  | "referral"
  | "other";

export type EventLeadStatus =
  | "new"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "lost";

export type EventLeadPriority = "low" | "medium" | "high" | "urgent";

export type EventType =
  | "birthday"
  | "anniversary"
  | "corporate"
  | "wedding"
  | "reception"
  | "baby_shower"
  | "graduation"
  | "private_dining"
  | "festival"
  | "outdoor_catering"
  | "office_lunch"
  | "buffet"
  | "custom"
  | string;

export type EventWorkflowStage =
  | "inquiry"
  | "qualification"
  | "proposal"
  | "customer_review"
  | "negotiation"
  | "approval"
  | "deposit_pending"
  | "deposit_received"
  | "confirmed"
  | "preparation"
  | "execution"
  | "completed"
  | "feedback";

export type ServingStyle = "buffet" | "plated" | "live_stations" | "mixed" | string;
export type ServiceMode = "delivery" | "pickup" | "on_site" | string;
export type VenueType = "restaurant" | "customer_venue" | "other";

export type CateringAction =
  | "inquire"
  | "qualify"
  | "recommend"
  | "quote"
  | "revise"
  | "approve"
  | "book"
  | "cancel"
  | "status"
  | "packages"
  | "menu";

export type MissingEventField =
  | "outlet"
  | "customerName"
  | "phone"
  | "eventDate"
  | "guestCount"
  | "eventType";

export type EventNeeds = {
  decorations?: boolean;
  cake?: boolean;
  photography?: boolean;
  music?: boolean;
  dj?: boolean;
  projector?: boolean;
  liveCounter?: boolean;
  bar?: boolean;
  kids?: boolean;
};

export type EventLead = {
  id: string;
  locationId: string;
  customerId: string | null;
  customerName: string;
  phone: string | null;
  email: string | null;
  source: EventLeadSource;
  salesOwner: string | null;
  priority: EventLeadPriority;
  status: EventLeadStatus;
  eventType: string | null;
  messagePreview: string | null;
  conversationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EventPackage = {
  id: string;
  locationId: string;
  code: string;
  name: string;
  description: string | null;
  tier: string;
  menuJson: Record<string, unknown>;
  decorJson: Record<string, unknown>;
  staffJson: Record<string, unknown>;
  equipmentJson: Record<string, unknown>;
  durationHours: number;
  minGuests: number;
  basePrice: number;
  pricePerGuest: number;
  addons: Array<{ code: string; label: string; price: number }>;
  active: boolean;
};

export type EventRecord = {
  id: string;
  leadId: string | null;
  locationId: string;
  customerId: string | null;
  title: string;
  eventType: string;
  workflowStage: EventWorkflowStage;
  eventDate: string | null;
  eventTime: string | null;
  guestCount: number | null;
  budget: number | null;
  venueType: VenueType | null;
  venueAddress: string | null;
  cuisine: string | null;
  dietary: string[];
  servingStyle: string | null;
  serviceMode: string | null;
  needs: EventNeeds;
  specialRequests: string | null;
  packageId: string | null;
  depositRequired: number;
  depositReceived: number;
  status: string;
  progressPercent: number;
  conversationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EventMenu = {
  id: string;
  eventId: string | null;
  locationId: string | null;
  name: string;
  starters: string[];
  mains: string[];
  rice: string[];
  breads: string[];
  desserts: string[];
  drinks: string[];
  liveCounters: string[];
  kidsMenu: string[];
  notes: string | null;
};

export type QuoteLineItem = {
  code: string;
  label: string;
  qty: number;
  unitPrice: number;
  total: number;
};

export type EventQuote = {
  id: string;
  eventId: string;
  locationId: string;
  version: number;
  packageId: string | null;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  approvalStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventTask = {
  id: string;
  eventId: string;
  locationId: string | null;
  department: string;
  title: string;
  description: string | null;
  ownerName: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type EventApproval = {
  id: string;
  eventId: string;
  quoteId: string | null;
  stage: string;
  status: string;
  actor: string | null;
  comment: string | null;
  createdAt: string;
};

export type EventCommunication = {
  id: string;
  eventId: string | null;
  leadId: string | null;
  locationId: string | null;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  summary: string | null;
  conversationId: string | null;
  createdAt: string;
};

export type EventDocument = {
  id: string;
  eventId: string | null;
  docType: string;
  title: string;
  content: string | null;
  url: string | null;
  version: number;
  createdAt: string;
};

export type EventSettings = {
  id: string;
  locationId: string;
  taxRate: number;
  serviceChargeRate: number;
  minGuests: number;
  depositPercent: number;
  defaultDurationHours: number;
  metadata: Record<string, unknown>;
};

export type EventRequirements = {
  locationId: string;
  customerName?: string;
  phone?: string;
  email?: string;
  eventType?: string;
  eventDate?: string;
  eventTime?: string;
  guestCount?: number;
  budget?: number;
  venueType?: VenueType;
  venueAddress?: string;
  cuisine?: string;
  dietary?: string[];
  servingStyle?: ServingStyle;
  serviceMode?: ServiceMode;
  needs?: EventNeeds;
  specialRequests?: string;
  packageCode?: string;
  source?: EventLeadSource;
  conversationId?: string | null;
  salesOwner?: string;
  priority?: EventLeadPriority;
};

export type CateringRecommendation = {
  packages: EventPackage[];
  menuHints: string[];
  upsells: string[];
  notes: string[];
};

export type EventEngineResult = {
  ok: boolean;
  action: CateringAction;
  missingFields: MissingEventField[];
  followUpQuestion: string | null;
  message: string;
  lead: EventLead | null;
  event: EventRecord | null;
  quote: EventQuote | null;
  packages: EventPackage[];
  recommendations: CateringRecommendation | null;
  menu: EventMenu | null;
  data?: Record<string, unknown>;
};

export type EventAnalyticsSnapshot = {
  openLeads: number;
  conversionRate: number;
  avgEventSize: number;
  avgRevenue: number;
  popularPackages: Array<{ code: string; name: string; count: number }>;
  leadSources: Array<{ source: string; count: number }>;
  quoteAcceptanceRate: number;
  lostOpportunities: number;
  upcomingEvents: number;
  revenueForecast: number;
  byStage: Array<{ stage: string; count: number }>;
};

export const WORKFLOW_STAGES: EventWorkflowStage[] = [
  "inquiry",
  "qualification",
  "proposal",
  "customer_review",
  "negotiation",
  "approval",
  "deposit_pending",
  "deposit_received",
  "confirmed",
  "preparation",
  "execution",
  "completed",
  "feedback",
];

export const EVENT_TYPE_OPTIONS: EventType[] = [
  "birthday",
  "anniversary",
  "corporate",
  "wedding",
  "reception",
  "baby_shower",
  "graduation",
  "private_dining",
  "festival",
  "outdoor_catering",
  "office_lunch",
  "buffet",
  "custom",
];
