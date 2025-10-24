import { embed, embedMany, SerialJobExecutor } from "ai";
import { prisma } from "@/lib/prisma";
import { createVectorProvider } from "@/lib/vector";
import type { IVectorProvider, VectorDocument } from "@/lib/vector/types";
import type {
  DocumentMetadata,
  RAGDocument,
  RAGIngestOptions,
  RAGIngestResult,
  RAGQueryOptions,
  RAGQueryResult,
  RAGSource,
} from "./types";

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// Type-safe metadata parsing helpers
function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function safeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

function parseMetadata(raw: Record<string, unknown>): DocumentMetadata {
  return {
    filename: safeString(raw.filename, "unknown"),
    fileType: safeString(raw.fileType, "unknown"),
    uploadedAt: safeDate(raw.uploadedAt),
    size: safeNumber(raw.size, 0) ?? 0,
    chunkIndex: safeNumber(raw.chunkIndex),
    totalChunks: safeNumber(raw.totalChunks),
  };
}

/**
 * Generate consistent collection name for a space
 * Replaces hyphens with underscores to ensure database compatibility
 * This function must be used everywhere collection names are generated
 * to prevent inconsistencies between different parts of the codebase
 */
export function getCollectionName(spaceId: string): string {
  return `space_${spaceId.replace(/-/g, "_")}`;
}

export class RAGService {
  private ingestExecutor: SerialJobExecutor = new SerialJobExecutor();
  private providerCache: Map<string, IVectorProvider> = new Map();

