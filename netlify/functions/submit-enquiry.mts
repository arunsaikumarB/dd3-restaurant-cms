import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { DEFAULT_PUBLIC_LOCATION_ID, getLocationConfig, isLocationId } from "../../src/config/locations";
import { buildEnquiryRecipients } from "../../src/config/enquiryRecipients";
import type { Database } from "../../src/types/database";

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
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
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
  const smtpHost = readEnv("SMTP_HOST");
  const smtpUser = readEnv("SMTP_USER");
  const smtpPassword = readEnv("SMTP_PASSWORD");
  if (!smtpHost || !smtpUser || !smtpPassword) return;

  const smtpPort = Number(readEnv("SMTP_PORT")) || 587;
  const fromEmail = readEnv("SMTP_FROM") || smtpUser;
  const testEmail = readEnv("ENQUIRY_NOTIFY_EMAIL") || smtpUser;
  const locationId = isLocationId(data.data.location_id!)
    ? data.data.location_id!
    : DEFAULT_PUBLIC_LOCATION_ID;
  const location = getLocationConfig(locationId);
  const recipients = buildEnquiryRecipients(testEmail);
  const toEmail = recipients[locationId][data.data.source!];

  const isCatering = data.data.source === "catering";
  const subject = isCatering
    ? `New Catering Quote Request — ${location.shortName}`
    : `New Contact Enquiry — ${location.shortName}`;

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

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: data.data.email,
      subject,
      text: detailLines.join("\n"),
    });
  } catch (err) {
    console.error("SMTP email failed:", err instanceof Error ? err.message : err);
  }
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let body: EnquiryBody = {};
  try {
    body = (await req.json()) as EnquiryBody;
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
