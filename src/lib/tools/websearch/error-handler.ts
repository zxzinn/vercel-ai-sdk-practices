import type { LanguageModelV2Source } from "@ai-sdk/provider";

export function createMissingApiKeyResponse(
  providerName: string,
  query: string,
): { text: string; sources: LanguageModelV2Source[] } {
  return {
    text: `I apologize, but web search via ${providerName} is currently unavailable (API key not configured). Let me help you with the information I already have about "${query}".`,
    sources: [],
  };
}

export function createNoResultsResponse(
  providerName: string,
  query: string,
): { text: string; sources: LanguageModelV2Source[] } {
  return {
    text: `I searched for "${query}" using ${providerName} but didn't find any relevant results. Let me try to help you with my existing knowledge instead.`,
    sources: [],
  };
}

export function createSearchErrorResponse(
  providerName: string,
  query: string,
  error: unknown,
): { text: string; sources: LanguageModelV2Source[] } {
  console.error(`${providerName} search error:`, error);
  return {
    text: `I encountered an issue while searching for "${query}" with ${providerName}. Let me try to help you with my existing knowledge instead.`,
    sources: [],
  };
}
