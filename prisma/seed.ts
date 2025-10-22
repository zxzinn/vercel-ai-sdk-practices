import { PrismaClient } from "@/generated/prisma";
import { EMBEDDING_MODEL_REGISTRY } from "@/lib/embeddings/registry";

const prisma = new PrismaClient();

async function seedEmbeddingModels() {
  console.log("🌱 Seeding embedding models...");

  for (const model of EMBEDDING_MODEL_REGISTRY) {
    await prisma.embeddingModel.upsert({
      where: { id: model.id },
      update: {
        name: model.name,
        provider: model.provider,
        dimensions: model.dimensions,
        defaultDim: model.defaultDim,
        maxTokens: model.maxTokens,
        costPer1M: model.costPer1M ?? null,
        description: model.description ?? null,
        isActive: true,
      },
      create: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        dimensions: model.dimensions,
        defaultDim: model.defaultDim,
        maxTokens: model.maxTokens,
        costPer1M: model.costPer1M ?? null,
        description: model.description ?? null,
        isActive: true,
      },
    });
  }

  const count = await prisma.embeddingModel.count();
  console.log(`✅ Seeded ${count} embedding models`);
}

async function main() {
  await seedEmbeddingModels();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
