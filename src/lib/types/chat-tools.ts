import type { InferUITools, ToolSet } from "ai";
import { generateImageTool } from "@/lib/tools/image/generate-image";
import { exaSearch } from "@/lib/tools/websearch/exa-search";
import { perplexitySearch } from "@/lib/tools/websearch/perplexity-search";
// Import all tool functions to infer their types
import { tavilySearch } from "@/lib/tools/websearch/tavily-search";

/**
 * Static tools that are known at compile time.
 * MCP tools are added at runtime and use DynamicToolUIPart.
 */
const staticTools = {
  tavilySearch,
  exaSearch,
  perplexitySearch,
  generateImage: generateImageTool,
} satisfies ToolSet;

/**
 * Inferred UI tool types from static tools
 */
export type AppTools = InferUITools<typeof staticTools>;

/**
 * Export static tools for use in route.ts
 */
export { staticTools, generateImageTool };
