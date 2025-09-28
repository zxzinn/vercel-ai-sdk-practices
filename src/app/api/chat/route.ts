import type { LanguageModelV2Source } from "@ai-sdk/provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { tavilySearch } from "@/lib/tools/websearch/tavily-search";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface ToolOutputWithSources {
  sources?: LanguageModelV2Source[];
  [key: string]: unknown;
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      model,
      webSearch = false,
      searchProviders = [],
    }: {
      messages: UIMessage[];
      model: string;
      webSearch?: boolean;
      searchProviders?: string[];
    } = await req.json();

    if (!model) {
      return new Response(
        JSON.stringify({
          error: "Model is required",
          message: "Please specify a model to use",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Convert UI messages to model messages
    const convertedMessages = convertToModelMessages(messages);

    // Determine available search tools based on searchProviders
    const availableTools: Record<string, typeof tavilySearch> = {};

    if (webSearch) {
      const providers =
        searchProviders.length > 0 ? searchProviders : ["tavily"];

      providers.forEach((provider) => {
        switch (provider) {
          case "tavily":
            availableTools.tavilySearch = tavilySearch;
            break;
          // Future search providers can be added here
          // case 'exa':
          //   availableTools.exa_search = exaSearch;
          //   break;
          default:
            console.warn(`Unknown search provider: ${provider}`);
        }
      });
    }

    const hasSearchTools = Object.keys(availableTools).length > 0;
    const result = streamText({
      model: model,
      messages: convertedMessages,
      system: hasSearchTools
        ? "You are a helpful assistant with access to web search capabilities. When users ask questions that would benefit from current information, use the available search tools to find up-to-date information and cite your sources."
        : "You are a helpful assistant that can answer questions and help with tasks.",
      tools: hasSearchTools ? availableTools : undefined,
      // Critical: Enables multi-step execution so LLM can respond to tool errors and continue the conversation
      stopWhen: stepCountIs(5),
    });

    // Custom stream to extract sources from tool outputs
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });

        // Convert and merge the main stream
        const mainStream = result.toUIMessageStream({ sendStart: false });

        // Process stream parts to extract sources from tool outputs
        const reader = mainStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Check for completed tool calls with sources
            if (
              value.type === "tool-output-available" &&
              value.output &&
              typeof value.output === "object" &&
              "sources" in value.output
            ) {
              const toolOutput = value.output as ToolOutputWithSources;
              if (
                Array.isArray(toolOutput.sources) &&
                toolOutput.sources &&
                toolOutput.sources.length > 0
              ) {
                // Write sources before the tool result
                toolOutput.sources.forEach((source) => {
                  if (source.sourceType === "url") {
                    writer.write({
                      type: "source-url",
                      sourceId: source.id,
                      url: source.url,
                      title: source.title,
                    });
                  }
                });
              }
            }

            // Write the original part
            writer.write(value);
          }
        } finally {
          reader.releaseLock();
        }
      },
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
