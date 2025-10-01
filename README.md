# Vercel AI SDK Practices

Practice project exploring Vercel AI SDK features with Next.js and TypeScript.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env.local`:

```bash
# AI Gateway
AI_GATEWAY_API_KEY=your_key

# Database (Optional - for Prisma + Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

See `.env.example` for all available environment variables.

## Roadmap

### 🔍 Search Engine Integration
- [x] Exa API
- [ ] Bing Search API
- [ ] Perplexity API
- [ ] Google Search API

### 🧠 RAG
- [x] Naive RAG (ChromaDB + Cohere embeddings)

### 🗄️ Infrastructure
- [x] Prisma ORM integration
- [x] Supabase PostgreSQL connection
- [ ] Milvus Cloud (vector database)

### Features
- [ ] DeepResearch
- [ ] Image Generation
- [ ] Voice Input
