import type { TextUIPart, Tool, UIMessage } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import {
  cleanupMCPClient,
  createMCPClient,
  discoverMCPTools,
  type MCPClientWithTransport,
} from "@/lib/mcp/client";
import { getMCPConnection } from "@/lib/mcp/redis";
import { prisma } from "@/lib/prisma";
import { getAllModels } from "@/lib/providers/loader";
import { getReasoningConfig } from "@/lib/reasoning-support";
import { createRagQueryTool } from "@/lib/tools/rag/query";
import { generateImageTool, staticTools } from "@/lib/types/chat-tools";
import { validateRequestRaw } from "@/lib/validation/api-validation";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Map of search providers to their tool implementations
const SEARCH_PROVIDER_MAP = {
  tavily: staticTools.tavilySearch,
  exa: staticTools.exaSearch,
  perplexity: staticTools.perplexitySearch,
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

const RequestBodySchema = z
  .object({
    messages: z.array(MessageSchema).min(1, "At least one message is required"),
    model: z.string().min(1, "Model is required"),
    webSearch: z.boolean().optional().default(false),
    searchProviders: z
      .array(z.enum(["tavily", "exa", "perplexity"]))
      .optional()
      .default([])
      .transform((arr) => Array.from(new Set(arr))),
    rag: z.boolean().optional().default(false),
    spaceId: z.string().optional(),
    reasoning: z.boolean().optional().default(false),
    reasoningBudget: z
      .enum(["low", "medium", "high"])
      .optional()
      .default("medium"),
    mcpConnectionIds: z.array(z.string()).optional().default([]),
    sessionId: z.string().optional(),
    conversationId: z.string().optional(),
  })
  .refine((data) => data.mcpConnectionIds.length === 0 || data.sessionId, {
    message: "sessionId is required when mcpConnectionIds is provided",
    path: ["sessionId"],
  });

export async function POST(req: Request) {
  // Track MCP clients for cleanup - must be outside try block
  const mcpClients: Array<MCPClientWithTransport> = [];

  const cleanupClients = async () => {
    if (mcpClients.length > 0) {
      await Promise.allSettled(
        mcpClients.map((clientWithTransport) =>
          cleanupMCPClient(clientWithTransport).catch((error) => {
            console.error("Failed to cleanup MCP client:", error);
          }),
        ),
      );
    }
  };

  // KNOWN LIMITATION: Stream interruption cleanup
  // If the client disconnects (closes browser tab, navigates away, network timeout)
  // before the stream completes, the cleanup may not be triggered because:
  // 1. onFinish callback only fires when stream completes successfully
  // 2. ReadableStream.cancel() is not reliably called on client disconnect
  //    (behavior varies by runtime: Node.js, Bun, Cloudflare Workers, etc.)
  // 3. No error is thrown, so catch block won't execute
  //
  // This is a known limitation of the streaming response architecture.
  // Potential mitigations (not implemented due to trade-offs):
  // - Timeout-based cleanup: Risk of cleaning up active streams
  // - AbortSignal: Not consistently available in Next.js Request
  // - Connection tracking: Adds significant complexity
  //
  // In practice, MCP servers should implement their own session timeouts
  // and the Streamable HTTP protocol's terminateSession() helps minimize
  // resource leakage compared to the older SSE approach.

  try {
    const body = await req.json();
    const validationResult = validateRequestRaw(RequestBodySchema, body);

    // Early return without cleanup is safe here:
    // If validation fails, no MCP clients have been created yet,
    // so mcpClients array is empty and cleanup is unnecessary
    if (validationResult instanceof Response) {
      return validationResult;
    }

    const {
      messages,
      model,
      webSearch,
      searchProviders,
      rag,
      spaceId,
      reasoning,
      reasoningBudget,
      mcpConnectionIds,
      sessionId,
      conversationId,
    } = validationResult;

    // Validate RAG configuration early
    if (rag && !spaceId) {
      return new Response(
        JSON.stringify({
          error: "RAG is enabled but no space is selected",
          message:
            "Please select a space before enabling RAG. Documents are organized in spaces.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Convert UI messages to model messages
    const convertedMessages = convertToModelMessages(messages);

    // Determine available tools based on webSearch and rag flags
    const availableTools: Record<string, Tool> = {};

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

    if (rag && spaceId) {
      availableTools.ragQuery = createRagQueryTool(spaceId);
    }

    // Always add image generation tool
    availableTools.generateImage = generateImageTool;

    // Add MCP tools if connections are provided
    if (mcpConnectionIds.length > 0 && sessionId) {
      try {
        const connections = await Promise.all(
          mcpConnectionIds.map((id) => getMCPConnection(sessionId, id)),
        );

        for (const connection of connections) {
          if (!connection) continue;

          try {
            const clientWithTransport = await createMCPClient({
              endpoint: connection.endpoint,
              accessToken: connection.accessToken,
              sessionId: sessionId,
            });

            // Track client for cleanup
            mcpClients.push(clientWithTransport);

            const mcpTools = await discoverMCPTools(clientWithTransport);

            // Prefix tools with server name for identification
            // Format: serverName__toolName
            Object.entries(mcpTools).forEach(([toolName, tool]) => {
              const safeName = connection.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
              const prefixedName = `${safeName}__${toolName}`;
              availableTools[prefixedName] = tool;
            });
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
      // Cleanup MCP clients and save messages when stream finishes successfully
      onFinish: async (event) => {
        await cleanupClients();

        // Save conversation and messages to database
        if (conversationId) {
          try {
            const userMessage = messages[messages.length - 1];

            // Build assistant message with all parts (text, tool calls, tool results)
            // Using SDK's UIMessage type directly
            const assistantMessage: UIMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              parts: [],
            };

            // When using stopWhen with multi-step execution, tool calls and results
            // are in earlier steps, not the final step. We need to collect from ALL steps.
            const allToolCalls: typeof event.toolCalls = [];
            const allToolResults: typeof event.toolResults = [];

            if (event.steps) {
              for (const step of event.steps) {
                if (step.toolCalls) {
                  allToolCalls.push(...step.toolCalls);
                }
                if (step.toolResults) {
                  allToolResults.push(...step.toolResults);
                }
              }
            }

            // Combine tool calls and results into the format expected by frontend
            // Frontend expects: { type: "tool-{toolName}", state, input, output }
            if (allToolCalls.length > 0) {
              // Create a map of toolCallId -> toolResult for quick lookup
              const resultsByCallId = new Map(
                allToolResults.map((r) => [r.toolCallId, r]),
              );

              for (const toolCall of allToolCalls) {
                const result = resultsByCallId.get(toolCall.toolCallId);

                // Determine state based on result
                let state: "output-available" | "output-error";
                if (!result) {
                  // This should not happen in onFinish since all execution is complete
                  console.error(
                    `Missing result for tool call ${toolCall.toolCallId} (${toolCall.toolName})`,
                  );
                  state = "output-error";
                } else if (
                  result.output.type === "error-text" ||
                  result.output.type === "error-json"
                ) {
                  state = "output-error";
                } else {
                  state = "output-available";
                }

                // Determine if this is a dynamic tool (MCP) or static tool
                const isDynamicTool = toolCall.toolName.includes("__");

                if (isDynamicTool) {
                  // MCP tools use "dynamic-tool" type
                  assistantMessage.parts.push({
                    type: "dynamic-tool",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: toolCall.input,
                    output: result?.output,
                    state,
                    // biome-ignore lint/suspicious/noExplicitAny: SDK type mismatch
                  } as any);
                } else {
                  // Static tools use "tool-{toolName}" type
                  assistantMessage.parts.push({
                    type: `tool-${toolCall.toolName}`,
                    toolCallId: toolCall.toolCallId,
                    input: toolCall.input,
                    output: result?.output,
                    state,
                    // biome-ignore lint/suspicious/noExplicitAny: SDK type mismatch
                  } as any);
                }
              }
            }

            // Add final text response (from the last step)
            if (event.text) {
              assistantMessage.parts.push({
                type: "text",
                text: event.text,
              });
            }

            // Extract text content from user message for title
            const userContent =
              userMessage.content ||
              userMessage.parts
                ?.filter((p): p is TextUIPart => p.type === "text")
                .map((p) => p.text)
                .join("\n") ||
              "";

            // Atomically save conversation and messages in a transaction
            const title = userContent.slice(0, 100) || "New Conversation";
            await prisma.$transaction([
              prisma.conversation.upsert({
                where: { id: conversationId },
                create: {
                  id: conversationId,
                  title,
                },
                update: {
                  updatedAt: new Date(),
                },
              }),
              prisma.conversationMessage.create({
                data: {
                  conversationId,
                  role: "user",
                  // UIMessage is designed to be JSON-serializable by the AI SDK
                  // Direct storage follows official examples from Vercel AI SDK
                  content: userMessage as unknown as Prisma.InputJsonValue,
                },
              }),
              prisma.conversationMessage.create({
                data: {
                  conversationId,
                  role: "assistant",
                  content: assistantMessage as unknown as Prisma.InputJsonValue,
                },
              }),
            ]);
          } catch (error) {
            console.error("Failed to save conversation:", error);
            // Don't throw - we don't want to fail the response if DB save fails
          }
        }
      },
    });

    // Return UI message stream with reasoning summaries based on user preference
    return result.toUIMessageStreamResponse({
      sendReasoning: reasoning,
      sendSources: true,
    });
  } catch (error) {
    console.error("Error in chat API:", error);

    // Cleanup MCP clients on error
    await cleanupClients();

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
