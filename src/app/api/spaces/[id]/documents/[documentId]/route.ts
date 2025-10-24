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

    // Use transaction to ensure atomic deletion and statistics update
    await prisma.$transaction(async (tx) => {
      // Delete document record
      await tx.document.delete({
        where: { id: documentId },
      });

      // Update space statistics
      await tx.space.update({
        where: { id: spaceId },
        data: {
          vectorCount: { decrement: document.totalChunks },
          storageSize: { decrement: document.size },
        },
      });
    });

    // Delete from storage (best effort - orphaned files can be cleaned up later)
    await supabase.storage.from(STORAGE_BUCKET).remove([document.storageUrl]);

    // Delete from vector store (best effort - orphaned vectors can be cleaned up later)
    await ragService.deleteDocument(spaceId, document.vectorDocId);

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
