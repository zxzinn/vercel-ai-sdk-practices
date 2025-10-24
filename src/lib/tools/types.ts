import type { InferToolInput, InferToolOutput } from "ai";
import type { generateImageTool } from "./image/generate-image";
import type { createRagQueryTool } from "./rag/query";
import type { exaSearch } from "./websearch/exa-search";
import type { perplexitySearch } from "./websearch/perplexity-search";
import type { tavilySearch } from "./websearch/tavily-search";

// Type for RAG query tool created by factory function
type RagQueryTool = ReturnType<typeof createRagQueryTool>;

// Infer input types from tool schemas
export type TavilySearchInput = InferToolInput<typeof tavilySearch>;
export type ExaSearchInput = InferToolInput<typeof exaSearch>;
export type PerplexitySearchInput = InferToolInput<typeof perplexitySearch>;
export type RagQueryInput = InferToolInput<RagQueryTool>;
export type GenerateImageInput = InferToolInput<typeof generateImageTool>;

// Infer output types from tool implementations
export type TavilySearchOutput = InferToolOutput<typeof tavilySearch>;
export type ExaSearchOutput = InferToolOutput<typeof exaSearch>;
export type PerplexitySearchOutput = InferToolOutput<typeof perplexitySearch>;
export type RagQueryOutput = InferToolOutput<RagQueryTool>;
export type GenerateImageOutput = InferToolOutput<typeof generateImageTool>;

// Union types for all tools
export type AnyToolInput =
  | TavilySearchInput
  | ExaSearchInput
  | PerplexitySearchInput
  | RagQueryInput
  | GenerateImageInput;

export type AnyToolOutput =
  | TavilySearchOutput
  | ExaSearchOutput
  | PerplexitySearchOutput
  | RagQueryOutput
  | GenerateImageOutput;
