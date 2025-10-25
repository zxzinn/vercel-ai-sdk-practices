import { perplexity } from "@ai-sdk/perplexity";
import type { LanguageModelV2Source } from "@ai-sdk/provider";
import { generateText } from "ai";
import { z } from "zod";
import {
  createMissingApiKeyResponse,
  createNoResultsResponse,
  createSearchErrorResponse,
} from "./error-handler";

export const perplexitySearch = {
  description:
    "Search the web for up-to-date information using Perplexity Sonar",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({
    query,
  }: {
    query: string;
  }): Promise<{ text: string; sources: LanguageModelV2Source[] }> => {
    try {
      if (!process.env.PERPLEXITY_API_KEY) {
        return createMissingApiKeyResponse("Perplexity", query);
      }

      const { text, sources } = await generateText({
        model: perplexity("sonar-pro"),
        prompt: query,
      });

      if (!text) {
        return createNoResultsResponse("Perplexity", query);
      }

      return {
        text: `Search results for "${query}" (via Perplexity Sonar):\n\n${text}`,
        sources: sources || [],
      };
    } catch (error) {
      return createSearchErrorResponse("Perplexity", query, error);
    }
  },
};
