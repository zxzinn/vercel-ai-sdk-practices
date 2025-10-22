import { z } from "zod";
import { ragService } from "@/lib/rag";

export const ragQuery = {
  description:
    "Search through uploaded documents and knowledge base using semantic search. " +
    "Use this when the user asks questions about their documents, files, or previously uploaded content. " +
    "Returns relevant text chunks with source information and similarity scores.",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant documents"),
    topK: z
      .number()
      .optional()
      .default(5)
      .describe("Number of results to return (default: 5)"),
    spaceId: z
      .string()
      .optional()
      .describe("Specific Space ID to search in (optional)"),
    collectionName: z
      .string()
      .optional()
      .describe("Specific collection to search in (optional)"),
  }),
  execute: async ({
    query,
    topK,
    spaceId,
  }: {
    query: string;
    topK?: number;
    spaceId?: string;
    collectionName?: string;
  }) => {
    try {
      if (!spaceId) {
        return {
          success: false as const,
          message: "spaceId is required to search documents.",
          query,
          totalResults: 0,
          sources: [],
        };
      }

      const result = await ragService.query(spaceId, query, {
        topK,
        scoreThreshold: 0.3,
      });

      if (result.sources.length === 0) {
        return {
          success: false as const,
          message: "No relevant documents found for your query.",
          query,
          totalResults: 0,
          sources: [],
        };
      }

      return {
        success: true as const,
        query,
        totalResults: result.totalResults,
        sources: result.sources.map((source) => ({
          content: source.content,
          score: source.score.toFixed(3),
          distance: source.distance.toFixed(3),
          metadata: {
            filename: source.metadata.filename,
            fileType: source.metadata.fileType,
            chunkIndex: source.metadata.chunkIndex,
            totalChunks: source.metadata.totalChunks,
          },
        })),
      };
    } catch (error) {
      console.error("RAG query error:", error);
      return {
        success: false as const,
        message: `Failed to search documents: ${error instanceof Error ? error.message : "Unknown error"}`,
        query,
        totalResults: 0,
        sources: [],
      };
    }
  },
};
