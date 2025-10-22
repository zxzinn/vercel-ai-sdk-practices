import { DataType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import { embed, embedMany, SerialJobExecutor } from "ai";
import { env } from "@/lib/env";
import type {
  DocumentMetadata,
  MilvusSearchResult,
  RAGDocument,
  RAGIngestOptions,
  RAGIngestResult,
  RAGQueryOptions,
  RAGQueryResult,
  RAGSource,
} from "./types";

const EMBEDDING_MODEL = "cohere/embed-v4.0";
const EMBEDDING_DIMENSION = 1536; // Cohere embed-v4.0 default dimension
const DEFAULT_COLLECTION = "rag_documents";
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

export class RAGService {
  private milvusClient: MilvusClient | null = null;
  private ingestExecutor: SerialJobExecutor = new SerialJobExecutor();

  private getClient(): MilvusClient {
    if (!this.milvusClient) {
      const milvusUrl = env.MILVUS_URL;
      const milvusToken = env.MILVUS_TOKEN;

      if (!milvusUrl || !milvusToken) {
        throw new Error(
          "MILVUS_URL and MILVUS_TOKEN environment variables are required",
        );
      }

      this.milvusClient = new MilvusClient({
        address: milvusUrl,
        token: milvusToken,
        database: env.MILVUS_DATABASE,
        ssl: true,
      });
    }

    return this.milvusClient;
  }

  private async ensureCollection(name: string): Promise<void> {
    const client = this.getClient();

    try {
      // Check if collection exists
      const hasCollection = await client.hasCollection({
        collection_name: name,
      });

      if (hasCollection.value) {
        return;
      }

      // Create collection with schema
      await client.createCollection({
        collection_name: name,
        description: "RAG document collection",
        fields: [
          {
            name: "id",
            description: "Chunk ID",
            data_type: DataType.VarChar,
            is_primary_key: true,
            max_length: 255,
          },
          {
            name: "vector",
            description: "Embedding vector",
            data_type: DataType.FloatVector,
            dim: EMBEDDING_DIMENSION,
          },
          {
            name: "content",
            description: "Text content",
            data_type: DataType.VarChar,
            max_length: 65535,
          },
          {
            name: "metadata",
            description: "Document metadata",
            data_type: DataType.JSON,
          },
        ],
      });

      // Create HNSW index for vector field
      await client.createIndex({
        collection_name: name,
        field_name: "vector",
        index_type: "HNSW",
        metric_type: "IP", // Inner Product (cosine similarity)
        params: {
          M: 16,
          efConstruction: 200,
        },
      });

      // Load collection into memory for search
      await client.loadCollection({
        collection_name: name,
      });

      console.log(`✅ Created and loaded collection: ${name}`);
    } catch (error) {
      console.error(`Failed to ensure collection ${name}:`, error);
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
    // Use SerialJobExecutor to ensure sequential processing
    // This prevents concurrent embedding conflicts and ensures proper ordering
    let result: RAGIngestResult | undefined;

    await this.ingestExecutor.run(async () => {
      const {
        collectionName = DEFAULT_COLLECTION,
        chunkSize = DEFAULT_CHUNK_SIZE,
        chunkOverlap = DEFAULT_CHUNK_OVERLAP,
      } = options;

      await this.ensureCollection(collectionName);

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

      console.log(`Generating embeddings for ${allChunks.length} chunks...`);
      const { embeddings } = await embedMany({
        model: EMBEDDING_MODEL,
        values: allChunks,
      });

      // Insert data into Milvus
      const insertData = allIds.map((id, index) => ({
        id,
        vector: embeddings[index],
        content: allChunks[index],
        metadata: allMetadatas[index],
      }));

      await this.getClient().insert({
        collection_name: collectionName,
        data: insertData,
      });

      console.log(
        `✅ Indexed ${allChunks.length} chunks into ${collectionName}`,
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
    queryText: string,
    options: RAGQueryOptions = {},
  ): Promise<RAGQueryResult> {
    const {
      topK = 5,
      scoreThreshold = 0,
      collectionName = DEFAULT_COLLECTION,
    } = options;

    await this.ensureCollection(collectionName);

    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: queryText,
    });

    // Search in Milvus
    const searchResults = await this.getClient().search({
      collection_name: collectionName,
      vector: embedding,
      limit: topK,
      output_fields: ["id", "content", "metadata"],
      params: {
        ef: Math.max(64, topK * 4),
      },
    });

    const sources: RAGSource[] = [];

    for (const result of searchResults.results as MilvusSearchResult[]) {
      const score = result.score;

      if (score < scoreThreshold) continue;

      const metadata = result.metadata as Record<string, unknown>;

      sources.push({
        id: result.id,
        content: result.content,
        score,
        distance: 1 - score, // Convert IP score back to distance
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
            metadata.totalChunks !== undefined && metadata.totalChunks !== null
              ? Number(metadata.totalChunks)
              : undefined,
        } as DocumentMetadata,
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
    await this.ensureCollection(collectionName);

    // Delete all chunks for this document
    const filter = `metadata["originalDocId"] == "${documentId}"`;

    await this.getClient().delete({
      collection_name: collectionName,
      filter,
    });

    console.log(`✅ Deleted chunks for document ${documentId}`);
  }

  async clearCollection(
    collectionName: string = DEFAULT_COLLECTION,
  ): Promise<void> {
    const client = this.getClient();

    try {
      const hasCollection = await client.hasCollection({
        collection_name: collectionName,
      });

      if (hasCollection.value) {
        await client.dropCollection({
          collection_name: collectionName,
        });
        console.log(`✅ Cleared collection: ${collectionName}`);
      }
    } catch (error) {
      console.error(`Failed to clear collection ${collectionName}:`, error);
    }
  }

  async listCollections(): Promise<string[]> {
    const result = await this.getClient().listCollections();
    return result.data.map((c) => c.name);
  }
}

export const ragService = new RAGService();
