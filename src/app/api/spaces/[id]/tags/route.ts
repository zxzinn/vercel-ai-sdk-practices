import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpaceAccess } from "@/lib/auth/api-helpers";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validation/api-validation";

const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: spaceId } = await params;

    const accessResult = await requireSpaceAccess(spaceId);
    if (accessResult instanceof NextResponse) return accessResult;

    const tags = await prisma.tag.findMany({
      where: { spaceId },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tags",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: spaceId } = await params;

    const accessResult = await requireSpaceAccess(spaceId);
    if (accessResult instanceof NextResponse) return accessResult;

    const body = await req.json();
    const validationResult = validateRequest(CreateTagSchema, body);
    if (validationResult instanceof NextResponse) return validationResult;

    const { name, color } = validationResult;

    const existingTag = await prisma.tag.findUnique({
      where: {
        spaceId_name: {
          spaceId,
          name,
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag with this name already exists in this space" },
        { status: 409 },
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        spaceId,
      },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error("Failed to create tag:", error);
    return NextResponse.json(
      {
        error: "Failed to create tag",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
