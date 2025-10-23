import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ragService } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

const UpdateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const space = await prisma.space.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        embeddingModel: true,
        documents: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: { uploadedAt: "desc" },
        },
        tags: true,
        _count: {
          select: {
            documents: true,
            tags: true,
          },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    // Convert BigInt to string for JSON serialization
    const serializedSpace = {
      ...space,
      storageSize: space.storageSize.toString(),
    };

    return NextResponse.json({ space: serializedSpace });
  } catch (error) {
    console.error("Failed to fetch space:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch space",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const validation = UpdateSpaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const space = await prisma.space.findFirst({
      where: { id, userId },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const updatedSpace = await prisma.space.update({
      where: { id },
      data: validation.data,
      include: {
        embeddingModel: true,
        _count: {
          select: {
            documents: true,
            tags: true,
          },
        },
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedSpace = {
      ...updatedSpace,
      storageSize: updatedSpace.storageSize.toString(),
    };

    return NextResponse.json({ space: serializedSpace });
  } catch (error) {
    console.error("Failed to update space:", error);
    return NextResponse.json(
      {
        error: "Failed to update space",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const STORAGE_BUCKET = "documents";

  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const space = await prisma.space.findFirst({
      where: { id, userId },
      include: {
        documents: true,
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    const supabase = await createClient();

    // Clean up resources in order: Storage -> Vector Store -> Database
    // Use best-effort cleanup: log errors but continue deletion

    // 1. Delete files from Supabase Storage
    if (space.documents.length > 0) {
      const storagePaths = space.documents.map((doc) => doc.storageUrl);
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        console.error("Failed to delete storage files:", storageError);
        // Continue - orphaned files are less critical than DB inconsistency
      }
    }

    // 2. Delete vector collection (using stored collectionName)
    if (space.collectionName) {
      try {
        await ragService.clearCollection(id);
      } catch (vectorError) {
        console.error("Failed to clear vector collection:", vectorError);
        // Continue - orphaned vectors can be cleaned up later
      }
    }

    // 3. Delete database records (cascades to documents, tags, etc.)
    await prisma.space.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Space deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete space:", error);
    return NextResponse.json(
      {
        error: "Failed to delete space",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
