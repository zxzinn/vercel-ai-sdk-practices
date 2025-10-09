import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import type { RAGDocument } from "@/lib/rag";
import { ragService } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const STORAGE_BUCKET = "documents";
const MAX_FILES = 20;

interface IngestRequest {
  files: Array<{
    documentId: string;
    fileName: string;
    filePath: string;
    size: number;
    type: string;
  }>;
  collectionName?: string;
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized - Please refresh the page to sign in",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    const body = (await req.json()) as IngestRequest;
    const { files, collectionName } = body;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // DoS prevention: limit number of files to prevent timeout
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `Too many files. Maximum ${MAX_FILES} files allowed per request.`,
          limit: MAX_FILES,
          provided: files.length,
        },
        { status: 413 },
      );
    }

    // Note: File size limits are enforced by Supabase Storage during upload.
    // We don't validate sizes here since they could be client-controlled.
    // Supabase Free Plan enforces a 50 MB per file limit.

    const supabase = await createClient();
    const documents: RAGDocument[] = [];

    // Download files from Supabase and prepare for RAG indexing
    for (const fileMetadata of files) {
      try {
        // Reconstruct file path from trusted data to prevent path traversal attacks
        // Never trust client-provided filePath directly
        const sanitizedFileName = sanitizeFileName(fileMetadata.fileName);
        const trustedPath = `${userId}/${fileMetadata.documentId}/${sanitizedFileName}`;

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(trustedPath);

        if (error) {
          console.error(`Failed to download ${fileMetadata.fileName}:`, error);
          return NextResponse.json(
            {
              error: `Failed to download file: ${fileMetadata.fileName}`,
              message: error.message,
            },
            { status: 500 },
          );
        }

        const content = await data.text();

        documents.push({
          id: fileMetadata.documentId,
          content,
          metadata: {
            filename: fileMetadata.fileName,
            fileType: fileMetadata.type || "text/plain",
            uploadedAt: new Date(),
            size: fileMetadata.size,
            storageUrl: trustedPath,
          },
        });
      } catch (error) {
        console.error(`Error processing file ${fileMetadata.fileName}:`, error);
        return NextResponse.json(
          {
            error: `Failed to process file: ${fileMetadata.fileName}`,
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    }

    const result = await ragService.ingest(documents, {
      collectionName,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${result.totalChunks} chunks from ${files.length} file(s)`,
      ...result,
    });
  } catch (error) {
    console.error("RAG ingest error:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest documents",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : "";
  const baseName =
    lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const sanitizedExtension = extension.replace(/[^a-zA-Z0-9.]/g, "");

  return sanitizedBaseName + sanitizedExtension;
}
