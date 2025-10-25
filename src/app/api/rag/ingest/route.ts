import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { prisma } from "@/lib/prisma";
import type { RAGDocument } from "@/lib/rag";
import { getCollectionName, ragService } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFileName } from "@/lib/utils/file";

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
  spaceId?: string;
  collectionName?: string;
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;

    const body = (await req.json()) as IngestRequest;
    const { files, spaceId } = body;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate spaceId is provided (required for new architecture)
    if (!spaceId) {
      return NextResponse.json(
        { error: "spaceId is required" },
        { status: 400 },
      );
    }

    // Verify space exists and belongs to user
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        userId,
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    // Use stored collection name or fallback to generated name
    const finalCollectionName =
      space.collectionName ?? getCollectionName(spaceId);

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

    // Ingest documents into vector store
    const result = await ragService.ingest(spaceId, documents, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Persist document records with atomic transaction rollback support
    try {
      await prisma.$transaction(async (tx) => {
        // Create document records
        for (const file of files) {
          const docChunks = result.documentsChunks.find(
            (dc) => dc.documentId === file.documentId,
          );

          await tx.document.create({
            data: {
              id: file.documentId,
              spaceId: space.id,
              fileName: file.fileName,
              fileType: file.type || "text/plain",
              size: file.size,
              storageUrl: `${userId}/${file.documentId}/${sanitizeFileName(file.fileName)}`,
              vectorDocId: file.documentId,
              collectionName: finalCollectionName,
              status: "INDEXED",
              totalChunks: docChunks?.chunks ?? 0,
            },
          });
        }

        // Update space statistics
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        await tx.space.update({
          where: { id: spaceId },
          data: {
            vectorCount: { increment: result.totalChunks },
            storageSize: { increment: totalSize },
          },
        });
      });
    } catch (dbError) {
      // Rollback: Remove indexed documents from vector store
      console.error(
        "Database persistence failed, rolling back vector store:",
        dbError,
      );

      try {
        await Promise.all(
          documents.map((doc) => ragService.deleteDocument(spaceId, doc.id)),
        );
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
        // Log for manual cleanup, but still throw original error
      }

      throw new Error(
        `Failed to persist document records: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
      );
    }

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
