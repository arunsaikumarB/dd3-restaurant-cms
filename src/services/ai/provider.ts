import { GeminiProvider } from "./providers/geminiProvider";
import { MockClaudeProvider, MockDefaultProvider } from "./providers/mock";
import { OpenAIProvider } from "./providers/openai";
import type { AIProvider } from "./providers/providerTypes";
import type { AIProviderName } from "./types";

export type { AIProvider };

const geminiProvider = new GeminiProvider();
const openaiProvider = new OpenAIProvider();

const providers: Record<AIProviderName, AIProvider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
  claude: new MockClaudeProvider(),
  mock: new MockDefaultProvider(),
};

export function getProviderByName(name: AIProviderName): AIProvider {
  return providers[name] ?? providers.gemini;
}

export function listProviderNames(): AIProviderName[] {
  return Object.keys(providers) as AIProviderName[];
}
