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
        const collection = await ragService.getCollection(collectionName);

        // Get all chunks with this originalDocId
        const results = await collection.get({
          where: { originalDocId: fromDocId },
        });

        if (results.ids.length > 0) {
          // Update metadata for all chunks
          const updatedMetadatas = results.metadatas.map((meta) => ({
            ...meta,
            originalDocId: toDocId,
          }));

          await collection.update({
            ids: results.ids,
            metadatas: updatedMetadatas,
          });
        }
      }
    } catch (ragError) {
      console.error("Failed to update RAG metadata:", ragError);
      // Continue even if RAG update fails
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
