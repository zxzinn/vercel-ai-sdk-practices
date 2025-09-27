import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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
    const availableTools: Record<string, any> = {};

    if (webSearch) {
      // For backwards compatibility, if webSearch is true but no providers specified, use Google
      const providers =
        searchProviders.length > 0 ? searchProviders : ["google"];

      providers.forEach((provider) => {
        switch (provider) {
          case "google":
            availableTools.google_search = google.tools.googleSearch({});
            break;
          // Future search providers can be added here
          // case 'bing':
          //   availableTools.bing_search = bing.tools.search({});
          //   break;
          // case 'perplexity':
          //   availableTools.perplexity_search = perplexity.tools.search({});
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
    });

    // Return the stream response with sources and reasoning support
    return result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: true,
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
