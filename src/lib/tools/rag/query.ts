import { z } from "zod";
import { ragService } from "@/lib/rag";
import type { RAGSettings } from "@/types/rag";

/**
 * Create a RAG query tool bound to a specific space
 */
export function createRagQueryTool(
  boundSpaceId: string,
  requestSettings?: RAGSettings,
) {
  return {
    description:
      "Search through uploaded documents and knowledge base using semantic search. " +
      "Use this when the user asks questions about their documents, files, or previously uploaded content. " +
      "Returns relevant text chunks with source information and similarity scores.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant documents"),
      topK: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(5)
        .describe("Number of results to return (default: 5, max: 50)"),
    }),
    execute: async ({ query, topK }: { query: string; topK?: number }) => {
      const spaceId = boundSpaceId;

      // Runtime guard: ensure tool was properly configured with a spaceId
      if (!spaceId) {
        return {
          success: false as const,
          message:
            "RAG is not configured: missing spaceId. Tool must be created with createRagQueryTool(spaceId).",
          query,
          totalResults: 0,
          sources: [],
        };
      }

      try {
        const result = await ragService.query(spaceId, query, {
          topK: requestSettings?.topK ?? topK,
          scoreThreshold: requestSettings?.scoreThreshold,
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
            id: source.id,
            content: source.content,
            score: parseFloat(source.score.toFixed(3)),
            distance: parseFloat(source.distance.toFixed(3)),
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
}
