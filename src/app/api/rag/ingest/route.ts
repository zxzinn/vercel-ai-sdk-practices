import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import type { RAGDocument } from "@/lib/rag";
import { ragService } from "@/lib/rag";
import { uploadFile } from "@/lib/storage/server";

export const maxDuration = 60;

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

    const formData = await req.formData();
    const raw = formData.getAll("files");
    const files = raw.filter(
      (f): f is File => typeof f !== "string" && "arrayBuffer" in f,
    );
    const MAX_FILE_MB = 10;
    const tooLarge = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooLarge) {
      return NextResponse.json(
        { error: `File ${tooLarge.name} exceeds ${MAX_FILE_MB}MB limit` },
        { status: 413 },
      );
    }
    const collectionName =
      (formData.get("collectionName") as string) || undefined;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const documents: RAGDocument[] = [];

    for (const file of files) {
      const content = await file.text();
      const docId = nanoid();

      const { storageUrl } = await uploadFile({
        userId,
        documentId: docId,
        file,
      });

      documents.push({
        id: docId,
        content,
        metadata: {
          filename: file.name,
          fileType: file.type || "text/plain",
          uploadedAt: new Date(),
          size: file.size,
          storageUrl,
        },
      });
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
