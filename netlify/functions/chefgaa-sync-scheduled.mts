import { handleChefGaaScheduledSync } from "../../src/integrations/chefgaa/automation/handler";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async () => {
  try {
    const result = await handleChefGaaScheduledSync();
    return json(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scheduled ChefGaa sync failed";
    console.error("chefgaa-sync-scheduled error:", message);
    return json({ status: "failed", message, error: message }, 500);
  }
};

export const config = {
  schedule: "*/15 * * * *",
};
