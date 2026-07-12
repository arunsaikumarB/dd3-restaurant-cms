/**
 * Restaurant Reservation Platform — types.
 * Single engine for Website AI, Admin, Staff (Voice/Mobile later).
 */

export type ReservationAction =
  | "create"
  | "modify"
  | "cancel"
  | "lookup"
  | "availability"
  | "waitlist"
  | "confirm"
  | "reject"
  | "reschedule"
  | "collect";

export type OpsReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rejected"
  | "no_show";

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning" | "maintenance";

export type SeatingPreference = "any" | "indoor" | "outdoor" | "booth" | "window" | "vip" | "private";

export type ReservationGuestInput = {
  locationId: string;
  date?: string;
  time?: string;
  guests?: number;
  customerName?: string;
  phone?: string;
  email?: string;
  occasion?: string;
  specialRequests?: string;
  accessibilityNeeds?: string;
  highChair?: boolean;
  outdoor?: boolean;
  indoor?: boolean;
  booth?: boolean;
  window?: boolean;
  dietaryRestrictions?: string[];
  childrenCount?: number;
  confirmationCode?: string;
  reservationId?: string;
  source?: string;
  conversationId?: string | null;
  seatingPreference?: SeatingPreference;
};

export type MissingReservationField =
  | "date"
  | "time"
  | "guests"
  | "customerName"
  | "phone"
  | "email"
  | "outlet";

export type RestaurantTable = {
  id: string;
  locationId: string;
  tableNumber: string;
  capacity: number;
  indoor: boolean;
  outdoor: boolean;
  booth: boolean;
  windowSeat: boolean;
  vip: boolean;
  privateRoom: boolean;
  status: TableStatus;
  posX: number;
  posY: number;
  active: boolean;
};

export type ReservationRecord = {
  id: string;
  locationId: string;
  customerName: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  guests: number;
  status: OpsReservationStatus;
  specialRequest: string | null;
  confirmationCode: string | null;
  occasion: string | null;
  tableId: string | null;
  source: string | null;
  highChair: boolean;
  outdoorRequested: boolean | null;
  boothRequested: boolean | null;
  windowRequested: boolean | null;
  dietaryRestrictions: string[];
  childrenCount: number;
  noShow: boolean;
  createdAt: string;
};

export type AvailabilitySlot = {
  time: string;
  available: boolean;
  remainingCovers: number;
  reason?: string;
};

export type WaitlistEntry = {
  id: string;
  locationId: string;
  guestName: string;
  phone: string;
  partySize: number;
  queuePosition: number;
  estimatedWaitMinutes: number | null;
  priority: number;
  status: string;
  preferredDate: string | null;
  preferredTime: string | null;
};

export type ReservationSettings = {
  locationId: string;
  defaultDurationMinutes: number;
  bufferMinutes: number;
  maxGuests: number;
  minGuests: number;
  advanceBookingDays: number;
  sameDayCutoffTime: string | null;
  depositRequired: boolean;
  allowWaitlist: boolean;
  peakHours: string[];
  holidayDates: string[];
  blockedDates: string[];
};

export type ReservationEngineResult = {
  ok: boolean;
  action: ReservationAction;
  missingFields: MissingReservationField[];
  followUpQuestion: string | null;
  reservation: ReservationRecord | null;
  slots: AvailabilitySlot[];
  waitlist: WaitlistEntry | null;
  message: string;
  data?: Record<string, unknown>;
};

export type ReservationAnalyticsSummary = {
  todaysCount: number;
  upcomingCount: number;
  noShows: number;
  avgPartySize: number;
  cancellationRate: number;
  occupancyEstimate: number;
  waitlistConversion: number;
  peakHours: Array<{ label: string; value: number }>;
  sources: Array<{ label: string; value: number }>;
  tableUtilization: number;
};
