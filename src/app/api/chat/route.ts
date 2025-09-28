import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { tavilySearch } from "@/lib/tools/websearch/tavily-search";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    const {
      messages,
      model,
      webSearch = false,
      searchProviders = [],
      reasoning = true,
    }: {
      messages: UIMessage[];
      model: string;
      webSearch?: boolean;
      searchProviders?: string[];
      reasoning?: boolean;
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
      // Enable reasoning based on model provider and user preference
      ...(model.startsWith("openai/") &&
        reasoning && {
          providerOptions: {
            openai: {
              reasoningSummary: "detailed" as const, // OpenAI reasoning summaries
            },
          },
        }),
      ...(model.startsWith("google/") &&
        reasoning && {
          providerOptions: {
            google: {
              thinkingConfig: {
                thinkingBudget: 8192, // Google thinking budget
                includeThoughts: true, // Google thinking summaries
              },
            },
          },
        }),
    });

    // Return UI message stream with reasoning summaries enabled
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });
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
