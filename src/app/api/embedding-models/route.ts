import { NextResponse } from "next/server";
import { Errors } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const modelId = searchParams.get("id");

  // Get specific model by ID
  if (modelId) {
    const model = await prisma.embeddingModel.findUnique({
      where: { id: modelId, isActive: true },
    });

    if (!model) {
      return Errors.notFound("Model");
    }

    return NextResponse.json({ model });
  }

  // Get all models (optionally filtered by provider)
  const models = await prisma.embeddingModel.findMany({
    where: {
      isActive: true,
      ...(provider ? { provider } : {}),
    },
    orderBy: [{ provider: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ models });
}
