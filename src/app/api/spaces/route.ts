import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const CreateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const spaces = await prisma.space.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            documents: true,
            tags: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ spaces });
  } catch (error) {
    console.error("Failed to fetch spaces:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch spaces",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const validation = CreateSpaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { name, description } = validation.data;

    const space = await prisma.space.create({
      data: {
        name,
        description,
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
            tags: true,
          },
        },
      },
    });

    return NextResponse.json({ space }, { status: 201 });
  } catch (error) {
    console.error("Failed to create space:", error);
    return NextResponse.json(
      {
        error: "Failed to create space",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
