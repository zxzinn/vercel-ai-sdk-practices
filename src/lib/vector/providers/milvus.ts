import type {
  CreateCollectionReq,
  CreateIndexSimpleReq,
  DescribeCollectionResponse,
  FieldType,
} from "@zilliz/milvus2-sdk-node";
import { DataType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import { z } from "zod";
import { normalizeMetricScore } from "../metrics";
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

const MilvusConfigSchema = z.object({
  url: z.string().url("Invalid Milvus URL"),
  token: z.string().min(1, "Milvus token is required"),
  database: z.string().optional(),
  indexType: z
    .enum(["FLAT", "HNSW", "IVF_FLAT", "IVF_SQ8", "IVF_PQ"])
    .optional(),
  metricType: z.enum(["IP", "L2", "COSINE", "HAMMING", "JACCARD"]).optional(),
  M: z.number().int().positive().optional(),
  efConstruction: z.number().int().positive().optional(),
  nlist: z.number().int().positive().optional(),
  nprobe: z.number().int().positive().optional(),
  m: z.number().int().positive().optional(),
  nbits: z.number().int().positive().optional(),
  ef: z.number().int().positive().optional(),
});

export class MilvusProvider implements IVectorProvider {
  readonly name = "MILVUS" as const;
  private client: MilvusClient | null = null;
  private config: MilvusConfig | null = null;

  async initialize(config: Record<string, unknown>): Promise<void> {
    // Validate config using Zod schema
    const validationResult = MilvusConfigSchema.safeParse(config);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid Milvus configuration: ${errors}`);
    }

    this.config = validationResult.data as MilvusConfig;

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

    // Define fields using Milvus SDK FieldType interface
    const fields: FieldType[] = [
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
    ];

    // Create collection using typed request interface
    const createReq: CreateCollectionReq = {
      collection_name: schema.name,
      description: schema.description || "Vector collection",
      fields,
    };

    await this.getClient().createCollection(createReq);

    // Build index parameters based on index type
    const indexType = this.config?.indexType || "HNSW";
    const metricType = this.config?.metricType || "COSINE";

    const indexParams = this.buildIndexParams(indexType);

    // Create index using typed request interface
    const createIndexReq: CreateIndexSimpleReq = {
      collection_name: schema.name,
      field_name: "vector",
      index_type: indexType,
      metric_type: metricType,
      params: indexParams,
    };

    await this.getClient().createIndex(createIndexReq);

    // Load collection into memory
    await this.getClient().loadCollection({
      collection_name: schema.name,
    });

    console.log(`✅ Created Milvus collection: ${schema.name}`);
  }

  /**
   * Build index parameters based on index type
   * Uses Milvus SDK defaults as fallbacks
   */
  private buildIndexParams(
    indexType: "FLAT" | "HNSW" | "IVF_FLAT" | "IVF_SQ8" | "IVF_PQ",
  ): Record<string, unknown> {
    switch (indexType) {
      case "HNSW":
        return {
          M: this.config?.M || 16,
          efConstruction: this.config?.efConstruction || 200,
        };

      case "IVF_FLAT":
      case "IVF_SQ8":
        return {
          nlist: this.config?.nlist || 128,
          nprobe: this.config?.nprobe || 8,
        };

      case "IVF_PQ":
        return {
          nlist: this.config?.nlist || 128,
          m: this.config?.m || 8,
          nbits: this.config?.nbits || 8,
        };

      case "FLAT":
      default:
        return {};
    }
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

    // Build search parameters
    const searchParams = {
      ef: ef || Math.max(64, topK * 4),
    };

    // Perform search using Milvus client
    const searchResults = await this.getClient().search({
      collection_name: collectionName,
      vector,
      limit: topK,
      output_fields: ["id", "content", "metadata"],
      params: searchParams,
    });

    const results: SearchResult[] = [];
    const metricType = this.config?.metricType || "COSINE";

    // Convert Milvus search results to our SearchResult format
    for (const result of searchResults.results as MilvusSearchResult[]) {
      const { score, distance } = normalizeMetricScore(
        result.score,
        metricType as any,
      );

      // Apply threshold (using normalized score)
      if (score < scoreThreshold) continue;

      results.push({
        id: result.id,
        content: result.content,
        score,
        distance,
        metadata: result.metadata,
      });
    }

    return results;
  }

  async getCollectionStats(
    name: string,
  ): Promise<{ count: number; dimension: number }> {
    // Get collection statistics
    const stats = await this.getClient().getCollectionStatistics({
      collection_name: name,
    });
    const count = Number(stats.data.row_count) || 0;

    // Get collection description using typed response
    const desc: DescribeCollectionResponse =
      await this.getClient().describeCollection({
        collection_name: name,
      });

    // Extract vector field dimension from schema
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
