import type { ProviderRuntimeConfig } from "../../../src/config/ai/providerConfig";
import { readServerAIConfig } from "../../../src/config/ai/providerConfig";

export { readServerAIConfig, type ProviderRuntimeConfig };

export function resolveRequestModel(
  bodyModel: string | undefined,
  config: ProviderRuntimeConfig,
  provider: string,
): string {
  if (bodyModel?.trim()) return bodyModel.trim();
  if (provider === "gemini") return config.gemini.model;
  if (provider === "openai") return config.openai.model;
  if (provider === "claude") return config.claude.model;
  return config.gemini.model;
}
