import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { z } from "zod";
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

    const { messages, model, webSearch, searchProviders, reasoning } =
      validation.data;

    // Convert UI messages to model messages
    const convertedMessages = convertToModelMessages(messages);

    // Determine available search tools based on searchProviders
    const availableTools: Record<
      string,
      typeof tavilySearch | typeof exaSearch
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
