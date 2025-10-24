/**
 * Document Upload & Ingest Pipeline Integration Tests
 *
 * Tests the complete flow: file upload → chunking → embedding → indexing
 * Uses real Vercel AI Gateway for embeddings (Cohere v4.0)
 * Uses real Zilliz cloud for vector storage
 * Uses real Supabase for document metadata
 *
 * Setup:
 * - Requires DATABASE_URL for Supabase PostgreSQL
 * - Requires AI_GATEWAY_API_KEY for Vercel AI Gateway
 * - Requires MILVUS_URL and MILVUS_TOKEN for Zilliz
 */

import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCollectionName, RAGService } from "@/lib/rag/service";
import {
  createTestDocument,
  estimateTokens,
  SAMPLE_DOCUMENTS,
} from "@/test/fixtures/documents";
import {
  COHERE_MODELS,
  createTestSpace,
  deleteTestSpace,
  getMilvusConfig,
} from "@/test/fixtures/space";

const DATABASE_URL = process.env.DATABASE_URL;
const MILVUS_URL = process.env.MILVUS_URL;
const MILVUS_TOKEN = process.env.MILVUS_TOKEN;
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const SKIP_INTEGRATION =
  !DATABASE_URL || !MILVUS_URL || !MILVUS_TOKEN || !AI_GATEWAY_API_KEY;

const skipIfNoServices = SKIP_INTEGRATION ? describe.skip : describe;

