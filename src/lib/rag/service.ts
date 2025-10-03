import { embed, embedMany } from "ai";
import { ChromaClient, type Collection } from "chromadb";
import { env } from "@/lib/env";
import type {
  ChromaQueryResult,
  DocumentMetadata,
  RAGDocument,
  RAGIngestOptions,
  RAGIngestResult,
  RAGQueryOptions,
  RAGQueryResult,
  RAGSource,
} from "./types";

const EMBEDDING_MODEL = "cohere/embed-v4.0";
const DEFAULT_COLLECTION = "rag_documents";
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

const customEmbeddingFunction = {
  generate: async () => [],
};

export class RAGService {
  private chromaClient: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    const url = new URL(env.CHROMA_URL);
    this.chromaClient = new ChromaClient({
      host: url.hostname,
      port: Number(url.port) || (url.protocol === "https:" ? 443 : 8000),
      ssl: url.protocol === "https:",
    });
  }

  private async getCollection(name: string): Promise<Collection> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name,
        embeddingFunction: customEmbeddingFunction,
        metadata: { description: "RAG document collection" },
      });

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      console.error(`Failed to get/create collection ${name}:`, error);
      throw error;
    }
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
    documents: RAGDocument[],
    options: RAGIngestOptions = {},
  ): Promise<RAGIngestResult> {
    const {
      collectionName = DEFAULT_COLLECTION,
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    } = options;

    const collection = await this.getCollection(collectionName);

    const allChunks: string[] = [];
    const allIds: string[] = [];
    const allMetadatas: Record<string, string | number | boolean | null>[] = [];

    for (const doc of documents) {
      const chunks = this.chunkText(doc.content, chunkSize, chunkOverlap);

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

    console.log(`Generating embeddings for ${allChunks.length} chunks...`);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: allChunks,
    });

    await collection.add({
      ids: allIds,
      embeddings,
      documents: allChunks,
      metadatas: allMetadatas,
    });

    console.log(`✅ Indexed ${allChunks.length} chunks into ${collectionName}`);

    return {
      documentIds: documents.map((d) => d.id),
      totalChunks: allChunks.length,
      collectionName,
    };
  }

  async query(
    queryText: string,
    options: RAGQueryOptions = {},
  ): Promise<RAGQueryResult> {
    const {
      topK = 5,
      scoreThreshold = 0,
      collectionName = DEFAULT_COLLECTION,
    } = options;

    const collection = await this.getCollection(collectionName);

    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: queryText,
    });

    const results = (await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    })) as ChromaQueryResult;

    const sources: RAGSource[] = [];

    if (results.documents[0]) {
      results.documents[0].forEach((doc, index) => {
        if (!doc) return;

        const distance = results.distances?.[0]?.[index] ?? 0;
        const score = 1 / (1 + distance);

        if (score < scoreThreshold) return;

        const metadata = (results.metadatas?.[0]?.[index] ?? {}) as Record<
          string,
          unknown
        >;
        const id = results.ids?.[0]?.[index] || `unknown-${index}`;

        sources.push({
          id,
          content: doc,
          score,
          distance,
          metadata: {
            ...metadata,
            filename:
              typeof metadata.filename === "string"
                ? metadata.filename
                : "unknown",
            fileType:
              typeof metadata.fileType === "string"
                ? metadata.fileType
                : "unknown",
            uploadedAt:
              typeof metadata.uploadedAt === "string"
                ? new Date(metadata.uploadedAt)
                : new Date(),
            size:
              typeof metadata.size === "number"
                ? metadata.size
                : Number(metadata.size ?? 0) || 0,
            chunkIndex:
              metadata.chunkIndex !== undefined && metadata.chunkIndex !== null
                ? Number(metadata.chunkIndex)
                : undefined,
            totalChunks:
              metadata.totalChunks !== undefined &&
              metadata.totalChunks !== null
                ? Number(metadata.totalChunks)
                : undefined,
          } as DocumentMetadata,
        });
      });
    }

    return {
      sources,
      query: queryText,
      totalResults: sources.length,
    };
  }

  async deleteDocument(
    documentId: string,
    collectionName: string = DEFAULT_COLLECTION,
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);

    const results = await collection.get({
      where: { originalDocId: documentId },
    });

    if (results.ids.length > 0) {
      await collection.delete({
        ids: results.ids,
      });
      console.log(
        `✅ Deleted ${results.ids.length} chunks for doc ${documentId}`,
      );
    }
  }

  async clearCollection(
    collectionName: string = DEFAULT_COLLECTION,
  ): Promise<void> {
    try {
      await this.chromaClient.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      console.log(`✅ Cleared collection: ${collectionName}`);
    } catch (error) {
      console.error(`Failed to clear collection ${collectionName}:`, error);
    }
  }

  async listCollections(): Promise<string[]> {
    const collections = await this.chromaClient.listCollections();
    return collections.map((c) => c.name);
  }
}

export const ragService = new RAGService();
