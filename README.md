# Vercel AI SDK Practices

Practice project exploring Vercel AI SDK features with Next.js and TypeScript.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Set up Supabase Storage (one-time)
# Copy supabase/setup-storage-rls.sql → Supabase SQL Editor → Run

# 4. Start development server
npm run dev
```

## Environment Variables

Create `.env.local`:

```bash
# AI Gateway (Required)
AI_GATEWAY_API_KEY=your_key

# Supabase (Required for Storage & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL="postgresql://..."  # Connection pooling URL
DIRECT_URL="postgresql://..."    # Direct connection URL

# Optional: Search APIs
TAVILY_API_KEY=your_tavily_key
EXA_API_KEY=your_exa_key
```

See `.env.example` for all available environment variables.

### Supabase Setup

The project uses **anonymous authentication** - users are automatically signed in without registration!

**Setup steps:**
1. Enable **Anonymous sign-ins** in Authentication → Providers
2. **Disable Captcha** in Authentication → Settings → Bot Protection
3. Copy `supabase/setup-storage-rls.sql` and run in SQL Editor

See [`supabase/README.md`](./supabase/README.md) for details.

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
