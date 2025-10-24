/**
 * RAG Search Quality & Verification Tests
 *
 * Tests the quality of semantic search results
 * Verifies that indexed content can be retrieved with relevant queries
 * Uses real embeddings and actual search scoring
 *
 * Setup:
 * - Requires all environment variables (DATABASE_URL, MILVUS_*, AI_GATEWAY_API_KEY)
 */

import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCollectionName, RAGService } from "@/lib/rag/service";
import { SAMPLE_DOCUMENTS } from "@/test/fixtures/documents";
import {
  COHERE_MODELS,
  createTestSpace,
  deleteTestSpace,
} from "@/test/fixtures/space";

const DATABASE_URL = process.env.DATABASE_URL;
const MILVUS_URL = process.env.MILVUS_URL;
const MILVUS_TOKEN = process.env.MILVUS_TOKEN;
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const SKIP_INTEGRATION =
  !DATABASE_URL || !MILVUS_URL || !MILVUS_TOKEN || !AI_GATEWAY_API_KEY;

const skipIfNoServices = SKIP_INTEGRATION ? describe.skip : describe;

skipIfNoServices("RAG Search Quality - Integration Tests", () => {
  let ragService: RAGService;
  let milvusClient: MilvusClient;
  let testSpaceId: string;
  let testUserId: string;

  beforeEach(async () => {
    ragService = new RAGService();
    testUserId = `test-user-${Date.now()}`;

    if (MILVUS_URL && MILVUS_TOKEN) {
      milvusClient = new MilvusClient({
        address: MILVUS_URL,
        token: MILVUS_TOKEN,
      });
    }

    const space = await createTestSpace({
      userId: testUserId,
      name: `search-test-${Date.now()}`,
      embeddingModelId: COHERE_MODELS.EMBED_V4.id,
      embeddingDim: COHERE_MODELS.EMBED_V4.defaultDimension,
    });

    testSpaceId = space.id;

    // Ingest test documents for search
    const documents = [
      {
        id: `ts-doc-${Date.now()}`,
        content: SAMPLE_DOCUMENTS.typescript_intro.content,
        metadata: {
          filename: SAMPLE_DOCUMENTS.typescript_intro.filename,
          fileType: "text",
          size: SAMPLE_DOCUMENTS.typescript_intro.size,
          uploadedAt: new Date(),
        },
      },
      {
        id: `vdb-doc-${Date.now()}`,
        content: SAMPLE_DOCUMENTS.vector_db_guide.content,
        metadata: {
          filename: SAMPLE_DOCUMENTS.vector_db_guide.filename,
          fileType: "text",
          size: SAMPLE_DOCUMENTS.vector_db_guide.size,
          uploadedAt: new Date(),
        },
      },
      {
        id: `embed-doc-${Date.now()}`,
        content: SAMPLE_DOCUMENTS.embedding_models.content,
        metadata: {
          filename: SAMPLE_DOCUMENTS.embedding_models.filename,
          fileType: "text",
          size: SAMPLE_DOCUMENTS.embedding_models.size,
          uploadedAt: new Date(),
        },
      },
    ];

    await ragService.ingest(testSpaceId, documents);
    console.log(`📝 Setup: Ingested 3 documents for search testing`);
  });

  afterEach(async () => {
    if (milvusClient && testSpaceId) {
      try {
        const collectionName = getCollectionName(testSpaceId);
        const collections = await milvusClient.listCollections();

        if (collections.data?.some((c) => c.name === collectionName)) {
          await milvusClient.dropCollection({
            collection_name: collectionName,
          });
        }

        await milvusClient.closeConnection();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }

    try {
      await deleteTestSpace(testSpaceId);
    } catch (error) {
      console.error(`Failed to cleanup space ${testSpaceId}:`, error);
    }
  });

  describe("Basic Search Functionality", () => {
    it("should return search results for valid queries", async () => {
      const query = "TypeScript programming language types";
      const results = await ragService.query(testSpaceId, query);

      expect(results.sources).toBeDefined();
      expect(results.sources.length).toBeGreaterThan(0);
      expect(results.query).toBe(query);
      expect(results.totalResults).toBeGreaterThan(0);

      console.log(`✓ Found ${results.totalResults} results for: "${query}"`);
    });

    it("should return consistent results for same query", async () => {
      const query = "vector database similarity search";

      const results1 = await ragService.query(testSpaceId, query, { topK: 5 });
      const results2 = await ragService.query(testSpaceId, query, { topK: 5 });

      expect(results1.sources.length).toBe(results2.sources.length);

      // Top results should be in same order
      for (let i = 0; i < results1.sources.length; i++) {
        expect(results1.sources[i].id).toBe(results2.sources[i].id);
      }

      console.log(`✓ Search results are consistent across queries`);
    });

    it("should respect topK parameter", async () => {
      const query = "embedding models";

      for (const k of [1, 3, 5]) {
        const results = await ragService.query(testSpaceId, query, {
          topK: k,
        });

        expect(results.sources.length).toBeLessThanOrEqual(k);
      }

      console.log(`✓ topK parameter respected for k=1,3,5`);
    });
  });

  describe("Search Quality & Relevance", () => {
    it("should find TypeScript-related content for TypeScript query", async () => {
      const query = "TypeScript type system and interfaces";
      const results = await ragService.query(testSpaceId, query, { topK: 5 });

      expect(results.sources.length).toBeGreaterThan(0);

      // Should find content from typescript doc
      const hasTypeScriptContent = results.sources.some((source) =>
        source.metadata.filename.includes("typescript"),
      );

      expect(hasTypeScriptContent).toBe(true);

      console.log(`✓ TypeScript query found relevant TypeScript content`);
    });

    it("should find vector database content for database queries", async () => {
      const query = "vector database indexing strategies HNSW IVF";
      const results = await ragService.query(testSpaceId, query, { topK: 5 });

      expect(results.sources.length).toBeGreaterThan(0);

      const hasVectorDBContent = results.sources.some((source) =>
        source.metadata.filename.includes("vector-database"),
      );

      expect(hasVectorDBContent).toBe(true);

      console.log(`✓ Vector DB query found relevant database content`);
    });

    it("should find embedding model content for embedding queries", async () => {
      const query = "embedding models OpenAI Cohere comparison";
      const results = await ragService.query(testSpaceId, query, { topK: 5 });

      expect(results.sources.length).toBeGreaterThan(0);

      const hasEmbeddingContent = results.sources.some((source) =>
        source.metadata.filename.includes("embedding"),
      );

      expect(hasEmbeddingContent).toBe(true);

      console.log(`✓ Embedding query found relevant embedding content`);
    });
  });

  describe("Search Metadata & Content Integrity", () => {
    it("should preserve metadata in search results", async () => {
      const query = "machine learning";
      const results = await ragService.query(testSpaceId, query);

      expect(results.sources.length).toBeGreaterThan(0);

      for (const source of results.sources) {
        expect(source.id).toBeDefined();
        expect(source.content).toBeDefined();
        expect(source.metadata).toBeDefined();
        expect(source.metadata.filename).toBeDefined();
        expect(source.metadata.fileType).toBeDefined();
      }

      console.log(`✓ All metadata preserved in search results`);
    });

    it("should return actual chunk content, not truncated", async () => {
      const query = "TypeScript classes";
      const results = await ragService.query(testSpaceId, query, { topK: 1 });

      expect(results.sources.length).toBeGreaterThan(0);

      const content = results.sources[0].content;
      expect(content.length).toBeGreaterThan(10); // Should be meaningful chunk
      expect(typeof content).toBe("string");

      console.log(
        `✓ Returned chunks have meaningful content (${content.length} chars)`,
      );
    });
  });

  describe("Search Score & Distance Metrics", () => {
    it("should provide valid similarity scores", async () => {
      const query = "programming";
      const results = await ragService.query(testSpaceId, query, { topK: 5 });

      expect(results.sources.length).toBeGreaterThan(0);

      for (const source of results.sources) {
        expect(typeof source.score).toBe("number");
        expect(source.score).toBeGreaterThanOrEqual(-1);
        expect(source.score).toBeLessThanOrEqual(1);
      }

      console.log(`✓ All scores are valid (range: [-1, 1])`);
    });

    it("should order results by relevance (highest score first)", async () => {
      const query = "neural networks deep learning";
      const results = await ragService.query(testSpaceId, query, { topK: 5 });

      expect(results.sources.length).toBeGreaterThan(0);

      // Scores should be in descending order (most relevant first)
      for (let i = 0; i < results.sources.length - 1; i++) {
        expect(results.sources[i].score).toBeGreaterThanOrEqual(
          results.sources[i + 1].score,
        );
      }

      console.log(`✓ Results ordered by relevance score`);
    });
  });

  describe("Edge Cases & Robustness", () => {
    it("should handle queries with special characters", async () => {
      const query = "C++ programming language!@#$";
      const results = await ragService.query(testSpaceId, query);

      expect(results.sources).toBeDefined();
      // Should not crash, may or may not return results
    });

    it("should handle very short queries", async () => {
      const query = "AI";
      const results = await ragService.query(testSpaceId, query);

      expect(results.sources).toBeDefined();
      expect(Array.isArray(results.sources)).toBe(true);

      console.log(
        `✓ Short query handled: found ${results.sources.length} results`,
      );
    });

    it("should handle queries with many words", async () => {
      const query =
        "comprehensive guide to machine learning embeddings vector databases semantic search neural networks transformers";
      const results = await ragService.query(testSpaceId, query);

      expect(results.sources).toBeDefined();
      expect(Array.isArray(results.sources)).toBe(true);

      console.log(
        `✓ Long query handled: found ${results.sources.length} results`,
      );
    });

    it("should return empty results for irrelevant queries gracefully", async () => {
      const query = "xyz12345 nonsense gibberish qwerty asdfgh";
      const results = await ragService.query(testSpaceId, query);

      expect(results.sources).toBeDefined();
      expect(Array.isArray(results.sources)).toBe(true);
      // May return empty or low-relevance results

      console.log(
        `✓ Irrelevant query handled: found ${results.sources.length} results`,
      );
    });
  });
});
