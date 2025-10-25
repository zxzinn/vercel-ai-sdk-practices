import { NextResponse } from "next/server";
import { requireSpaceAccess } from "@/lib/auth/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    const { id: spaceId, tagId } = await params;

    const accessResult = await requireSpaceAccess(spaceId);
    if (accessResult instanceof NextResponse) return accessResult;

    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        spaceId,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return NextResponse.json(
      {
        error: "Failed to delete tag",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
