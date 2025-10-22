export const TOOL_CONFIG = {
  tavilySearch: { title: "Web Search (Tavily)" },
  exaSearch: { title: "Web Search (Exa)" },
  perplexitySearch: { title: "Web Search (Perplexity)" },
  ragQuery: { title: "Document Search (RAG)" },
  generateImage: { title: "Image Generation" },
} as const;

export type ToolName = keyof typeof TOOL_CONFIG;
