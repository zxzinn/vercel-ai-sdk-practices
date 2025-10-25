import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpaceAccess } from "@/lib/auth/api-helpers";
import { createErrorFromException, Errors } from "@/lib/errors/api-error";
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
    return createErrorFromException(error, "Failed to fetch tags");
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

    // Rely on unique constraint to prevent duplicates
    // Removes race condition between check and create
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
    // Map Prisma unique constraint violation to 409 Conflict
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Errors.conflict("Tag with this name already exists in this space");
    }
    return createErrorFromException(error, "Failed to create tag");
  }
}
