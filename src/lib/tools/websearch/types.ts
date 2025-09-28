import type { LanguageModelV2Source } from "@ai-sdk/provider";

export interface WebSearchToolResult {
  text: string;
  sources: LanguageModelV2Source[];
}
