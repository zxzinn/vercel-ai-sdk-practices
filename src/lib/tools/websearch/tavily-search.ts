import type { LanguageModelV2Source } from "@ai-sdk/provider";
import { generateId } from "@ai-sdk/provider-utils";
import { tavily } from "@tavily/core";
import { z } from "zod";
import {
  createMissingApiKeyResponse,
  createNoResultsResponse,
  createSearchErrorResponse,
} from "./error-handler";

export const tavilySearch = {
  description: "Search the web for up-to-date information using Tavily",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({
    query,
  }: {
    query: string;
  }): Promise<{ text: string; sources: LanguageModelV2Source[] }> => {
    try {
      if (!process.env.TAVILY_API_KEY) {
        return createMissingApiKeyResponse("Tavily", query);
      }

      const tavilyClient = tavily({
        apiKey: process.env.TAVILY_API_KEY,
      });

      const response = await tavilyClient.search(query, {
        max_results: 5,
        include_answer: true,
        include_raw_content: false,
        include_images: false,
      });

      if (!response.results || response.results.length === 0) {
        return createNoResultsResponse("Tavily", query);
      }

      // Format results for LLM
      const resultsText = response.results
        .map(
          (result, index) =>
            `${index + 1}. **${result.title}**\n   URL: ${result.url}\n   ${result.content.substring(0, 300)}...`,
        )
        .join("\n\n");

      const searchSummary = `Search results for "${query}":\n\n${resultsText}`;

      const finalText = response.answer
        ? `${searchSummary}\n\n**Summary:** ${response.answer}`
        : searchSummary;

      const sources = response.results.map((result) => ({
        type: "source" as const,
        sourceType: "url" as const,
        id: generateId(),
        url: result.url,
        title: result.title,
      }));

      return {
        text: finalText,
        sources,
      };
    } catch (error) {
      return createSearchErrorResponse("Tavily", query, error);
    }
  },
};
