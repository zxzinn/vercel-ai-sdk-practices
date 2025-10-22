import { NextResponse } from "next/server";
import { z } from "zod";
import { type Prisma, VectorProvider } from "@/generated/prisma";
import { getCurrentUserId } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { validateProviderConfig } from "@/lib/vector";

const CreateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100),
  description: z.string().max(500).optional(),
  vectorProvider: z.nativeEnum(VectorProvider).optional().default("MILVUS"),
  vectorConfig: z.record(z.string(), z.unknown()).optional(),
  embeddingModel: z.string().optional().default("cohere/embed-v4.0"),
  embeddingDim: z.number().int().positive().optional().default(1536),
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

    const {
      name,
      description,
      vectorProvider,
      vectorConfig,
      embeddingModel,
      embeddingDim,
    } = validation.data;

    // Validate vector configuration
    if (vectorConfig) {
      const configValidation = validateProviderConfig(
        vectorProvider,
        vectorConfig,
      );
      if (!configValidation.valid) {
        return NextResponse.json(
          {
            error: "Invalid vector configuration",
            details: configValidation.errors,
          },
          { status: 400 },
        );
      }
    }

    const space = await prisma.space.create({
      data: {
        name,
        description,
        userId,
        vectorProvider,
        vectorConfig: (vectorConfig ?? null) as Prisma.InputJsonValue,
        embeddingModel,
        embeddingDim,
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
