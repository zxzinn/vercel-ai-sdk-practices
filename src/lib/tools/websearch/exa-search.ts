import { generateId } from "@ai-sdk/provider-utils";
import Exa from "exa-js";
import { z } from "zod";
import {
  createMissingApiKeyResponse,
  createNoResultsResponse,
  createSearchErrorResponse,
} from "./error-handler";
import type { WebSearchToolResult } from "./types";

export const exaSearch = {
  description: "Search the web for up-to-date information using Exa",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({
    query,
  }: {
    query: string;
  }): Promise<WebSearchToolResult> => {
    try {
      if (!process.env.EXA_API_KEY) {
        return createMissingApiKeyResponse("Exa", query);
      }

      const exaClient = new Exa(process.env.EXA_API_KEY);

      const response = await exaClient.searchAndContents(query, {
        livecrawl: "always",
        numResults: 5,
        text: {
          maxCharacters: 1000,
          includeHtmlTags: false,
        },
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 2,
        },
      });

      if (!response.results || response.results.length === 0) {
        return createNoResultsResponse("Exa", query);
      }

      // Format results for LLM
      const resultsText = response.results
        .map((result, index) => {
          const content =
            result.text ||
            result.highlights?.join(" ") ||
            "No content available";
          const truncatedContent =
            content.length > 300 ? `${content.substring(0, 300)}...` : content;

          return `${index + 1}. **${result.title}**\n   URL: ${result.url}\n   ${truncatedContent}`;
        })
        .join("\n\n");

      const searchSummary = `Search results for "${query}" (via Exa):\n\n${resultsText}`;

      const sources = response.results.map((result) => ({
        type: "source" as const,
        sourceType: "url" as const,
        id: generateId(),
        url: result.url,
        title: result.title || undefined,
      }));

      return {
        text: searchSummary,
        sources,
      };
    } catch (error) {
      return createSearchErrorResponse("Exa", query, error);
    }
  },
};
