import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { ragService } from "@/lib/rag/service";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { filePath, fromDocId, toDocId } = await request.json();

    if (!filePath || !fromDocId || !toDocId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Extract filename from path
    const fileName = filePath.split("/").pop();
    if (!fileName) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Validate that filePath belongs to current user and fromDocId
    const expectedPrefix = `${userId}/${fromDocId}/`;
    if (!filePath.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid file path" },
        { status: 403 },
      );
    }

    const newPath = `${userId}/${toDocId}/${fileName}`;

    // Move file in Storage
    const { error: moveError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .move(filePath, newPath);

    if (moveError) {
      console.error("Failed to move file:", moveError);
      return NextResponse.json(
        { error: "Failed to move file" },
        { status: 500 },
      );
    }

    // Update RAG metadata - search all collections
    try {
      const collections = await ragService.listCollections();
      for (const collectionName of collections) {
        await ragService.updateDocumentMetadata(
          fromDocId,
          toDocId,
          fileName,
          collectionName,
        );
      }
    } catch (ragError) {
      console.error("Failed to update RAG metadata:", ragError);
      // Rollback: move file back to original location
      await supabase.storage.from(STORAGE_BUCKET).move(newPath, filePath);
      return NextResponse.json(
        { error: "Failed to update search index" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, newPath });
  } catch (error) {
    console.error("Error moving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
