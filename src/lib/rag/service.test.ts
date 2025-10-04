import { beforeEach, describe, expect, it, vi } from "vitest";
import { RAGService } from "./service";

// Mock chromadb
vi.mock("chromadb", () => {
  const MockCollection = vi.fn();
  const MockChromaClient = vi.fn();
  return {
    ChromaClient: MockChromaClient,
  };
});

// Mock ai embeddings
vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

import { embed, embedMany } from "ai";
import { ChromaClient } from "chromadb";

describe("RAGService", () => {
  let ragService: RAGService;
  let mockCollection: any;
  let mockChromaClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection = {
      get: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      add: vi.fn(),
      query: vi.fn(),
    };

    mockChromaClient = {
      getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
      listCollections: vi.fn(),
      deleteCollection: vi.fn(),
    };

    vi.mocked(ChromaClient).mockImplementation(() => mockChromaClient);

    ragService = new RAGService();
  });

  describe("deleteDocument", () => {
    it("should delete all chunks for a document", async () => {
      const documentId = "doc123";
      const mockChunkIds = [
        "doc123_chunk_0",
        "doc123_chunk_1",
        "doc123_chunk_2",
      ];

      mockCollection.get.mockResolvedValue({
        ids: mockChunkIds,
      });

      await ragService.deleteDocument(documentId);

      expect(mockCollection.get).toHaveBeenCalledWith({
        where: { originalDocId: documentId },
      });

      expect(mockCollection.delete).toHaveBeenCalledWith({
        ids: mockChunkIds,
      });
    });

    it("should not call delete if no chunks found", async () => {
      mockCollection.get.mockResolvedValue({
        ids: [],
      });

      await ragService.deleteDocument("doc123");

      expect(mockCollection.get).toHaveBeenCalled();
      expect(mockCollection.delete).not.toHaveBeenCalled();
    });

    it("should handle collection name parameter", async () => {
      const customCollection = { ...mockCollection };
      mockChromaClient.getOrCreateCollection.mockResolvedValue(
        customCollection,
      );

      customCollection.get.mockResolvedValue({ ids: ["id1"] });

      await ragService.deleteDocument("doc123", "custom_collection");

      expect(mockChromaClient.getOrCreateCollection).toHaveBeenCalledWith({
        name: "custom_collection",
        metadata: {
          description: "RAG document collection with external embeddings",
          "hnsw:space": "cosine",
        },
      });
    });
  });

  describe("deleteFile", () => {
    it("should delete chunks for a specific file", async () => {
      const documentId = "doc123";
      const fileName = "test.txt";
      const mockChunkIds = ["doc123_chunk_0", "doc123_chunk_1"];

      mockCollection.get.mockResolvedValue({
        ids: mockChunkIds,
      });

      await ragService.deleteFile(documentId, fileName);

      expect(mockCollection.get).toHaveBeenCalledWith({
        where: {
          $and: [{ originalDocId: documentId }, { filename: fileName }],
        },
      });

      expect(mockCollection.delete).toHaveBeenCalledWith({
        ids: mockChunkIds,
      });
    });

    it("should not delete chunks from other files in same document", async () => {
      const documentId = "doc123";
      const fileName = "file1.txt";

      mockCollection.get.mockResolvedValue({
        ids: ["doc123_chunk_0"], // Only chunks for file1.txt
      });

      await ragService.deleteFile(documentId, fileName);

      // Verify query is specific to both documentId AND fileName
      expect(mockCollection.get).toHaveBeenCalledWith({
        where: {
          $and: [{ originalDocId: documentId }, { filename: fileName }],
        },
      });
    });

    it("should not call delete if no chunks found for file", async () => {
      mockCollection.get.mockResolvedValue({
        ids: [],
      });

      await ragService.deleteFile("doc123", "nonexistent.txt");

      expect(mockCollection.get).toHaveBeenCalled();
      expect(mockCollection.delete).not.toHaveBeenCalled();
    });
  });

  describe("updateDocumentMetadata", () => {
    it("should update metadata for specific file chunks", async () => {
      const oldDocId = "doc1";
      const newDocId = "doc2";
      const fileName = "test.txt";

      const mockChunkIds = ["doc1_chunk_0", "doc1_chunk_1"];
      const mockMetadatas = [
        {
          filename: fileName,
          fileType: "text/plain",
          originalDocId: oldDocId,
          chunkIndex: 0,
        },
        {
          filename: fileName,
          fileType: "text/plain",
          originalDocId: oldDocId,
          chunkIndex: 1,
        },
      ];

      mockCollection.get.mockResolvedValue({
        ids: mockChunkIds,
        metadatas: mockMetadatas,
      });

      await ragService.updateDocumentMetadata(oldDocId, newDocId, fileName);

      expect(mockCollection.get).toHaveBeenCalledWith({
        where: {
          $and: [{ originalDocId: oldDocId }, { filename: fileName }],
        },
      });

      expect(mockCollection.update).toHaveBeenCalledWith({
        ids: mockChunkIds,
        metadatas: [
          {
            filename: fileName,
            fileType: "text/plain",
            originalDocId: newDocId,
            chunkIndex: 0,
          },
          {
            filename: fileName,
            fileType: "text/plain",
            originalDocId: newDocId,
            chunkIndex: 1,
          },
        ],
      });
    });

    it("should not update chunks from other files", async () => {
      const oldDocId = "doc1";
      const newDocId = "doc2";
      const fileName = "file1.txt";

      mockCollection.get.mockResolvedValue({
        ids: ["doc1_chunk_0"],
        metadatas: [
          {
            filename: fileName,
            originalDocId: oldDocId,
          },
        ],
      });

      await ragService.updateDocumentMetadata(oldDocId, newDocId, fileName);

      // Verify query filters by both documentId AND fileName
      expect(mockCollection.get).toHaveBeenCalledWith({
        where: {
          $and: [{ originalDocId: oldDocId }, { filename: fileName }],
        },
      });
    });

    it("should not call update if no chunks found", async () => {
      mockCollection.get.mockResolvedValue({
        ids: [],
        metadatas: [],
      });

      await ragService.updateDocumentMetadata("doc1", "doc2", "test.txt");

      expect(mockCollection.get).toHaveBeenCalled();
      expect(mockCollection.update).not.toHaveBeenCalled();
    });

    it("should handle undefined metadatas gracefully", async () => {
      const oldDocId = "doc1";
      const newDocId = "doc2";
      const fileName = "test.txt";

      mockCollection.get.mockResolvedValue({
        ids: ["doc1_chunk_0", "doc1_chunk_1"],
        metadatas: undefined, // ChromaDB might return undefined
      });

      await ragService.updateDocumentMetadata(oldDocId, newDocId, fileName);

      expect(mockCollection.update).toHaveBeenCalledWith({
        ids: ["doc1_chunk_0", "doc1_chunk_1"],
        metadatas: [{ originalDocId: newDocId }, { originalDocId: newDocId }],
      });
    });

    it("should handle null metadata objects gracefully", async () => {
      const oldDocId = "doc1";
      const newDocId = "doc2";
      const fileName = "test.txt";

      mockCollection.get.mockResolvedValue({
        ids: ["doc1_chunk_0", "doc1_chunk_1", "doc1_chunk_2"],
        metadatas: [
          { filename: fileName, originalDocId: oldDocId },
          null, // Some metadata might be null
          { filename: fileName, originalDocId: oldDocId, chunkIndex: 2 },
        ],
      });

      await ragService.updateDocumentMetadata(oldDocId, newDocId, fileName);

      expect(mockCollection.update).toHaveBeenCalledWith({
        ids: ["doc1_chunk_0", "doc1_chunk_1", "doc1_chunk_2"],
        metadatas: [
          { filename: fileName, originalDocId: newDocId },
          { originalDocId: newDocId }, // null metadata gets minimal replacement
          { filename: fileName, originalDocId: newDocId, chunkIndex: 2 },
        ],
      });
    });

    it("should handle mixed null and valid metadata objects", async () => {
      const oldDocId = "doc1";
      const newDocId = "doc2";
      const fileName = "test.txt";

      mockCollection.get.mockResolvedValue({
        ids: ["id1", "id2"],
        metadatas: [null, null], // All null
      });

      await ragService.updateDocumentMetadata(oldDocId, newDocId, fileName);

      expect(mockCollection.update).toHaveBeenCalledWith({
        ids: ["id1", "id2"],
        metadatas: [{ originalDocId: newDocId }, { originalDocId: newDocId }],
      });
    });
  });

  describe("listCollections", () => {
    it("should return list of collection names", async () => {
      const mockCollections = [
        { name: "collection1" },
        { name: "collection2" },
        { name: "collection3" },
      ];

      mockChromaClient.listCollections.mockResolvedValue(mockCollections);

      const result = await ragService.listCollections();

      expect(result).toEqual(["collection1", "collection2", "collection3"]);
      expect(mockChromaClient.listCollections).toHaveBeenCalled();
    });

    it("should return empty array if no collections", async () => {
      mockChromaClient.listCollections.mockResolvedValue([]);

      const result = await ragService.listCollections();

      expect(result).toEqual([]);
    });
  });

  describe("clearCollection", () => {
    it("should delete collection by name", async () => {
      const collectionName = "test_collection";

      await ragService.clearCollection(collectionName);

      expect(mockChromaClient.deleteCollection).toHaveBeenCalledWith({
        name: collectionName,
      });
    });

    it("should handle errors gracefully", async () => {
      const collectionName = "test_collection";
      mockChromaClient.deleteCollection.mockRejectedValue(
        new Error("Collection not found"),
      );

      // Should not throw
      await expect(
        ragService.clearCollection(collectionName),
      ).resolves.not.toThrow();
    });
  });
});
