import { tavily } from "@tavily/core";
import { z } from "zod";

export const tavilySearch = {
  description: "Search the web for up-to-date information using Tavily",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      if (!process.env.TAVILY_API_KEY) {
        return `I apologize, but web search is currently unavailable (API key not configured). Let me help you with the information I already have about "${query}".`;
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
        return `I searched for "${query}" but didn't find any relevant results. Let me try to help you with my existing knowledge instead.`;
      }

      // Format results for LLM
      const resultsText = response.results
        .map(
          (result, index) =>
            `${index + 1}. **${result.title}**\n   URL: ${result.url}\n   ${result.content.substring(0, 300)}...`,
        )
        .join("\n\n");

      const searchSummary = `Search results for "${query}":\n\n${resultsText}`;

      if (response.answer) {
        return `${searchSummary}\n\n**Summary:** ${response.answer}`;
      }

      return searchSummary;
    } catch (error) {
      console.error("Tavily search error:", error);
      return `I encountered an issue while searching for "${query}". Let me try to help you with my existing knowledge instead.`;
    }
  },
};
