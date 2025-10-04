import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

// Mock dependencies
vi.mock("@/lib/auth/server", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/rag/service", () => ({
  ragService: {
    listCollections: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getCurrentUserId } from "@/lib/auth/server";
import { ragService } from "@/lib/rag/service";
import { createClient } from "@/lib/supabase/server";

describe("DELETE /api/documents/[documentId]/file/[fileName]", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn(),
          list: vi.fn(),
        })),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/documents/doc1/file/test.txt",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({
      documentId: "doc1",
      fileName: "test.txt",
    });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 if file deletion from storage fails", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const mockRemove = vi
      .fn()
      .mockResolvedValue({ error: { message: "Delete failed" } });

    mockSupabase.storage.from.mockReturnValue({
      remove: mockRemove,
      list: vi.fn(),
    });

    const request = new Request(
      "http://localhost/api/documents/doc1/file/test.txt",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({
      documentId: "doc1",
      fileName: "test.txt",
    });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete file");
    expect(mockRemove).toHaveBeenCalledWith(["user1/doc1/test.txt"]);
  });

  it("should successfully delete file and remove from RAG", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");
    vi.mocked(ragService.listCollections).mockResolvedValue([
      "collection1",
      "collection2",
    ]);
    vi.mocked(ragService.deleteFile).mockResolvedValue();

    const mockRemove = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.storage.from.mockReturnValue({
      remove: mockRemove,
    });

    const request = new Request(
      "http://localhost/api/documents/doc1/file/test.txt",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({
      documentId: "doc1",
      fileName: "test.txt",
    });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify file was deleted from storage
    expect(mockRemove).toHaveBeenCalledWith(["user1/doc1/test.txt"]);

    // Verify RAG deletion was called for all collections
    expect(ragService.deleteFile).toHaveBeenCalledTimes(2);
    expect(ragService.deleteFile).toHaveBeenCalledWith(
      "doc1",
      "test.txt",
      "collection1",
    );
    expect(ragService.deleteFile).toHaveBeenCalledWith(
      "doc1",
      "test.txt",
      "collection2",
    );
  });

  it("should still succeed even if RAG deletion fails", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");
    vi.mocked(ragService.listCollections).mockResolvedValue(["collection1"]);
    vi.mocked(ragService.deleteFile).mockRejectedValue(
      new Error("RAG deletion failed"),
    );

    const mockRemove = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.storage.from.mockReturnValue({
      remove: mockRemove,
    });

    const request = new Request(
      "http://localhost/api/documents/doc1/file/test.txt",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({
      documentId: "doc1",
      fileName: "test.txt",
    });

    const response = await DELETE(request, { params });
    const data = await response.json();

    // Should still succeed because file is deleted from storage
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should handle files with special characters in name", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");
    vi.mocked(ragService.listCollections).mockResolvedValue([]);

    const mockRemove = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.storage.from.mockReturnValue({
      remove: mockRemove,
    });

    const fileName = "test file (1).txt";
    const request = new Request(
      `http://localhost/api/documents/doc1/file/${encodeURIComponent(fileName)}`,
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({
      documentId: "doc1",
      fileName: fileName,
    });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRemove).toHaveBeenCalledWith([`user1/doc1/${fileName}`]);
  });
});
