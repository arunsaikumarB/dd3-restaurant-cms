import { handleChefGaaScheduledSync } from "../../src/integrations/chefgaa/automation/handler";

export default async function handler() {
  const result = await handleChefGaaScheduledSync();
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

export const config = {
  schedule: "*/15 * * * *",
};
