import { embed, embedMany } from "ai";
import { ChromaClient, type Collection } from "chromadb";
import { env } from "@/lib/env";
import type {
  ChromaQueryResult,
  RAGDocument,
  RAGIngestOptions,
  RAGIngestResult,
  RAGQueryOptions,
  RAGQueryResult,
  RAGSource,
} from "./types";

const EMBEDDING_MODEL = "cohere/embed-v4.0";
const DEFAULT_COLLECTION = "rag_documents";
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// 创建空的 embedding function（我们自己生成 embeddings）
const customEmbeddingFunction = {
  generate: async () => [],
};

export class RAGService {
  private chromaClient: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    this.chromaClient = new ChromaClient({
      path: env.CHROMA_URL,
    });
  }

  /**
   * 获取或创建 collection
   */
  private async getCollection(name: string): Promise<Collection> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name,
        embeddingFunction: customEmbeddingFunction,
        metadata: { description: "RAG document collection" },
      });

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      console.error(`Failed to get/create collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * 简单的文本切分器
   */
  private chunkText(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));

      if (end === text.length) break;
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * 索引文档到向量数据库
   */
  async ingest(
    documents: RAGDocument[],
    options: RAGIngestOptions = {},
  ): Promise<RAGIngestResult> {
    const {
      collectionName = DEFAULT_COLLECTION,
      chunkSize = DEFAULT_CHUNK_SIZE,
      chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    } = options;

    const collection = await this.getCollection(collectionName);

    const allChunks: string[] = [];
    const allIds: string[] = [];
    const allMetadatas: Record<string, string | number | boolean | null>[] = [];

    // 切分文档
    for (const doc of documents) {
      const chunks = this.chunkText(doc.content, chunkSize, chunkOverlap);

      chunks.forEach((chunk, index) => {
        allChunks.push(chunk);
        allIds.push(`${doc.id}_chunk_${index}`);
        allMetadatas.push({
          filename: doc.metadata.filename,
          fileType: doc.metadata.fileType,
          size: doc.metadata.size,
          chunkIndex: index,
          totalChunks: chunks.length,
          originalDocId: doc.id,
          uploadedAt: doc.metadata.uploadedAt.toISOString(),
        });
      });
    }

    // 生成 embeddings
    console.log(`Generating embeddings for ${allChunks.length} chunks...`);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: allChunks,
    });

    // 添加到 Chromadb
    await collection.add({
      ids: allIds,
      embeddings,
      documents: allChunks,
      metadatas: allMetadatas,
    });

    console.log(`✅ Indexed ${allChunks.length} chunks into ${collectionName}`);

    return {
      documentIds: documents.map((d) => d.id),
      totalChunks: allChunks.length,
      collectionName,
    };
  }

  /**
   * 查询相关文档
   */
  async query(
    queryText: string,
    options: RAGQueryOptions = {},
  ): Promise<RAGQueryResult> {
    const {
      topK = 5,
      scoreThreshold = 0,
      collectionName = DEFAULT_COLLECTION,
    } = options;

    const collection = await this.getCollection(collectionName);

    // 生成查询 embedding
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: queryText,
    });

    // 查询 Chromadb
    const results = (await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    })) as ChromaQueryResult;

    // 转换结果
    const sources: RAGSource[] = [];

    if (results.documents[0]) {
      results.documents[0].forEach((doc, index) => {
        if (!doc) return;

        const distance = results.distances?.[0]?.[index] ?? 0;
        const score = 1 / (1 + distance); // 转换为相似度分数

        // 过滤低分结果
        if (score < scoreThreshold) return;

        const metadata = results.metadatas?.[0]?.[index] || {};
        const id = results.ids?.[0]?.[index] || `unknown-${index}`;

        sources.push({
          id,
          content: doc,
          score,
          distance,
          metadata: {
            filename: (metadata.filename as string) || "unknown",
            fileType: (metadata.fileType as string) || "unknown",
            uploadedAt: metadata.uploadedAt
              ? new Date(metadata.uploadedAt as string)
              : new Date(),
            size: (metadata.size as number) || 0,
            chunkIndex: metadata.chunkIndex as number | undefined,
            totalChunks: metadata.totalChunks as number | undefined,
            ...metadata,
          },
        });
      });
    }

    return {
      sources,
      query: queryText,
      totalResults: sources.length,
    };
  }

  /**
   * 删除文档
   */
  async deleteDocument(
    documentId: string,
    collectionName: string = DEFAULT_COLLECTION,
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);

    // 删除该文档的所有 chunks
    // Chromadb 不支持按 metadata 删除，需要先查询再删除
    const results = await collection.get({
      where: { originalDocId: documentId },
    });

    if (results.ids.length > 0) {
      await collection.delete({
        ids: results.ids,
      });
      console.log(
        `✅ Deleted ${results.ids.length} chunks for doc ${documentId}`,
      );
    }
  }

  /**
   * 清空 collection
   */
  async clearCollection(
    collectionName: string = DEFAULT_COLLECTION,
  ): Promise<void> {
    try {
      await this.chromaClient.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      console.log(`✅ Cleared collection: ${collectionName}`);
    } catch (error) {
      console.error(`Failed to clear collection ${collectionName}:`, error);
    }
  }

  /**
   * 列出所有 collections
   */
  async listCollections(): Promise<string[]> {
    const collections = await this.chromaClient.listCollections();
    return collections.map((c) => c.name);
  }
}

// 导出单例实例
export const ragService = new RAGService();
