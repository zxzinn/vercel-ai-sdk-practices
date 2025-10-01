import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { ragQuery } from "@/lib/tools/rag/query";
import { exaSearch } from "@/lib/tools/websearch/exa-search";
import { tavilySearch } from "@/lib/tools/websearch/tavily-search";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
// Schema that matches Vercel AI SDK's UIMessage format
const MessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(z.any()).optional(),
    // Support legacy content-only messages
    content: z.string().min(1).optional(),
    createdAt: z
      .union([z.string().datetime(), z.date()])
      .optional()
      .transform((v) => (typeof v === "string" ? new Date(v) : v)),
  })
  .refine(
    (m) =>
      (typeof m.content === "string" && m.content.length > 0) ||
      (Array.isArray(m.parts) && m.parts.length > 0),
    { message: "Message must include either non-empty content or parts." },
  )
  .transform((m) => ({
    ...m,
    // Ensure parts array exists for UIMessage compatibility
    parts: m.parts || [],
  }));

const RequestBodySchema = z.object({
  messages: z.array(MessageSchema).min(1, "At least one message is required"),
  model: z.string().min(1, "Model is required"),
  webSearch: z.boolean().optional().default(false),
  searchProviders: z
    .array(z.enum(["tavily", "exa"]))
    .optional()
    .default([])
    .transform((arr) => Array.from(new Set(arr))),
  rag: z.boolean().optional().default(false),
  reasoning: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: validation.error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { messages, model, webSearch, searchProviders, rag, reasoning } =
      validation.data;

    // Convert UI messages to model messages
    const convertedMessages = convertToModelMessages(messages);

    // Determine available tools based on webSearch and rag flags
    const availableTools: Record<
      string,
      typeof tavilySearch | typeof exaSearch | typeof ragQuery
    > = {};

    if (webSearch) {
      const providers =
        searchProviders.length > 0 ? searchProviders : ["tavily"];

      providers.forEach((provider) => {
        switch (provider) {
          case "tavily":
            availableTools.tavilySearch = tavilySearch;
            break;
          case "exa":
            availableTools.exaSearch = exaSearch;
            break;
          default:
            console.warn(`Unknown search provider: ${provider}`);
        }
      });
    }

    if (rag) {
      availableTools.ragQuery = ragQuery;
    }

    const hasTools = Object.keys(availableTools).length > 0;

    // Build system prompt based on available tools
    let systemPrompt = "You are a helpful assistant";
    if (webSearch && rag) {
      systemPrompt +=
        " with access to web search and document search capabilities. " +
        "Use web search for current information and ragQuery for searching through uploaded documents. " +
        "Always cite your sources.";
    } else if (webSearch) {
      systemPrompt +=
        " with access to web search capabilities. " +
        "When users ask questions that would benefit from current information, use the available search tools. " +
        "Always cite your sources.";
    } else if (rag) {
      systemPrompt +=
        " with access to document search capabilities. " +
        "When users ask questions about their documents or uploaded content, use ragQuery to find relevant information. " +
        "Always cite the document sources and chunk information.";
    } else {
      systemPrompt += " that can answer questions and help with tasks.";
    }

    const result = streamText({
      model: model,
      messages: convertedMessages,
      system: systemPrompt,
      tools: hasTools ? availableTools : undefined,
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

    // Return UI message stream with reasoning summaries based on user preference
    return result.toUIMessageStreamResponse({
      sendReasoning: reasoning,
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
