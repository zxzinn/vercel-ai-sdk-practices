import { perplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";
import { z } from "zod";
import type { WebSearchToolResult } from "./types";

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
  }): Promise<WebSearchToolResult> => {
    try {
      if (!process.env.PERPLEXITY_API_KEY) {
        return {
          text: `I apologize, but web search via Perplexity is currently unavailable (API key not configured). Let me help you with the information I already have about "${query}".`,
          sources: [],
        };
      }

      const { text, sources } = await generateText({
        model: perplexity("sonar-pro"),
        prompt: query,
      });

      if (!text) {
        return {
          text: `I searched for "${query}" using Perplexity but didn't find any relevant results. Let me try to help you with my existing knowledge instead.`,
          sources: [],
        };
      }

      return {
        text: `Search results for "${query}" (via Perplexity Sonar):\n\n${text}`,
        sources: sources || [],
      };
    } catch (error) {
      console.error("Perplexity search error:", error);
      return {
        text: `I encountered an issue while searching for "${query}" with Perplexity. Let me try to help you with my existing knowledge instead.`,
        sources: [],
      };
    }
  },
};
