import { DEFAULT_PUBLIC_LOCATION_ID, isLocationId } from "../config/locations";
import type { LocationId } from "../config/locations";
import { createClientIfConfigured } from "../lib/supabase/client";
import type { ContactEnquiryInsert } from "../types/database";
import { mapSupabaseError } from "../utils/supabase/errors";

export type EnquirySource = "contact" | "catering";

export interface PublicEnquiryPayload {
  source: EnquirySource;
  location_id: LocationId | string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  event_type?: string;
  event_date?: string;
  guest_count?: number;
}

function resolveLocationId(locationId: LocationId | string | null | undefined): LocationId {
  if (locationId && isLocationId(locationId)) return locationId;
  return DEFAULT_PUBLIC_LOCATION_ID;
}

function toInsertRow(payload: PublicEnquiryPayload): ContactEnquiryInsert {
  const guestCount =
    payload.guest_count != null && Number.isFinite(payload.guest_count)
      ? Math.max(1, Math.floor(payload.guest_count))
      : null;

  return {
    location_id: resolveLocationId(payload.location_id),
    source: payload.source,
    name: payload.name.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    message: payload.message.trim(),
    event_type: payload.event_type?.trim() || null,
    event_date: payload.event_date?.trim() || null,
    guest_count: guestCount,
    status: "new",
  };
}

/** Anonymous contact / catering forms — RLS requires status = new. */
export async function createPublicEnquiry(payload: PublicEnquiryPayload): Promise<void> {
  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const row = toInsertRow(payload);
  const { error } = await (
    supabase.from("contact_enquiries") as unknown as {
      insert(row: ContactEnquiryInsert): Promise<{ error: { message: string; code?: string } | null }>;
    }
  ).insert(row);

  if (error) {
    throw new Error(mapSupabaseError(error, "submit enquiry"));
  }
}
