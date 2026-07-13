import {
  handleChefGaaSyncHttpRequest,
  verifyAdminAccessToken,
} from "../../src/integrations/chefgaa/automation/handler";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });

export default async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const auth = await verifyAdminAccessToken(token);
    if (!auth.ok) {
      return json({ accepted: false, error: auth.error, message: auth.error }, 401);
    }

    let body: { locationId?: string | null } = {};
    try {
      body = (await req.json()) as { locationId?: string | null };
    } catch {
      return json({ accepted: false, error: "Invalid JSON body", message: "Invalid JSON body" }, 400);
    }

    const result = await handleChefGaaSyncHttpRequest({
      locationId: (body.locationId as never) ?? null,
      requestedBy: auth.userId ?? null,
    });

    const ok = result.status === "completed" || result.status === "queued";
    return json(
      {
        accepted: ok,
        message: result.message,
        status: result.status,
        monitoring: result.monitoring,
      },
      ok ? 200 : 409,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "ChefGaa sync failed";
    console.error("chefgaa-sync error:", message);
    return json({ accepted: false, error: message, message }, 500);
  }
};