  /**
   * Get or create vector provider for a space
   */
  private async getProviderForSpace(spaceId: string): Promise<{
    provider: IVectorProvider;
    embeddingModel: string;
    embeddingDim: number;
  }> {
    // Check cache first
    if (this.providerCache.has(spaceId)) {
      const provider = this.providerCache.get(spaceId)!;
      const space = await prisma.space.findUnique({
        where: { id: spaceId },
        select: {
          embeddingModel: {
            select: { id: true, dimensions: true },
          },
          embeddingDim: true,
        },
      });
      if (!space) throw new Error(`Space ${spaceId} not found`);

      // Validate dimension is supported
      if (!space.embeddingModel.dimensions.includes(space.embeddingDim)) {
        throw new Error(
          `Invalid dimension ${space.embeddingDim} for model ${space.embeddingModel.id}. ` +
            `Supported: ${space.embeddingModel.dimensions.join(", ")}`,
        );
      }

      return {
        provider,
        embeddingModel: space.embeddingModel.id,
        embeddingDim: space.embeddingDim,
      };
    }

    // Fetch space configuration from database
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: {
        vectorProvider: true,
        vectorConfig: true,
        embeddingModel: {
          select: {
            id: true,
            name: true,
            dimensions: true,
            maxTokens: true,
          },
        },
        embeddingDim: true,
      },
    });

    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    // Validate dimension is supported
    if (!space.embeddingModel.dimensions.includes(space.embeddingDim)) {
      throw new Error(
        `Invalid dimension ${space.embeddingDim} for model ${space.embeddingModel.id}. ` +
          `Supported: ${space.embeddingModel.dimensions.join(", ")}`,
      );
    }

    // Create provider instance
    const provider = await createVectorProvider(
      space.vectorProvider,
      space.vectorConfig as Record<string, unknown> | null,
    );

    // Cache the provider
    this.providerCache.set(spaceId, provider);

    return {
      provider,
      embeddingModel: space.embeddingModel.id,
      embeddingDim: space.embeddingDim,
    };
  }

  private chunkText(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
      throw new RangeError(`chunkSize must be > 0 (got ${chunkSize})`);
    }
    if (!Number.isFinite(overlap) || overlap < 0) {
      throw new RangeError(`chunkOverlap must be >= 0 (got ${overlap})`);
    }
    if (overlap >= chunkSize) {
      overlap = Math.max(0, Math.floor(chunkSize / 4));
    }
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));

      if (end === text.length) break;
      start += chunkSize - overlap;
    }

    return chunks;
  }

  async ingest(
    spaceId: string,
    documents: RAGDocument[],
    options: RAGIngestOptions = {},
  ): Promise<RAGIngestResult> {
    let result: RAGIngestResult | undefined;

    await this.ingestExecutor.run(async () => {
      const {
        chunkSize = DEFAULT_CHUNK_SIZE,
        chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      } = options;

      // Get provider and config for this space
      const { provider, embeddingModel, embeddingDim } =
        await this.getProviderForSpace(spaceId);

      const collectionName = getCollectionName(spaceId);

      // Ensure collection exists
      const exists = await provider.hasCollection(collectionName);
      if (!exists) {
        await provider.createCollection({
          name: collectionName,
          dimension: embeddingDim,
          description: `Vector collection for space ${spaceId}`,
        });
      }

      // Prepare chunks
      const allChunks: string[] = [];
      const allIds: string[] = [];
      const allMetadatas: Record<string, unknown>[] = [];
      const documentsChunks: Array<{ documentId: string; chunks: number }> = [];

      for (const doc of documents) {
        const chunks = this.chunkText(doc.content, chunkSize, chunkOverlap);

        documentsChunks.push({
          documentId: doc.id,
          chunks: chunks.length,
        });

        chunks.forEach((chunk, index) => {
          allChunks.push(chunk);
          allIds.push(`${doc.id}_chunk_${index}`);
          allMetadatas.push({
            filename: doc.metadata.filename,
            fileType: doc.metadata.fileType,
            size: doc.metadata.size,
            chunkIndex: index,
            totalChunks: chunks.length,
            originalDocId: doc.id,
            uploadedAt: doc.metadata.uploadedAt.toISOString(),
          });
        });
      }

      // Generate embeddings
      console.log(
        `Generating embeddings for ${allChunks.length} chunks using ${embeddingModel}...`,
      );
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: allChunks,
        experimental_telemetry: {
          isEnabled: false,
        },
      });

      // Prepare vector documents
      const vectorDocuments: VectorDocument[] = allIds.map((id, index) => ({
        id,
        vector: embeddings[index],
        content: allChunks[index],
        metadata: allMetadatas[index],
      }));

      // Insert into vector store
      await provider.insert(collectionName, vectorDocuments);

      console.log(
        `✅ Indexed ${allChunks.length} chunks into ${collectionName} using ${provider.name}`,
      );

      result = {
        documentIds: documents.map((d) => d.id),
        totalChunks: allChunks.length,
        collectionName,
        documentsChunks,
      };
    });

    if (!result) {
      throw new Error("Ingest job failed to produce a result");
    }

    return result;
  }

  async query(
    spaceId: string,
    queryText: string,
    options: RAGQueryOptions = {},
  ): Promise<RAGQueryResult> {
    const { topK = 5, scoreThreshold = 0 } = options;

    // Get provider for this space
    const { provider, embeddingModel } =
      await this.getProviderForSpace(spaceId);

    const collectionName = getCollectionName(spaceId);

    // Generate query embedding
    const { embedding } = await embed({
      model: embeddingModel,
      value: queryText,
      experimental_telemetry: {
        isEnabled: false,
      },
    });

    // Search
    const searchResults = await provider.search(collectionName, embedding, {
      topK,
      scoreThreshold,
    });

    // Parse results
    const sources: RAGSource[] = searchResults.map((result) => ({
      id: result.id,
      content: result.content,
      score: result.score,
      distance: result.distance,
      metadata: parseMetadata(result.metadata),
    }));

    return {
      sources,
      query: queryText,
      totalResults: sources.length,
    };
  }

  async deleteDocument(spaceId: string, documentId: string): Promise<void> {
    const { provider } = await this.getProviderForSpace(spaceId);
    const collectionName = getCollectionName(spaceId);

    await provider.delete(collectionName, { originalDocId: documentId });

    console.log(
      `✅ Deleted chunks for document ${documentId} from space ${spaceId}`,
    );
  }

  async clearCollection(spaceId: string): Promise<void> {
    const { provider } = await this.getProviderForSpace(spaceId);
    const collectionName = getCollectionName(spaceId);

    await provider.deleteCollection(collectionName);

    // Clear from cache
    this.providerCache.delete(spaceId);

    console.log(`✅ Cleared collection: ${collectionName}`);
  }

  async listCollections(spaceId: string): Promise<string[]> {
    const { provider } = await this.getProviderForSpace(spaceId);
    return await provider.listCollections();
  }

  /**
   * Clean up all cached providers
   */
  async cleanup(): Promise<void> {
    for (const provider of this.providerCache.values()) {
      await provider.cleanup();
    }
    this.providerCache.clear();
  }
}

// Singleton instance
export const ragService = new RAGService();
