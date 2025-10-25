import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpaceAccess } from "@/lib/auth/api-helpers";
import { createErrorFromException, Errors } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import { ragService } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";
import { serializeSpace } from "@/lib/utils/sanitize";
import { validateRequest } from "@/lib/validation/api-validation";

const UpdateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const accessResult = await requireSpaceAccess(id);
    if (accessResult instanceof NextResponse) return accessResult;

    const space = await prisma.space.findFirst({
      where: { id },
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
      return Errors.notFound("Space");
    }

    // Serialize space (convert BigInt and redact secrets)
    const serializedSpace = serializeSpace(space);

    return NextResponse.json({ space: serializedSpace });
  } catch (error) {
    return createErrorFromException(error, "Failed to fetch space");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const accessResult = await requireSpaceAccess(id);
    if (accessResult instanceof NextResponse) return accessResult;

    const body = await req.json();
    const validationResult = validateRequest(UpdateSpaceSchema, body);
    if (validationResult instanceof NextResponse) return validationResult;

    const updatedSpace = await prisma.space.update({
      where: { id },
      data: validationResult,
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

    // Serialize space (convert BigInt and redact secrets)
    const serializedSpace = serializeSpace(updatedSpace);

    return NextResponse.json({ space: serializedSpace });
  } catch (error) {
    return createErrorFromException(error, "Failed to update space");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const STORAGE_BUCKET = "documents";

  try {
    const { id } = await params;

    const accessResult = await requireSpaceAccess(id);
    if (accessResult instanceof NextResponse) return accessResult;

    const space = await prisma.space.findFirst({
      where: { id },
      include: {
        documents: true,
      },
    });

    if (!space) {
      return Errors.notFound("Space");
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
    return createErrorFromException(error, "Failed to delete space");
  }
}
