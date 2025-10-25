import { NextResponse } from "next/server";
import { z } from "zod";
import { type Prisma, VectorProvider } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth/api-helpers";
import { prisma } from "@/lib/prisma";
import { serializeSpace } from "@/lib/utils/sanitize";
import { validateRequest } from "@/lib/validation/api-validation";
import { validateProviderConfig } from "@/lib/vector";

const CreateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100),
  description: z.string().max(500).optional(),
  vectorProvider: z.nativeEnum(VectorProvider).optional().default("MILVUS"),
  vectorConfig: z
    .record(z.string(), z.unknown())
    .describe("Vector database connection configuration (required)"),
  embeddingModelId: z.string().min(1, "Embedding model ID is required"),
  embeddingDim: z.number().int().positive(),
});

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;

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

    // Serialize spaces (convert BigInt and redact secrets)
    const serializedSpaces = spaces.map((space) => serializeSpace(space));

    return NextResponse.json({ spaces: serializedSpaces });
  } catch (error) {
    console.error(
      "Failed to fetch spaces:",
      error instanceof Error ? error.message : "Unknown error",
    );
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
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;

    const body = await req.json();
    const validationResult = validateRequest(CreateSpaceSchema, body);
    if (validationResult instanceof NextResponse) return validationResult;

    const {
      name,
      description,
      vectorProvider,
      vectorConfig,
      embeddingModelId,
      embeddingDim,
    } = validationResult;

    // Validate embedding model exists
    const embeddingModel = await prisma.embeddingModel.findUnique({
      where: { id: embeddingModelId },
    });

    if (!embeddingModel) {
      return NextResponse.json(
        {
          error: "Invalid embedding model",
          details: [`Embedding model '${embeddingModelId}' not found`],
        },
        { status: 400 },
      );
    }

    // Validate dimension is supported by the model
    if (!embeddingModel.dimensions.includes(embeddingDim)) {
      return NextResponse.json(
        {
          error: "Invalid embedding dimension",
          details: [
            `Dimension ${embeddingDim} not supported by ${embeddingModel.name}. ` +
              `Supported dimensions: ${embeddingModel.dimensions.join(", ")}`,
          ],
        },
        { status: 400 },
      );
    }

    // Validate vector configuration (required for all providers)
    if (!vectorConfig) {
      return NextResponse.json(
        {
          error: "Vector configuration is required",
          details: [
            "vectorConfig must be provided with provider connection details",
          ],
        },
        { status: 400 },
      );
    }

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

    const space = await prisma.space.create({
      data: {
        name,
        description,
        userId,
        vectorProvider,
        vectorConfig: (vectorConfig ?? null) as Prisma.InputJsonValue,
        embeddingModelId,
        embeddingDim,
        status: "ACTIVE",
      },
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

    // Generate and update collection name after creation
    const collectionName = `space_${space.id.replace(/-/g, "_")}`;
    const updatedSpace = await prisma.space.update({
      where: { id: space.id },
      data: { collectionName },
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

    return NextResponse.json({ space: serializedSpace }, { status: 201 });
  } catch (error) {
    console.error(
      "Failed to create space:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error: "Failed to create space",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
