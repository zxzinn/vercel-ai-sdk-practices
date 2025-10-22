import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const UpdateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export async function GET(
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

    const space = await prisma.space.findFirst({
      where: {
        id,
        userId,
      },
      include: {
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

    return NextResponse.json({ space });
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
        _count: {
          select: {
            documents: true,
            tags: true,
          },
        },
      },
    });

    return NextResponse.json({ space: updatedSpace });
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

    const space = await prisma.space.findFirst({
      where: { id, userId },
      include: {
        documents: true,
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

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
