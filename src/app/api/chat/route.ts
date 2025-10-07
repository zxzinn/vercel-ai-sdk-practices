import {
  type CoreTool,
  convertToModelMessages,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { createMCPClient, discoverMCPTools } from "@/lib/mcp/client";
import { getMCPConnection } from "@/lib/mcp/redis";
import { getAllModels } from "@/lib/providers/loader";
import { getReasoningConfig } from "@/lib/reasoning-support";
import { ragQuery } from "@/lib/tools/rag/query";
import { exaSearch } from "@/lib/tools/websearch/exa-search";
import { perplexitySearch } from "@/lib/tools/websearch/perplexity-search";
import { tavilySearch } from "@/lib/tools/websearch/tavily-search";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Map of search providers to their tool implementations
const SEARCH_PROVIDER_MAP = {
  tavily: tavilySearch,
  exa: exaSearch,
  perplexity: perplexitySearch,
} as const;

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
    .array(z.enum(["tavily", "exa", "perplexity"]))
    .optional()
    .default([])
    .transform((arr) => Array.from(new Set(arr))),
  rag: z.boolean().optional().default(false),
  reasoning: z.boolean().optional().default(false),
  reasoningBudget: z
    .enum(["low", "medium", "high"])
    .optional()
    .default("medium"),
  mcpConnectionIds: z.array(z.string()).optional().default([]),
  sessionId: z.string().optional(),
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

    const {
      messages,
      model,
      webSearch,
      searchProviders,
      rag,
      reasoning,
      reasoningBudget,
      mcpConnectionIds,
      sessionId,
    } = validation.data;

    // Convert UI messages to model messages
    const convertedMessages = convertToModelMessages(messages);

    // Determine available tools based on webSearch and rag flags
    const availableTools: Record<string, CoreTool> = {};

    if (webSearch) {
      const providers =
        searchProviders.length > 0 ? searchProviders : ["tavily"];

      providers.forEach((provider) => {
        const tool =
          SEARCH_PROVIDER_MAP[provider as keyof typeof SEARCH_PROVIDER_MAP];
        if (tool) {
          availableTools[`${provider}Search`] = tool;
        } else {
          console.warn(`Unknown search provider: ${provider}`);
        }
      });
    }

    if (rag) {
      availableTools.ragQuery = ragQuery;
    }

    // Add MCP tools if connections are provided
    if (mcpConnectionIds.length > 0 && sessionId) {
      try {
        const connections = await Promise.all(
          mcpConnectionIds.map((id) => getMCPConnection(sessionId, id)),
        );

        for (const connection of connections) {
          if (!connection) continue;

          try {
            const client = await createMCPClient({
              endpoint: connection.endpoint,
              accessToken: connection.accessToken,
              sessionId,
            });

            const mcpTools = await discoverMCPTools(client);

            // Prefix tools with connection name to avoid conflicts and show source
            // Use underscore instead of colon for OpenAI API compatibility
            Object.entries(mcpTools).forEach(([toolName, tool]) => {
              const safeName = connection.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
              const prefixedName = `${safeName}__${toolName}`;
              availableTools[prefixedName] = tool;
            });

            // Note: Client will be closed after tool execution by the AI SDK
          } catch (error) {
            console.error(
              `Failed to load tools from MCP server ${connection.name}:`,
              error,
            );
            // Continue with other connections even if one fails
          }
        }
      } catch (error) {
        console.error("Failed to load MCP tools:", error);
        // Continue without MCP tools
      }
    }

    const hasTools = Object.keys(availableTools).length > 0;

    // System prompt configuration for each capability
    const PROMPT_CONFIG = {
      base: "You are a helpful assistant",
      webSearch: {
        capabilities: "web search",
        usage: "Use web search for current information",
        citation: "Always cite your sources.",
      },
      rag: {
        capabilities: "document search",
        usage:
          "Use ragQuery for searching through uploaded documents when users ask about their documents or uploaded content",
        citation: "Always cite the document sources and chunk information.",
      },
      fallback: "that can answer questions and help with tasks.",
    } as const;

    // Build system prompt dynamically based on enabled tools
    const buildSystemPrompt = () => {
      if (!webSearch && !rag) {
        return `${PROMPT_CONFIG.base} ${PROMPT_CONFIG.fallback}`;
      }

      const capabilities: string[] = [];
      const usageInstructions: string[] = [];
      const citations: string[] = [];

      if (webSearch) {
        capabilities.push(PROMPT_CONFIG.webSearch.capabilities);
        usageInstructions.push(PROMPT_CONFIG.webSearch.usage);
        citations.push(PROMPT_CONFIG.webSearch.citation);
      }

      if (rag) {
        capabilities.push(PROMPT_CONFIG.rag.capabilities);
        usageInstructions.push(PROMPT_CONFIG.rag.usage);
        citations.push(PROMPT_CONFIG.rag.citation);
      }

      const capabilitiesText = capabilities.join(" and ");
      const usageText = usageInstructions.join(". ");
      const citationText = citations[0]; // Both share the same citation requirement

      return `${PROMPT_CONFIG.base} with access to ${capabilitiesText} capabilities. ${usageText}. ${citationText}`;
    };

    const systemPrompt = buildSystemPrompt();

    const allModels = getAllModels();
    const reasoningProviderOptions = getReasoningConfig(
      model,
      allModels,
      reasoning,
      reasoningBudget,
    );

    const result = streamText({
      model: model,
      messages: convertedMessages,
      system: systemPrompt,
      tools: hasTools ? availableTools : undefined,
      // Critical: Enables multi-step execution so LLM can respond to tool errors and continue the conversation
      stopWhen: stepCountIs(5),
      // Enable reasoning based on model capability and user preference
      ...(reasoningProviderOptions && {
        providerOptions: reasoningProviderOptions,
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
