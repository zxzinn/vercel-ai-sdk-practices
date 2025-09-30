import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import type { RAGDocument } from "@/lib/rag";
import { ragService } from "@/lib/rag";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const collectionName =
      (formData.get("collectionName") as string) || undefined;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // 处理文件
    const documents: RAGDocument[] = [];

    for (const file of files) {
      const content = await file.text();
      const docId = nanoid();

      documents.push({
        id: docId,
        content,
        metadata: {
          filename: file.name,
          fileType: file.type || "text/plain",
          uploadedAt: new Date(),
          size: file.size,
        },
      });
    }

    // 索引文档
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
