import {
  handleChefGaaScheduledSync,
  handleChefGaaSyncHttpRequest,
  verifyAdminAccessToken,
} from "../../src/integrations/chefgaa/automation/handler";

type HttpEvent = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
};

export default async function handler(event: HttpEvent) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const auth = await verifyAdminAccessToken(token);
  if (!auth.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: auth.error }) };
  }

  let body: { locationId?: string | null } = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const result = await handleChefGaaSyncHttpRequest({
    locationId: (body.locationId as never) ?? null,
    requestedBy: auth.userId ?? null,
  });

  return {
    statusCode: result.status === "completed" || result.status === "queued" ? 200 : 409,
    body: JSON.stringify({
      accepted: result.status === "completed" || result.status === "queued",
      message: result.message,
      status: result.status,
      monitoring: result.monitoring,
    }),
  };
}
