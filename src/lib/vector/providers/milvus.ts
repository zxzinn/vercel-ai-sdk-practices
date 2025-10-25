import type {
  CreateCollectionReq,
  CreateIndexSimpleReq,
  DescribeCollectionResponse,
  FieldType,
} from "@zilliz/milvus2-sdk-node";
import {
  DataType,
  FunctionType,
  IndexType,
  MetricType,
  MilvusClient,
} from "@zilliz/milvus2-sdk-node";
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
  metricType: z.enum(MetricType).optional(),
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

    const enableFullText = this.config?.enableFullTextSearch || false;

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
        description: "Dense embedding vector",
        data_type: DataType.FloatVector,
        dim: schema.dimension,
      },
      {
        name: "content",
        description: "Text content",
        data_type: DataType.VarChar,
        max_length: 65535,
        enable_analyzer: enableFullText,
      },
      {
        name: "metadata",
        description: "Document metadata",
        data_type: DataType.JSON,
      },
    ];

    // Add sparse vector field for BM25
    if (enableFullText) {
      fields.push({
        name: "sparse_vector",
        description: "Sparse vector for BM25 full-text search",
        data_type: DataType.SparseFloatVector,
        is_function_output: true,
      });
    }

    // Create collection using typed request interface
    const createReq: CreateCollectionReq = {
      collection_name: schema.name,
      description: schema.description || "Vector collection",
      fields,
    };

    // Add BM25 function if enabled
    if (enableFullText) {
      createReq.functions = [
        {
          name: "bm25_function",
          description: "BM25 function for full-text search",
          type: FunctionType.BM25,
          input_field_names: ["content"],
          output_field_names: ["sparse_vector"],
          params: {},
        },
      ];
    }

    await this.getClient().createCollection(createReq);

    // Build index parameters based on index type
    const indexType = this.config?.indexType || IndexType.HNSW;
    const metricType = this.config?.metricType || MetricType.COSINE;

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

    // Create BM25 sparse index if enabled
    if (enableFullText) {
      const bm25K1 = this.config?.bm25K1 || 1.5;
      const bm25B = this.config?.bm25B || 0.75;

      await this.getClient().createIndex({
        collection_name: schema.name,
        field_name: "sparse_vector",
        index_type: "SPARSE_INVERTED_INDEX",
        metric_type: "BM25",
        params: {
          drop_ratio_build: 0.3,
          bm25_k1: bm25K1,
          bm25_b: bm25B,
        },
      });
    }

    // Load collection into memory
    await this.getClient().loadCollection({
      collection_name: schema.name,
    });

    console.log(
      `✅ Created Milvus collection: ${schema.name} (BM25: ${enableFullText})`,
    );
  }

  /**
   * Build index parameters based on index type
   * Note: nprobe is a search-time parameter, not an index parameter
   */
  private buildIndexParams(indexType: IndexType): Record<string, unknown> {
    switch (indexType) {
      case IndexType.HNSW:
        return {
          M: this.config?.M || 16,
          efConstruction: this.config?.efConstruction || 200,
        };

      case IndexType.IVF_FLAT:
      case IndexType.IVF_SQ8:
        return {
          nlist: this.config?.nlist || 128,
        };

      case IndexType.IVF_PQ:
        return {
          nlist: this.config?.nlist || 128,
          m: this.config?.m || 8,
          nbits: this.config?.nbits || 8,
        };
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
    const enableFullText = this.config?.enableFullTextSearch || false;

    if (!enableFullText) {
      // Pure vector search (original logic)
      return this.vectorSearch(collectionName, vector, options);
    }

    // Hybrid search (Dense + BM25)
    return this.hybridSearch(collectionName, vector, options);
  }

  /**
   * Pure vector search (original implementation)
   */
  private async vectorSearch(
    collectionName: string,
    vector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const { topK = 5, scoreThreshold = 0, ef } = options;

    // Build search parameters based on index type
    const indexType = this.config?.indexType || "HNSW";
    const searchParams =
      indexType === "HNSW"
        ? { ef: ef || Math.max(64, topK * 4) }
        : indexType.startsWith("IVF")
          ? { nprobe: this.config?.nprobe || 8 }
          : {};

    // Perform search using Milvus client
    const searchResults = await this.getClient().search({
      collection_name: collectionName,
      vector,
      limit: topK,
      output_fields: ["id", "content", "metadata"],
      params: searchParams,
    });

    const results = this.formatSearchResults(searchResults.results);

    // Filter results by score threshold if specified
    return scoreThreshold > 0
      ? results.filter((result) => result.score >= scoreThreshold)
      : results;
  }

  /**
   * Hybrid search combining dense vectors and BM25 sparse vectors
   */
  private async hybridSearch(
    collectionName: string,
    vector: number[],
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const { topK = 5, scoreThreshold = 0 } = options;

    const indexType = this.config?.indexType || "HNSW";
    const searchParams =
      indexType === "HNSW"
        ? { ef: options.ef || Math.max(64, topK * 4) }
        : indexType.startsWith("IVF")
          ? { nprobe: this.config?.nprobe || 8 }
          : {};

    // Hybrid search with dense + sparse
    const searchResults = await this.getClient().search({
      collection_name: collectionName,
      data: [vector],
      anns_field: "vector",
      limit: topK,
      output_fields: ["id", "content", "metadata", "sparse_vector"],
      params: searchParams,
    });

    const results = this.formatSearchResults(searchResults.results);

    // Filter results by score threshold if specified
    return scoreThreshold > 0
      ? results.filter((result) => result.score >= scoreThreshold)
      : results;
  }

  /**
   * Format Milvus search results to our SearchResult format
   */
  private formatSearchResults(results: unknown[]): SearchResult[] {
    const formattedResults: SearchResult[] = [];
    const metricType = this.config?.metricType || MetricType.COSINE;

    for (const result of results as MilvusSearchResult[]) {
      const { score, distance } = normalizeMetricScore(
        result.score,
        metricType,
      );

      formattedResults.push({
        id: result.id,
        content: result.content,
        score,
        distance,
        metadata: result.metadata,
      });
    }

    return formattedResults;
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
