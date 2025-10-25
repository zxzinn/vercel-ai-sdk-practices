import { NextResponse } from "next/server";
import { z } from "zod";
import { type Prisma, VectorProvider } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth/api-helpers";
import { createErrorFromException, Errors } from "@/lib/errors/api-error";
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
    return createErrorFromException(error, "Failed to fetch spaces");
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
      return Errors.badRequest("Invalid embedding model", {
        message: `Embedding model '${embeddingModelId}' not found`,
      });
    }

    // Validate dimension is supported by the model
    if (!embeddingModel.dimensions.includes(embeddingDim)) {
      return Errors.badRequest("Invalid embedding dimension", {
        message:
          `Dimension ${embeddingDim} not supported by ${embeddingModel.name}. ` +
          `Supported dimensions: ${embeddingModel.dimensions.join(", ")}`,
      });
    }

    // Validate vector configuration (required for all providers)
    if (!vectorConfig) {
      return Errors.badRequest("Vector configuration is required", {
        message:
          "vectorConfig must be provided with provider connection details",
      });
    }

    const configValidation = validateProviderConfig(
      vectorProvider,
      vectorConfig,
    );
    if (!configValidation.valid) {
      return Errors.badRequest(
        "Invalid vector configuration",
        configValidation.errors,
      );
    }

    // Safely coerce enableFullTextSearch to boolean
    const enableFullTextSearch = z
      .boolean()
      .catch(false)
      .parse(vectorConfig.enableFullTextSearch);

    const space = await prisma.space.create({
      data: {
        name,
        description,
        userId,
        vectorProvider,
        vectorConfig: (vectorConfig ?? null) as Prisma.InputJsonValue,
        embeddingModelId,
        embeddingDim,
        enableFullTextSearch,
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
    return createErrorFromException(error, "Failed to create space");
  }
}
