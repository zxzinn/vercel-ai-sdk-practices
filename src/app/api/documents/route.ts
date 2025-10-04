import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    // List all document folders (first level: documentId folders)
    const { data: folders, error: foldersError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (foldersError) {
      console.error("Failed to list folders:", foldersError);
      return NextResponse.json(
        { error: "Failed to retrieve documents" },
        { status: 500 },
      );
    }

    // Process all folders in parallel
    const folderPromises = (folders || [])
      .filter((folder) => folder.id === null) // Only process folders
      .map(async (folder) => {
        const { data: files, error: filesError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(`${userId}/${folder.name}`, {
            limit: 100,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (filesError) {
          console.error(`Failed to list files in ${folder.name}:`, filesError);
          return [];
        }

        // Process all files in this folder in parallel
        const filePromises = (files || [])
          .filter((file) => file.id !== null) // Only process files
          .map(async (file) => {
            const filePath = `${userId}/${folder.name}/${file.name}`;

            const { data: urlData } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(filePath, 3600);

            return {
              documentId: folder.name,
              fileName: file.name,
              filePath,
              size: file.metadata?.size || 0,
              createdAt: file.created_at || new Date().toISOString(),
              downloadUrl: urlData?.signedUrl || null,
            };
          });

        return Promise.all(filePromises);
      });

    const documentsNested = await Promise.all(folderPromises);
    const documents = documentsNested.flat();

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
