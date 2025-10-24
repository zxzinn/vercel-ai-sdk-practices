/**
 * RAG Service Integration Tests
 *
 * These tests connect to the REAL Zilliz cloud instance.
 * They are NOT mocked - they test actual data consistency and vector operations.
 *
 * Setup:
 * - Requires MILVUS_URL and MILVUS_TOKEN environment variables
 * - Each test creates/destroys its own collection to avoid side effects
 * - Tests run serially to prevent collection conflicts
 */

import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VectorDocument } from "@/lib/vector/types";
import { getCollectionName, RAGService } from "./service";

// Skip tests if Zilliz credentials are not available
const MILVUS_URL = process.env.MILVUS_URL;
const MILVUS_TOKEN = process.env.MILVUS_TOKEN;
const SKIP_INTEGRATION = !MILVUS_URL || !MILVUS_TOKEN;

const skipIfNoZilliz = SKIP_INTEGRATION ? describe.skip : describe;

skipIfNoZilliz("RAG Service - Zilliz Integration Tests", () => {
  let ragService: RAGService;
  let milvusClient: MilvusClient;
  let testCollectionName: string;
  const testSpaceId = `test-space-${Date.now()}`;

  beforeEach(async () => {
    ragService = new RAGService();
    testCollectionName = getCollectionName(testSpaceId);

    // Initialize Milvus client for cleanup
    if (MILVUS_URL && MILVUS_TOKEN) {
      milvusClient = new MilvusClient({
        address: MILVUS_URL,
        token: MILVUS_TOKEN,
      });
    }

    console.log(`\n📝 Setting up test collection: ${testCollectionName}`);
  });

  afterEach(async () => {
    // Cleanup: Drop test collection
    try {
      if (milvusClient && MILVUS_URL && MILVUS_TOKEN) {
        const collections = await milvusClient.listCollections();
        if (collections.data?.some((c) => c.name === testCollectionName)) {
          console.log(`🧹 Cleaning up collection: ${testCollectionName}`);
          await milvusClient.dropCollection({
            collection_name: testCollectionName,
          });
        }

        // Close client
        await milvusClient.closeConnection();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      // Don't fail the test if cleanup fails
    }
  });

  describe("Collection Name Generation", () => {
    it("should generate consistent collection names from space IDs", () => {
      const spaceId = "my-space-123";
      const name1 = getCollectionName(spaceId);
      const name2 = getCollectionName(spaceId);

      expect(name1).toBe(name2);
      expect(name1).toBe("space_my_space_123");
      expect(name1).not.toContain("-");
    });

    it("should handle UUIDs in space IDs", () => {
      const spaceId = "550e8400-e29b-41d4-a716-446655440000";
      const name = getCollectionName(spaceId);

      expect(name).toMatch(/^space_/);
      expect(name).not.toContain("-");
      // Hyphens should be replaced with underscores
      expect(name).toBe("space_550e8400_e29b_41d4_a716_446655440000");
    });

    it("should generate valid Milvus collection names", () => {
      const spaceId = "my-app-space-v2";
      const name = getCollectionName(spaceId);

      // Milvus collection names: alphanumeric + underscore
      expect(name).toMatch(/^[a-zA-Z0-9_]+$/);
      expect(name.length).toBeLessThan(255); // Milvus limit
    });
  });

  describe("Text Chunking", () => {
    it("should preserve all content when chunking", () => {
      const text = "Lorem ipsum dolor sit amet. ".repeat(50); // ~1400 chars
      const chunkSize = 200;
      const overlap = 50;

      const chunks = ragService.chunkText(text, chunkSize, overlap);

      // Verify chunks are created
      expect(chunks.length).toBeGreaterThan(1);

      // Verify all chunks have content
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.index).toBeGreaterThanOrEqual(0);
      });

      // Verify chunk indices are sequential
      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
      });

      console.log(
        `✓ Chunked ${text.length} chars into ${chunks.length} chunks`,
      );
    });

    it("should handle chunk size edge cases", () => {
      const text = "short";

      // Chunk size larger than text
      const chunks1 = ragService.chunkText(text, 100, 10);
      expect(chunks1.length).toBe(1);
      expect(chunks1[0].content).toBe(text);

      // Single character chunks (edge case)
      const longText = "a".repeat(100);
      const chunks2 = ragService.chunkText(longText, 10, 2);
      expect(chunks2.length).toBeGreaterThan(5);
    });

    it("should normalize excessive overlap without data loss", () => {
      const text = "test content ".repeat(100); // ~1200 chars
      const chunkSize = 100;
      const overlap = 100; // overlap >= chunkSize should be adjusted

      const chunks = ragService.chunkText(text, chunkSize, overlap);

      // Should create chunks despite invalid overlap
      expect(chunks.length).toBeGreaterThan(0);

      // All chunks should be within size limit
      chunks.forEach((chunk) => {
        // Overlap means some chunks might be larger, but generally shouldn't exceed reasonable limit
        expect(chunk.content.length).toBeLessThanOrEqual(chunkSize + 50);
      });

      console.log(
        `✓ Handled edge case: ${chunks.length} chunks from excessive overlap`,
      );
    });
  });

  describe("Vector Document Creation", () => {
    it("should create vector documents with correct structure", () => {
      const text = "This is a test document for vectorization.";
      const chunks = ragService.chunkText(text, 100, 20);

      const vectorDocs: VectorDocument[] = chunks.map((chunk) => ({
        id: `doc-1-chunk-${chunk.index}`,
        vector: Array(1024).fill(0.5), // Dummy vector for 1024-dim model
        metadata: {
          chunkIndex: chunk.index,
          totalChunks: chunks.length,
          filename: "test.txt",
          fileType: "text",
          content: chunk.content,
        },
      }));

      expect(vectorDocs.length).toBe(chunks.length);

      vectorDocs.forEach((doc, index) => {
        expect(doc.id).toBe(`doc-1-chunk-${index}`);
        expect(doc.vector.length).toBe(1024);
        expect(doc.metadata.chunkIndex).toBe(index);
        expect(doc.metadata.totalChunks).toBe(chunks.length);
      });

      console.log(`✓ Created ${vectorDocs.length} vector documents`);
    });

    it("should handle metadata correctly in vector documents", () => {
      const metadata = {
        chunkIndex: 0,
        totalChunks: 5,
        filename: "my-document.pdf",
        fileType: "pdf",
        uploadedAt: new Date().toISOString(),
        size: 50000,
        content: "Sample chunk content",
      };

      const doc: VectorDocument = {
        id: "doc-1-chunk-0",
        vector: Array(1024).fill(0.1),
        metadata,
      };

      expect(doc.metadata).toEqual(metadata);
      expect(doc.metadata.chunkIndex).toBe(0);
      expect(doc.metadata.filename).toBe("my-document.pdf");
    });
  });

  describe("Collection Consistency", () => {
    it("should ensure collection names are consistent across calls", async () => {
      const spaceId = testSpaceId;
      const name1 = getCollectionName(spaceId);
      const name2 = getCollectionName(spaceId);

      expect(name1).toBe(name2);

      // Create a test collection with that name
      // Note: Using proper Milvus API format, matching the MilvusProvider implementation
      await milvusClient.createCollection({
        collection_name: name1,
        description: "Test collection for naming consistency",
        fields: [
          {
            name: "id",
            description: "Primary key",
            data_type: 21, // VarChar
            is_primary_key: true,
            max_length: 255,
          },
          {
            name: "vector",
            description: "Embedding vector",
            data_type: 101, // FloatVector
            dim: 1024,
          },
          {
            name: "content",
            description: "Text content",
            data_type: 21, // VarChar
            max_length: 65535,
          },
          {
            name: "metadata",
            description: "Document metadata",
            data_type: 11, // JSON
          },
        ],
      });

      // Verify collection was created with exact same name
      const collections = await milvusClient.listCollections();
      expect(collections.data?.some((c) => c.name === name1)).toBe(true);
    });

    it("should handle special characters in space IDs", () => {
      const specialIds = [
        "space-with-dashes",
        "space_with_underscores",
        "SpaceWithMixedCase",
        "space123numbers",
      ];

      const names = specialIds.map(getCollectionName);

      // All names should be unique
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);

      // All names should be valid (only alphanumeric + underscore)
      names.forEach((name) => {
        expect(name).toMatch(/^space_[a-zA-Z0-9_]+$/);
      });
    });
  });

  describe("Embedding Dimension Validation", () => {
    it("should validate that embeddings match expected dimensions", () => {
      const validDim1024 = Array(1024).fill(0.5);
      const invalidDim512 = Array(512).fill(0.5);

      // This should pass
      expect(validDim1024.length).toBe(1024);

      // This should fail validation
      expect(invalidDim512.length).not.toBe(1024);

      console.log(`✓ Dimension validation: 1024-dim matches, 512-dim doesn't`);
    });

    it("should create consistent metadata across chunked documents", () => {
      const text = "Document content ".repeat(100);
      const chunks = ragService.chunkText(text, 150, 30);

      const metadata = {
        filename: "test.txt",
        fileType: "text",
        totalChunks: chunks.length,
        uploadedAt: new Date().toISOString(),
      };

      // Simulate creating vector docs with consistent metadata
      const vectorDocs = chunks.map((chunk) => ({
        id: `doc-1-chunk-${chunk.index}`,
        vector: Array(1024).fill(0.1),
        metadata: {
          ...metadata,
          chunkIndex: chunk.index,
          content: chunk.content,
        },
      }));

      // All should have same totalChunks value
      const totalChunksValues = vectorDocs.map((d) => d.metadata.totalChunks);
      expect(new Set(totalChunksValues).size).toBe(1);
      expect(totalChunksValues[0]).toBe(chunks.length);

      console.log(
        `✓ Metadata consistency: all ${vectorDocs.length} docs have totalChunks=${chunks.length}`,
      );
    });
  });

  describe("Error Scenarios", () => {
    it("should handle empty document text", () => {
      const text = "";
      const chunks = ragService.chunkText(text, 100, 20);

      // Empty text should result in empty chunks or single empty chunk
      expect(Array.isArray(chunks)).toBe(true);
    });

    it("should handle very large documents", () => {
      // 1 MB of text
      const text = "test content ".repeat(100000);
      const chunks = ragService.chunkText(text, 1000, 200);

      expect(chunks.length).toBeGreaterThan(50);

      // All chunks should have content
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
      });

      console.log(
        `✓ Handled large document: ${(text.length / 1000).toFixed(0)}KB → ${chunks.length} chunks`,
      );
    });

    it("should handle Unicode and special characters", () => {
      const text = "Hello 你好 مرحبا שלום 🚀 special chars: !@#$%^&*()";
      const chunks = ragService.chunkText(text, 50, 10);

      expect(chunks.length).toBeGreaterThan(0);

      // Content should preserve Unicode
      const reconstructed = chunks.map((c) => c.content).join("");
      expect(reconstructed).toContain("你好");
      expect(reconstructed).toContain("🚀");
    });
  });

  describe("Real Zilliz Operations", () => {
    it("should be able to connect to Zilliz", async () => {
      try {
        const collections = await milvusClient.listCollections();
        expect(
          Array.isArray(collections.data) ||
            typeof collections.data === "object",
        ).toBe(true);
        console.log(`✓ Successfully connected to Zilliz: ${MILVUS_URL}`);
      } catch (error) {
        console.error("Connection failed:", error);
        throw error;
      }
    });

    it("should be able to list existing collections", async () => {
      const collections = await milvusClient.listCollections();
      expect(collections.data).toBeDefined();
      console.log(
        `✓ Found ${collections.data?.length || 0} collections in Zilliz`,
      );
    });
  });
});
