import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import type { RAGDocument } from "@/lib/rag";
import { ragService } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const STORAGE_BUCKET = "documents";
const MAX_FILES = 20;
const MAX_TOTAL_MB = 100;

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

    // DoS prevention: check file count
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

    // DoS prevention: check total size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalMB = totalSize / 1024 / 1024;
    if (totalMB > MAX_TOTAL_MB) {
      return NextResponse.json(
        {
          error: `Total file size exceeds ${MAX_TOTAL_MB} MB limit`,
          limit: `${MAX_TOTAL_MB} MB`,
          totalSize: `${totalMB.toFixed(2)} MB`,
          fileCount: files.length,
        },
        { status: 413 },
      );
    }

    const supabase = await createClient();
    const documents: RAGDocument[] = [];

    // Download files from Supabase and prepare for RAG indexing
    for (const fileMetadata of files) {
      try {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(fileMetadata.filePath);

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
            storageUrl: fileMetadata.filePath,
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
