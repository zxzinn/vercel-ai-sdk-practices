import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ragService } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { id: spaceId, documentId } = await params;

    const space = await prisma.space.findFirst({
      where: { id: spaceId, userId },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        spaceId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        metadata: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Failed to fetch document:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { id: spaceId, documentId } = await params;

    const space = await prisma.space.findFirst({
      where: { id: spaceId, userId },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        spaceId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const supabase = await createClient();

    // Clean up resources in order: Storage -> Vector Store -> Database
    // Use best-effort cleanup: log errors but continue deletion

    // 1. Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([document.storageUrl]);

    if (storageError) {
      console.error("Failed to delete storage file:", storageError);
      // Continue - orphaned files are less critical than DB inconsistency
    }

    // 2. Delete from vector store
    try {
      await ragService.deleteDocument(spaceId, document.vectorDocId);
    } catch (vectorError) {
      console.error("Failed to delete from vector store:", vectorError);
      // Continue - orphaned vectors can be cleaned up later
    }

    // 3. Delete database record and update statistics (atomic)
    await prisma.$transaction(async (tx) => {
      await tx.document.delete({
        where: { id: documentId },
      });

      await tx.space.update({
        where: { id: spaceId },
        data: {
          vectorCount: { decrement: document.totalChunks },
          storageSize: { decrement: document.size },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      {
        error: "Failed to delete document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