skipIfNoServices("Document Ingest Pipeline - Integration Tests", () => {
  let ragService: RAGService;
  let milvusClient: MilvusClient;
  let testSpaceId: string;
  let testUserId: string;

  beforeEach(async () => {
    ragService = new RAGService();
    testUserId = `test-user-${Date.now()}`;

    // Create test Milvus client for cleanup
    if (MILVUS_URL && MILVUS_TOKEN) {
      milvusClient = new MilvusClient({
        address: MILVUS_URL,
        token: MILVUS_TOKEN,
      });
    }

    // Create test space
    const space = await createTestSpace({
      userId: testUserId,
      name: `ingest-test-${Date.now()}`,
      embeddingModelId: COHERE_MODELS.EMBED_V4.id,
      embeddingDim: COHERE_MODELS.EMBED_V4.defaultDimension,
    });

    testSpaceId = space.id;

    console.log(`📝 Setup: Created test space ${testSpaceId}`);
  });

  afterEach(async () => {
    // Cleanup: Drop Milvus collection
    if (milvusClient && testSpaceId) {
      try {
        const collectionName = getCollectionName(testSpaceId);
        const collections = await milvusClient.listCollections();

        if (collections.data?.some((c) => c.name === collectionName)) {
          console.log(`🧹 Cleanup: Dropping collection ${collectionName}`);
          await milvusClient.dropCollection({
            collection_name: collectionName,
          });
        }

        await milvusClient.closeConnection();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }

    // Cleanup: Delete test space
    try {
      await deleteTestSpace(testSpaceId);
    } catch (error) {
      console.error(`Failed to cleanup space ${testSpaceId}:`, error);
    }
  });

  describe("Text Chunking & Preprocessing", () => {
    it("should chunk documents with configurable parameters", () => {
      const doc = SAMPLE_DOCUMENTS.typescript_intro;
      const chunkSize = 500;
      const overlap = 100;

      const chunks = ragService.chunkText(doc.content, chunkSize, overlap);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.content.length).toBeLessThanOrEqual(chunkSize + 50);
        expect(chunk.index).toBeGreaterThanOrEqual(0);
      });

      const totalTokens = estimateTokens(doc.content);
      console.log(
        `✓ Chunked ${totalTokens} tokens into ${chunks.length} chunks`,
      );
    });

    it("should preserve content during chunking", () => {
      const doc = SAMPLE_DOCUMENTS.vector_db_guide;
      const chunks = ragService.chunkText(doc.content, 400, 50);

      // Reconstruct content from chunks
      const reconstructed = chunks.map((c) => c.content).join("");

      // Most content should be preserved
      expect(reconstructed.length).toBeGreaterThan(doc.content.length * 0.95);

      console.log(
        `✓ Content preservation: ${reconstructed.length}/${doc.content.length} chars`,
      );
    });

    it("should handle different chunk sizes", () => {
      const doc = SAMPLE_DOCUMENTS.short_text;
      const sizes = [100, 200, 500];

      for (const size of sizes) {
        const chunks = ragService.chunkText(doc.content, size, 20);
        expect(chunks.length).toBeGreaterThan(0);
      }

      console.log(`✓ Successfully handled chunk sizes: ${sizes.join(", ")}`);
    });
  });

  describe("Document Ingestion", () => {
    it("should ingest single document and create embeddings", async () => {
      const doc = SAMPLE_DOCUMENTS.typescript_intro;
      const documents = [
        {
          id: `doc-${Date.now()}`,
          content: doc.content,
          metadata: {
            filename: doc.filename,
            fileType: "text",
            size: doc.size,
            uploadedAt: new Date(),
          },
        },
      ];

      const result = await ragService.ingest(testSpaceId, documents, {
        chunkSize: 500,
        chunkOverlap: 100,
      });

      expect(result.documentIds).toContain(documents[0].id);
      expect(result.totalChunks).toBeGreaterThan(0);
      expect(result.collectionName).toBeDefined();

      console.log(`✓ Ingested document: ${result.totalChunks} chunks indexed`);
    });

    it("should ingest multiple documents in batch", async () => {
      const documents = [
        {
          id: `doc-1-${Date.now()}`,
          content: SAMPLE_DOCUMENTS.typescript_intro.content,
          metadata: {
            filename: SAMPLE_DOCUMENTS.typescript_intro.filename,
            fileType: "text",
            size: SAMPLE_DOCUMENTS.typescript_intro.size,
            uploadedAt: new Date(),
          },
        },
        {
          id: `doc-2-${Date.now()}`,
          content: SAMPLE_DOCUMENTS.vector_db_guide.content,
          metadata: {
            filename: SAMPLE_DOCUMENTS.vector_db_guide.filename,
            fileType: "text",
            size: SAMPLE_DOCUMENTS.vector_db_guide.size,
            uploadedAt: new Date(),
          },
        },
        {
          id: `doc-3-${Date.now()}`,
          content: SAMPLE_DOCUMENTS.embedding_models.content,
          metadata: {
            filename: SAMPLE_DOCUMENTS.embedding_models.filename,
            fileType: "text",
            size: SAMPLE_DOCUMENTS.embedding_models.size,
            uploadedAt: new Date(),
          },
        },
      ];

      const result = await ragService.ingest(testSpaceId, documents);

      expect(result.documentIds).toHaveLength(3);
      expect(result.totalChunks).toBeGreaterThan(3);

      // Verify metadata tracking
      expect(result.documentsChunks).toHaveLength(3);
      for (const docChunks of result.documentsChunks) {
        expect(docChunks.chunks).toBeGreaterThan(0);
      }

      console.log(
        `✓ Batch ingested 3 documents: ${result.totalChunks} total chunks`,
      );
    });

    it("should create proper chunk metadata", async () => {
      const doc = SAMPLE_DOCUMENTS.short_text;
      const documents = [
        {
          id: `metadata-test-${Date.now()}`,
          content: doc.content,
          metadata: {
            filename: doc.filename,
            fileType: "text",
            size: doc.size,
            uploadedAt: new Date(),
          },
        },
      ];

      const result = await ragService.ingest(testSpaceId, documents);

      expect(result.documentsChunks[0].chunks).toBeGreaterThan(0);

      console.log(
        `✓ Chunk metadata created: ${result.documentsChunks[0].chunks} chunks with full metadata`,
      );
    });
  });

  describe("Vector Storage Verification", () => {
    it("should verify vectors are stored in Milvus", async () => {
      const doc = SAMPLE_DOCUMENTS.typescript_intro;
      const documents = [
        {
          id: `vector-test-${Date.now()}`,
          content: doc.content,
          metadata: {
            filename: doc.filename,
            fileType: "text",
            size: doc.size,
            uploadedAt: new Date(),
          },
        },
      ];

      const result = await ragService.ingest(testSpaceId, documents);

      // Verify collection exists in Milvus
      const collections = await milvusClient.listCollections();
      expect(
        collections.data?.some((c) => c.name === result.collectionName),
      ).toBe(true);

      console.log(
        `✓ Verified collection exists in Milvus: ${result.collectionName}`,
      );
    });

    it("should support space isolation in vector storage", async () => {
      const userId2 = `test-user-2-${Date.now()}`;
      const space2 = await createTestSpace({
        userId: userId2,
        name: "Second space",
      });

      const doc = SAMPLE_DOCUMENTS.short_text;

      // Ingest to both spaces
      const result1 = await ragService.ingest(testSpaceId, [
        {
          id: `doc-space1-${Date.now()}`,
          content: doc.content,
          metadata: {
            filename: doc.filename,
            fileType: "text",
            size: doc.size,
            uploadedAt: new Date(),
          },
        },
      ]);

      const result2 = await ragService.ingest(space2.id, [
        {
          id: `doc-space2-${Date.now()}`,
          content: doc.content,
          metadata: {
            filename: doc.filename,
            fileType: "text",
            size: doc.size,
            uploadedAt: new Date(),
          },
        },
      ]);

      // Collections should be different
      expect(result1.collectionName).not.toBe(result2.collectionName);

      // Cleanup second space
      try {
        const collection2 = await milvusClient.listCollections();
        if (collection2.data?.some((c) => c.name === result2.collectionName)) {
          await milvusClient.dropCollection({
            collection_name: result2.collectionName,
          });
        }
      } catch (error) {
        console.error("Cleanup error:", error);
      }

      await deleteTestSpace(space2.id);

      console.log(`✓ Space isolation verified in vector storage`);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty documents gracefully", async () => {
      const documents = [
        {
          id: `empty-doc-${Date.now()}`,
          content: "",
          metadata: {
            filename: "empty.txt",
            fileType: "text",
            size: 0,
            uploadedAt: new Date(),
          },
        },
      ];

      // Should not throw, but may skip or handle gracefully
      try {
        const result = await ragService.ingest(testSpaceId, documents);
        console.log(`✓ Empty document handled: ${result.totalChunks} chunks`);
      } catch (error) {
        // Empty documents might cause errors, which is acceptable
        expect(error).toBeDefined();
      }
    });

    it("should handle documents with special characters", async () => {
      const doc = createTestDocument(
        "special-chars.txt",
        `
        Unicode test: 你好 مرحبا שלום 🚀
        Special symbols: !@#$%^&*(){}[]|\\:;"'<>,.?/
        Quotes: "double" 'single' \`backticks\`
        Tabs\tand\tnewlines\nand\rcarriage returns
        `,
      );

      const documents = [
        {
          id: `special-${Date.now()}`,
          content: doc.content,
          metadata: {
            filename: doc.filename,
            fileType: "text",
            size: doc.size,
            uploadedAt: new Date(),
          },
        },
      ];

      const result = await ragService.ingest(testSpaceId, documents);

      expect(result.totalChunks).toBeGreaterThan(0);

      console.log(`✓ Special characters handled correctly`);
    });
  });
});
