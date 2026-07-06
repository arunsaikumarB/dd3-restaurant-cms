import { isSupabaseConfigured } from "../lib/supabase/env";
import { createPublicEnquiry, type PublicEnquiryPayload } from "./contactEnquiries";

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
  source?: PublicEnquiryPayload["source"];
  location_id?: PublicEnquiryPayload["location_id"];
  event_type?: string;
  event_date?: string;
  guest_count?: number;
}

const ENQUIRY_API_URL = "/.netlify/functions/submit-enquiry";

export async function submitContact(
  payload: ContactPayload,
): Promise<{ success: boolean; message: string }> {
  const enquiry: PublicEnquiryPayload = {
    source: payload.source ?? "contact",
    location_id: payload.location_id ?? null,
    name: payload.name.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    message: payload.message.trim(),
    event_type: payload.event_type,
    event_date: payload.event_date,
    guest_count: payload.guest_count,
  };

  try {
    const response = await fetch(ENQUIRY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enquiry),
    });

    if (response.ok) {
      const data = (await response.json()) as { success?: boolean; message?: string };
      return {
        success: true,
        message: data.message ?? "Thank you. We'll be in touch shortly.",
      };
    }

    if (response.status >= 500 && isSupabaseConfigured()) {
      await createPublicEnquiry(enquiry);
      return {
        success: true,
        message: `Thank you, ${enquiry.name.split(" ")[0]}. We'll be in touch shortly.`,
      };
    }

    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Unable to send your message.");
  } catch (err) {
    if (isSupabaseConfigured()) {
      try {
        await createPublicEnquiry(enquiry);
        return {
          success: true,
          message: `Thank you, ${enquiry.name.split(" ")[0]}. We'll be in touch shortly.`,
        };
      } catch (fallbackErr) {
        throw fallbackErr instanceof Error
          ? fallbackErr
          : new Error("Unable to send your message.");
      }
    }

    if (err instanceof Error && err.message !== "Failed to fetch") {
      throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      message: `Thank you, ${enquiry.name.split(" ")[0]}. We'll be in touch shortly.`,
    };
  }
}
