import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock dependencies
vi.mock("@/lib/auth/server", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/rag/service", () => ({
  ragService: {
    listCollections: vi.fn(),
    updateDocumentMetadata: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getCurrentUserId } from "@/lib/auth/server";
import { ragService } from "@/lib/rag/service";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/documents/move", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(),
          move: vi.fn(),
        })),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 400 if required fields are missing", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should return 400 if filename cannot be extracted", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid file path");
  });

  it("should return 403 if source file path does not belong to user", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user2/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized: Invalid file path");
  });

  it("should return 403 if source file path does not match fromDocId", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/wrongDoc/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized: Invalid file path");
  });

  it("should return 403 if destination folder does not exist (error)", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const mockList = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    mockSupabase.storage.from.mockReturnValue({
      list: mockList,
      move: vi.fn(),
    });

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized: Invalid destination folder");
    expect(mockList).toHaveBeenCalledWith("user1/doc2", { limit: 1 });
  });

  it("should return 403 if destination folder does not exist (empty array)", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    // Supabase returns empty array for non-existent paths
    const mockList = vi.fn().mockResolvedValue({
      data: [], // Empty array = folder doesn't exist
      error: null,
    });

    mockSupabase.storage.from.mockReturnValue({
      list: mockList,
      move: vi.fn(),
    });

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "nonexistent",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized: Invalid destination folder");
    expect(mockList).toHaveBeenCalledWith("user1/nonexistent", { limit: 1 });
  });

  it("should return 500 if file move fails", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");

    const mockList = vi.fn().mockResolvedValue({
      data: [{ name: "existing-file.txt" }], // Non-empty = folder exists
      error: null,
    });
    const mockMove = vi
      .fn()
      .mockResolvedValue({ error: { message: "Move failed" } });

    mockSupabase.storage.from.mockReturnValue({
      list: mockList,
      move: mockMove,
    });

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to move file");
  });

  it("should rollback and return 500 if RAG update fails", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");
    vi.mocked(ragService.listCollections).mockResolvedValue(["collection1"]);
    vi.mocked(ragService.updateDocumentMetadata).mockRejectedValue(
      new Error("RAG update failed"),
    );

    const mockList = vi.fn().mockResolvedValue({
      data: [{ name: "existing-file.txt" }], // Non-empty = folder exists
      error: null,
    });
    const mockMove = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.storage.from.mockReturnValue({
      list: mockList,
      move: mockMove,
    });

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update search index");
    // Verify rollback was attempted
    expect(mockMove).toHaveBeenCalledTimes(2);
    expect(mockMove).toHaveBeenLastCalledWith(
      "user1/doc2/file.txt",
      "user1/doc1/file.txt",
    );
  });

  it("should return specific error if rollback also fails", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");
    vi.mocked(ragService.listCollections).mockResolvedValue(["collection1"]);
    vi.mocked(ragService.updateDocumentMetadata).mockRejectedValue(
      new Error("RAG update failed"),
    );

    const mockList = vi.fn().mockResolvedValue({
      data: [{ name: "existing-file.txt" }], // Non-empty = folder exists
      error: null,
    });
    const mockMove = vi
      .fn()
      .mockResolvedValueOnce({ error: null }) // Initial move succeeds
      .mockResolvedValueOnce({ error: { message: "Rollback failed" } }); // Rollback fails

    mockSupabase.storage.from.mockReturnValue({
      list: mockList,
      move: mockMove,
    });

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "Failed to update search index and rollback failed - system in inconsistent state",
    );
  });

  it("should successfully move file and update RAG metadata", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user1");
    vi.mocked(ragService.listCollections).mockResolvedValue([
      "collection1",
      "collection2",
    ]);
    vi.mocked(ragService.updateDocumentMetadata).mockResolvedValue();

    const mockList = vi.fn().mockResolvedValue({
      data: [{ name: "existing-file.txt" }], // Non-empty = folder exists
      error: null,
    });
    const mockMove = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.storage.from.mockReturnValue({
      list: mockList,
      move: mockMove,
    });

    const request = new Request("http://localhost/api/documents/move", {
      method: "POST",
      body: JSON.stringify({
        filePath: "user1/doc1/file.txt",
        fromDocId: "doc1",
        toDocId: "doc2",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.newPath).toBe("user1/doc2/file.txt");

    // Verify RAG update was called for all collections
    expect(ragService.updateDocumentMetadata).toHaveBeenCalledTimes(2);
    expect(ragService.updateDocumentMetadata).toHaveBeenCalledWith(
      "doc1",
      "doc2",
      "file.txt",
      "collection1",
    );
    expect(ragService.updateDocumentMetadata).toHaveBeenCalledWith(
      "doc1",
      "doc2",
      "file.txt",
      "collection2",
    );
  });
});
