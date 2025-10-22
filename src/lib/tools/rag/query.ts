import { z } from "zod";
import { ragService } from "@/lib/rag";

/**
 * Create a RAG query tool bound to a specific space
 */
export function createRagQueryTool(boundSpaceId: string) {
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
      try {
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
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use createRagQueryTool() with a spaceId instead
 */
export const ragQuery = createRagQueryTool("");
