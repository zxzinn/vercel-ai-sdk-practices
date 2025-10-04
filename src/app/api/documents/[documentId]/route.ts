import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { ragService } from "@/lib/rag/service";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const supabase = await createClient();
    const folderPath = `${userId}/${documentId}`;

    // List all files in the document folder
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath);

    if (listError) {
      console.error("Failed to list files:", listError);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 },
      );
    }

    // Delete all files in Storage
    if (files && files.length > 0) {
      const filePaths = files.map((file) => `${folderPath}/${file.name}`);

      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths);

      if (deleteError) {
        console.error("Failed to delete files:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete document files" },
          { status: 500 },
        );
      }
    }

    // Delete from RAG (ChromaDB) - try all collections
    try {
      const collections = await ragService.listCollections();
      for (const collectionName of collections) {
        await ragService.deleteDocument(documentId, collectionName);
      }
    } catch (ragError) {
      console.error("Failed to delete from RAG:", ragError);
      // Continue even if RAG deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
