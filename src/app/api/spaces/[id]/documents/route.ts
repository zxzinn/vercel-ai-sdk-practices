import { NextResponse } from "next/server";
import { requireSpaceAccess } from "@/lib/auth/api-helpers";
import { createErrorFromException } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: spaceId } = await params;

    const accessResult = await requireSpaceAccess(spaceId);
    if (accessResult instanceof NextResponse) return accessResult;

    const documents = await prisma.document.findMany({
      where: { spaceId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        metadata: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    return createErrorFromException(error, "Failed to fetch documents");
  }
}
