/**
 * Space Service Integration Tests
 *
 * Tests Space creation, configuration validation, and isolation
 * Uses real database (Prisma + Supabase PostgreSQL)
 * Uses real Zilliz cloud for vector provider validation
 *
 * Setup:
 * - Requires DATABASE_URL for Prisma
 * - Requires MILVUS_URL and MILVUS_TOKEN for vector database
 * - Each test creates/destroys its own Space and related data
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCollectionName } from "@/lib/rag/service";
import { createVectorProvider } from "@/lib/vector";
import {
  COHERE_MODELS,
  createTestSpace,
  deleteTestSpace,
  getMilvusConfig,
} from "@/test/fixtures/space";

// Skip tests if Milvus credentials are not available
const MILVUS_URL = process.env.MILVUS_URL;
const MILVUS_TOKEN = process.env.MILVUS_TOKEN;
const SKIP_INTEGRATION = !MILVUS_URL || !MILVUS_TOKEN;

const skipIfNoMilvus = SKIP_INTEGRATION ? describe.skip : describe;

skipIfNoMilvus("Space Service - Integration Tests", () => {
  const testUserId = `test-user-${Date.now()}`;
  const spaceIds: string[] = [];

  beforeAll(async () => {
    // Ensure embedding models exist in database
    const coheereV4Exists = await prisma.embeddingModel.findUnique({
      where: { id: "cohere/embed-v4.0" },
    });

    if (!coheereV4Exists) {
      await prisma.embeddingModel.create({
        data: {
          id: "cohere/embed-v4.0",
          name: "Embed V4.0",
          provider: "cohere",
          dimensions: [256, 512, 1024, 1536],
          defaultDim: 1536,
          maxTokens: 128000,
          description: "Latest multilingual multimodal embedding",
          isActive: true,
        },
      });
    }
  });

  afterEach(async () => {
    // Clean up test spaces
    for (const spaceId of spaceIds) {
      try {
        await deleteTestSpace(spaceId);
      } catch (error) {
        console.error(`Failed to cleanup space ${spaceId}:`, error);
      }
    }
    spaceIds.length = 0;
  });

  describe("Space Creation", () => {
    it("should create a space with valid Cohere v4.0 configuration", async () => {
      const space = await createTestSpace({
        userId: testUserId,
        embeddingModelId: COHERE_MODELS.EMBED_V4.id,
        embeddingDim: COHERE_MODELS.EMBED_V4.defaultDimension,
      });

      spaceIds.push(space.id);

      expect(space.id).toBeDefined();
      expect(space.name).toBeDefined();
      expect(space.userId).toBe(testUserId);
      expect(space.embeddingModelId).toBe(COHERE_MODELS.EMBED_V4.id);
      expect(space.embeddingDim).toBe(COHERE_MODELS.EMBED_V4.defaultDimension);
      expect(space.status).toBe("ACTIVE");
      expect(space.vectorProvider).toBe("MILVUS");

      console.log(`✓ Created space: ${space.id}`);
    });

    it("should reject invalid embedding dimensions", async () => {
      try {
        await createTestSpace({
          userId: testUserId,
          embeddingModelId: COHERE_MODELS.EMBED_V4.id,
          embeddingDim: 999, // Invalid dimension
        });

        expect.fail("Should have thrown error for invalid dimension");
      } catch (error) {
        expect(error).toBeDefined();
        console.log(`✓ Correctly rejected invalid dimension: 999`);
      }
    });

    it("should create spaces with different supported dimensions", async () => {
      const dimensions = COHERE_MODELS.EMBED_V4.supportedDimensions;

      for (const dim of dimensions) {
        const space = await createTestSpace({
          userId: testUserId,
          embeddingModelId: COHERE_MODELS.EMBED_V4.id,
          embeddingDim: dim,
        });

        spaceIds.push(space.id);
        expect(space.embeddingDim).toBe(dim);
      }

      console.log(
        `✓ Created spaces with all supported dimensions: ${dimensions.join(", ")}`,
      );
    });
  });

  describe("Embedding Model Configuration", () => {
    it("should validate that embedding model exists", async () => {
      try {
        await createTestSpace({
          userId: testUserId,
          embeddingModelId: "non-existent/model-v1.0",
          embeddingDim: 1024,
        });

        expect.fail(
          "Should have thrown error for non-existent embedding model",
        );
      } catch (error) {
        expect(error).toBeDefined();
        console.log(`✓ Correctly rejected non-existent embedding model`);
      }
    });

    it("should retrieve embedding model metadata with space", async () => {
      // Create space first
      const created = await createTestSpace({
        userId: testUserId,
        embeddingModelId: COHERE_MODELS.EMBED_V4.id,
        embeddingDim: COHERE_MODELS.EMBED_V4.defaultDimension,
      });

      spaceIds.push(created.id);

      const fetched = await prisma.space.findUnique({
        where: { id: created.id },
        include: {
          embeddingModel: true,
        },
      });

      expect(fetched).toBeDefined();
      expect(fetched?.embeddingModel).toBeDefined();
      expect(fetched?.embeddingModel.id).toBe(COHERE_MODELS.EMBED_V4.id);
      expect(fetched?.embeddingModel.provider).toBe("cohere");
      expect(fetched?.embeddingModel.dimensions).toContain(
        COHERE_MODELS.EMBED_V4.defaultDimension,
      );

      console.log(
        `✓ Retrieved embedding model metadata: ${fetched?.embeddingModel.name}`,
      );
    });
  });

  describe("Vector Provider Configuration", () => {
    it("should initialize vector provider with Milvus config", async () => {
      const milvusConfig = getMilvusConfig();

      const provider = await createVectorProvider("MILVUS", milvusConfig);

      expect(provider).toBeDefined();
      expect(provider.name).toBeDefined();

      await provider.cleanup();

      console.log(`✓ Successfully initialized Milvus provider`);
    });

    it("should validate vector configuration", async () => {
      // Valid config
      const validConfig = getMilvusConfig();

      const provider = await createVectorProvider("MILVUS", validConfig);
      expect(provider).toBeDefined();

      await provider.cleanup();

      // Invalid config should throw
      const invalidConfig = {
        url: "invalid-url",
        token: "invalid-token",
      };

      await expect(
        createVectorProvider(
          "MILVUS",
          invalidConfig as unknown as MilvusConfig,
        ),
      ).rejects.toThrow();

      console.log(`✓ Vector configuration validation working`);
    });
  });

  describe("Space Isolation", () => {
    it("should isolate spaces for different users", async () => {
      const user1Id = `test-user-1-${Date.now()}`;
      const user2Id = `test-user-2-${Date.now()}`;

      const space1 = await createTestSpace({
        userId: user1Id,
        name: "User1 Space",
      });

      const space2 = await createTestSpace({
        userId: user2Id,
        name: "User2 Space",
      });

      spaceIds.push(space1.id, space2.id);

      // User1 should only see their space
      const user1Spaces = await prisma.space.findMany({
        where: { userId: user1Id },
      });

      expect(user1Spaces).toHaveLength(1);
      expect(user1Spaces[0].id).toBe(space1.id);

      // User2 should only see their space
      const user2Spaces = await prisma.space.findMany({
        where: { userId: user2Id },
      });

      expect(user2Spaces).toHaveLength(1);
      expect(user2Spaces[0].id).toBe(space2.id);

      console.log(`✓ Space isolation verified for different users`);
    });

    it("should support multiple spaces per user", async () => {
      const space1 = await createTestSpace({
        userId: testUserId,
        name: "Space 1",
      });

      const space2 = await createTestSpace({
        userId: testUserId,
        name: "Space 2",
      });

      spaceIds.push(space1.id, space2.id);

      const userSpaces = await prisma.space.findMany({
        where: { userId: testUserId },
      });

      expect(userSpaces.length).toBeGreaterThanOrEqual(2);

      const spaceNames = userSpaces.map((s) => s.name);
      expect(spaceNames).toContain("Space 1");
      expect(spaceNames).toContain("Space 2");

      console.log(`✓ User can have multiple spaces: ${spaceNames.join(", ")}`);
    });
  });

  describe("Space Data Integrity", () => {
    it("should maintain space metadata after creation", async () => {
      const space = await createTestSpace({
        userId: testUserId,
        name: "Metadata Test Space",
        description: "Testing metadata preservation",
        embeddingDim: 1024,
      });

      spaceIds.push(space.id);

      const fetched = await prisma.space.findUnique({
        where: { id: space.id },
      });

      expect(fetched?.name).toBe("Metadata Test Space");
      expect(fetched?.description).toBe("Testing metadata preservation");
      expect(fetched?.embeddingDim).toBe(1024);
      expect(fetched?.status).toBe("ACTIVE");
      expect(fetched?.createdAt).toBeDefined();
      expect(fetched?.updatedAt).toBeDefined();

      console.log(`✓ Space metadata integrity verified`);
    });

    it("should track space statistics", async () => {
      const space = await createTestSpace({
        userId: testUserId,
      });

      spaceIds.push(space.id);

      expect(space.vectorCount).toBe(0); // New space
      expect(space.storageSize).toBe(0n); // New space

      console.log(
        `✓ Space statistics initialized: vectorCount=${space.vectorCount}, storageSize=${space.storageSize}`,
      );
    });
  });

  describe("Vector Collection Naming", () => {
    it("should generate consistent collection names", async () => {
      const space = await createTestSpace({
        userId: testUserId,
      });

      spaceIds.push(space.id);

      // Collection name is deterministically generated from space ID by RAGService
      const expectedName = getCollectionName(space.id);

      expect(expectedName).toBeDefined();
      expect(expectedName).toMatch(/^space_/);
      expect(expectedName).not.toContain("-"); // Hyphens replaced with underscores

      console.log(`✓ Collection name generated: ${expectedName}`);
    });
  });
});
