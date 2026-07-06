import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PUBLIC_LOCATION_ID, getLocationConfig, isLocationId } from "../../src/config/locations";
import type { Database } from "../../src/types/database";

type HttpEvent = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
};

type EnquiryBody = {
  source?: "contact" | "catering";
  location_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  event_type?: string;
  event_date?: string;
  guest_count?: number | string;
};

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function validateBody(body: EnquiryBody): { ok: true; data: Required<Pick<EnquiryBody, "name" | "email" | "phone" | "message">> & EnquiryBody } | { ok: false; error: string } {
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name) return { ok: false, error: "Name is required." };
  if (!email || !email.includes("@")) return { ok: false, error: "A valid email is required." };
  if (!phone) return { ok: false, error: "Phone is required." };
  if (!message) return { ok: false, error: "Message is required." };

  const source = body.source === "catering" ? "catering" : "contact";
  const locationId = body.location_id && isLocationId(body.location_id)
    ? body.location_id
    : DEFAULT_PUBLIC_LOCATION_ID;

  const guestCountRaw = body.guest_count;
  const guestCount =
    guestCountRaw == null || guestCountRaw === ""
      ? null
      : Math.max(1, Math.floor(Number(guestCountRaw)));

  if (guestCountRaw != null && guestCountRaw !== "" && !Number.isFinite(guestCount)) {
    return { ok: false, error: "Guest count must be a number." };
  }

  return {
    ok: true,
    data: {
      source,
      location_id: locationId,
      name,
      email,
      phone,
      message,
      event_type: body.event_type?.trim() || undefined,
      event_date: body.event_date?.trim() || undefined,
      guest_count: guestCount ?? undefined,
    },
  };
}

async function insertEnquiry(data: ReturnType<typeof validateBody> & { ok: true }) {
  const url = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase is not configured on the server.");
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.from("contact_enquiries").insert({
    location_id: data.data.location_id!,
    source: data.data.source!,
    name: data.data.name,
    email: data.data.email,
    phone: data.data.phone,
    message: data.data.message,
    event_type: data.data.event_type ?? null,
    event_date: data.data.event_date ?? null,
    guest_count: data.data.guest_count ?? null,
    status: "new",
  });

  if (error) {
    throw new Error(error.message || "Unable to save enquiry.");
  }
}

async function sendEnquiryEmail(data: ReturnType<typeof validateBody> & { ok: true }) {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) return;

  const fromEmail = readEnv("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
  const fallbackNotify = readEnv("ENQUIRY_NOTIFY_EMAIL") || "desidhamaka3marketing@gmail.com";
  const location = getLocationConfig(
    isLocationId(data.data.location_id!) ? data.data.location_id! : DEFAULT_PUBLIC_LOCATION_ID,
  );
  const toEmail = location.email || fallbackNotify;

  const isCatering = data.data.source === "catering";
  const subject = isCatering
    ? `Catering enquiry — ${location.shortName} — ${data.data.name}`
    : `Contact enquiry — ${location.shortName} — ${data.data.name}`;

  const detailLines = [
    `Location: ${location.name}`,
    `Source: ${isCatering ? "Catering quote" : "Contact form"}`,
    `Name: ${data.data.name}`,
    `Email: ${data.data.email}`,
    `Phone: ${data.data.phone}`,
  ];

  if (data.data.event_type) detailLines.push(`Event type: ${data.data.event_type}`);
  if (data.data.event_date) detailLines.push(`Event date: ${data.data.event_date}`);
  if (data.data.guest_count) detailLines.push(`Guest count: ${data.data.guest_count}`);

  detailLines.push("", "Message:", data.data.message);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: data.data.email,
      subject,
      text: detailLines.join("\n"),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Resend email failed:", text);
  }
}

export default async function handler(event: HttpEvent) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let body: EnquiryBody = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return jsonResponse(400, { error: validated.error });
  }

  try {
    await insertEnquiry(validated);
    await sendEnquiryEmail(validated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to submit enquiry.";
    return jsonResponse(500, { error: message });
  }

  const firstName = validated.data.name.split(" ")[0];
  return jsonResponse(200, {
    success: true,
    message: `Thank you, ${firstName}. We'll be in touch shortly.`,
  });
}
