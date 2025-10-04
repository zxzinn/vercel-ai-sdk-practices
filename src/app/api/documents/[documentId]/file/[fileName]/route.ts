import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { ragService } from "@/lib/rag/service";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ documentId: string; fileName: string }> },
) {
  try {
    const { documentId, fileName } = await params;
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const supabase = await createClient();
    const filePath = `${userId}/${documentId}/${fileName}`;

    // Delete file from Storage
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (deleteError) {
      console.error("Failed to delete file:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 },
      );
    }

    // Delete from RAG if this is the only file in the document
    try {
      const { data: remainingFiles } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(`${userId}/${documentId}`);

      if (!remainingFiles || remainingFiles.length === 0) {
        const collections = await ragService.listCollections();
        for (const collectionName of collections) {
          await ragService.deleteDocument(documentId, collectionName);
        }
      }
    } catch (ragError) {
      console.error("Failed to delete from RAG:", ragError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
