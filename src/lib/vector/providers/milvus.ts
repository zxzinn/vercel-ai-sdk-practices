import { DataType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import type {
  CollectionSchema,
  IVectorProvider,
  MilvusConfig,
  SearchOptions,
  SearchResult,
  VectorDocument,
} from "../types";

interface MilvusSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, unknown>;
}

export class MilvusProvider implements IVectorProvider {
  readonly name = "MILVUS" as const;
  private client: MilvusClient | null = null;
  private config: MilvusConfig | null = null;

  async initialize(config: Record<string, unknown>): Promise<void> {
    // Validate and cast config
    if (!config.url || typeof config.url !== "string") {
      throw new Error("Milvus URL is required");
    }
    if (!config.token || typeof config.token !== "string") {
      throw new Error("Milvus token is required");
    }

    this.config = config as unknown as MilvusConfig;

    this.client = new MilvusClient({
      address: this.config.url,
      token: this.config.token,
      database: this.config.database || "default",
      ssl: true,
    });
  }

  private getClient(): MilvusClient {
    if (!this.client) {
      throw new Error(
        "Milvus client not initialized. Call initialize() first.",
      );
    }
    return this.client;
  }

  async hasCollection(name: string): Promise<boolean> {
    const result = await this.getClient().hasCollection({
      collection_name: name,
    });
    return Boolean(result.value);
  }

  async createCollection(schema: CollectionSchema): Promise<void> {
    const exists = await this.hasCollection(schema.name);
    if (exists) {
      console.log(`Collection ${schema.name} already exists`);
      return;
    }

    // Create collection with schema
    await this.getClient().createCollection({
      collection_name: schema.name,
      description: schema.description || "Vector collection",
      fields: [
        {
          name: "id",
          description: "Primary key",
          data_type: DataType.VarChar,
          is_primary_key: true,
          max_length: 255,
        },
        {
          name: "vector",
          description: "Embedding vector",
          data_type: DataType.FloatVector,
          dim: schema.dimension,
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

    // Create index
    const indexType = this.config?.indexType || "HNSW";
    const metricType = this.config?.metricType || "IP";

    await this.getClient().createIndex({
      collection_name: schema.name,
      field_name: "vector",
      index_type: indexType,
      metric_type: metricType,
      params:
        indexType === "HNSW"
          ? {
              M: this.config?.M || 16,
              efConstruction: this.config?.efConstruction || 200,
            }
          : {},
    });

    // Load collection into memory
    await this.getClient().loadCollection({
      collection_name: schema.name,
    });

    console.log(`✅ Created Milvus collection: ${schema.name}`);
  }

  async deleteCollection(name: string): Promise<void> {
    const exists = await this.hasCollection(name);
    if (!exists) {
      return;
    }

    await this.getClient().dropCollection({
      collection_name: name,
    });

    console.log(`✅ Deleted Milvus collection: ${name}`);
  }

  async listCollections(): Promise<string[]> {
    const result = await this.getClient().listCollections();
    return result.data.map((c) => c.name);
  }

  async insert(
    collectionName: string,
    documents: VectorDocument[],
  ): Promise<void> {
    if (documents.length === 0) return;

    const insertData = documents.map((doc) => ({
      id: doc.id,
      vector: doc.vector,
      content: doc.content,
      metadata: doc.metadata,
    }));

    await this.getClient().insert({
      collection_name: collectionName,
      data: insertData,
    });
  }

  /**
   * Escape special characters in filter values to prevent expression injection
   */
  private escapeFilterValue(value: string): string {
    // Escape backslashes and double quotes
    return value.replace(/[\\"]/g, "\\$&");
  }

  async delete(
    collectionName: string,
    filter: Record<string, unknown>,
  ): Promise<void> {
    // Convert filter to Milvus expression
    // For now, support simple filters like { originalDocId: "xxx" }
    let expr = "";

    if (filter.originalDocId) {
      if (typeof filter.originalDocId !== "string") {
        throw new Error("originalDocId must be a string");
      }
      const escapedValue = this.escapeFilterValue(filter.originalDocId);
      expr = `metadata["originalDocId"] == "${escapedValue}"`;
    } else if (filter.id) {
      if (typeof filter.id !== "string") {
        throw new Error("id must be a string");
      }
      const escapedValue = this.escapeFilterValue(filter.id);
      expr = `id == "${escapedValue}"`;
    } else {
      throw new Error("Unsupported filter format for Milvus delete");
    }

    await this.getClient().delete({
      collection_name: collectionName,
      filter: expr,
    });
  }

  async search(
    collectionName: string,
    vector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const { topK = 5, scoreThreshold = 0, ef } = options;

    const searchResults = await this.getClient().search({
      collection_name: collectionName,
      vector,
      limit: topK,
      output_fields: ["id", "content", "metadata"],
      params: {
        ef: ef || Math.max(64, topK * 4),
      },
    });

    const results: SearchResult[] = [];

    for (const result of searchResults.results as MilvusSearchResult[]) {
      if (result.score < scoreThreshold) continue;

      results.push({
        id: result.id,
        content: result.content,
        score: result.score,
        distance: 1 - result.score, // IP score to distance
        metadata: result.metadata,
      });
    }

    return results;
  }

  async getCollectionStats(
    name: string,
  ): Promise<{ count: number; dimension: number }> {
    const stats = await this.getClient().getCollectionStatistics({
      collection_name: name,
    });

    // Milvus returns stats in a specific format
    const count = Number(stats.data.row_count) || 0;

    // Get dimension from collection schema
    const desc = await this.getClient().describeCollection({
      collection_name: name,
    });

    const vectorField = desc.schema.fields.find((f) => {
      const dataType = f.data_type as unknown;
      return (
        dataType === DataType.FloatVector || String(dataType) === "FloatVector"
      );
    });
    const dimension = Number(vectorField?.dim) || 0;

    return { count, dimension };
  }

  async cleanup(): Promise<void> {
    this.client = null;
    this.config = null;
  }
}
