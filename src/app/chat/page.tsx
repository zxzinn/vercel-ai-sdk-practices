"use client";

import { useChat } from "@ai-sdk/react";
import {
  AlertCircleIcon,
  BrainIcon,
  CopyIcon,
  DatabaseIcon,
  FileUpIcon,
  GlobeIcon,
  PaperclipIcon,
  PlugIcon,
  RefreshCcwIcon,
  XIcon,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { MCPConnector } from "@/components/mcp/mcp-connector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { loadAllProviders } from "@/lib/providers/loader";
import { getSessionId } from "@/lib/session";

// Generic tool part type
type ToolPart<TName extends string, TInput = unknown> = {
  type: `tool-${TName}`;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: TInput;
  output?: unknown;
  errorText?: string;
};

// Tool part types
type TavilySearchToolPart = ToolPart<"tavilySearch", { query: string }>;
type ExaSearchToolPart = ToolPart<"exaSearch", { query: string }>;
type PerplexitySearchToolPart = ToolPart<"perplexitySearch", { query: string }>;
type RAGQueryToolPart = ToolPart<
  "ragQuery",
  { query: string; topK?: number; collectionName?: string }
>;

// Dynamically load all available providers
const providers = loadAllProviders();

// Tool rendering configuration
const TOOL_CONFIG = {
  "tool-tavilySearch": { title: "Web Search (Tavily)" },
  "tool-exaSearch": { title: "Web Search (Exa)" },
  "tool-perplexitySearch": { title: "Web Search (Perplexity)" },
  "tool-ragQuery": { title: "Document Search (RAG)" },
} as const;
// Helper function for file upload to RAG
async function uploadFilesToRAG(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch("/api/rag/ingest", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}
const searchProviderOptions = [
  { id: "tavily" as const, label: "Tavily Search" },
  { id: "exa" as const, label: "Exa Search" },
  { id: "perplexity" as const, label: "Perplexity Search" },
  { id: "bing" as const, label: "Bing Search (Coming Soon)", disabled: true },
];

export default function AIElementsChatShowcase() {
  const [model, setModel] = useState<string>("openai/gpt-5-nano");
  const [searchProviders, setSearchProviders] = useState<string[]>([]);
  const [ragEnabled, setRagEnabled] = useState<boolean>(false);
  const [reasoningEnabled, setReasoningEnabled] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [mcpConnections, setMcpConnections] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const handleMcpConnectionsChange = useCallback(
    (connections: Array<{ id: string; name: string; status: string }>) => {
      setMcpConnections(connections.map((c) => ({ id: c.id, name: c.name })));
    },
    [],
  );

  // Get current model's provider and name for display
  const currentModel = providers
    .flatMap((p) => p.models.map((m) => ({ ...m, providerName: p.name })))
    .find((m) => m.id === model) || {
    ...providers[0].models[0],
    providerName: providers[0].name,
  };

  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    regenerate: originalRegenerate,
  } = useChat({
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  // Custom regenerate function that includes our body parameters
  const regenerate = () => {
    originalRegenerate({
      body: {
        model: model,
        webSearch: searchProviders.length > 0,
        searchProviders: searchProviders,
        rag: ragEnabled,
        reasoning: reasoningEnabled,
        mcpConnectionIds: mcpConnections.map((c) => c.id),
        sessionId,
      },
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    // Clear any existing error before submitting
    if (error) {
      clearError();
    }

    // Guard against submits while not ready
    if (status !== "ready") return;

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text ?? "",
        files: message.files,
      },
      {
        body: {
          model: model,
          webSearch: searchProviders.length > 0,
          searchProviders: searchProviders,
          rag: ragEnabled,
          reasoning: reasoningEnabled,
          mcpConnectionIds: mcpConnections.map((c) => c.id),
          sessionId,
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">AI Elements Chat</h1>
            <p className="text-muted-foreground">
              Enhanced chat interface with file attachments, model selection,
              and web search
            </p>
          </div>

          <div className="flex flex-col h-[calc(100vh-200px)]">
            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Chat Error
                  </p>
                  <p className="text-sm text-destructive/80 break-words">
                    {error.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 shrink-0"
                  onClick={clearError}
                  aria-label="Dismiss error"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            )}

            <Conversation className="h-full">
              <ConversationContent>
                {messages.map((message) => (
                  <div key={message.id}>
                    {/* Sources - render as soon as any source is available */}
                    {message.role === "assistant" &&
                      message.parts.some(
                        (part) => part.type === "source-url",
                      ) && (
                        <Sources>
                          <SourcesTrigger
                            count={
                              message.parts.filter(
                                (part) => part.type === "source-url",
                              ).length
                            }
                          />
                          {message.parts
                            .filter((part) => part.type === "source-url")
                            .map((part, i) => (
                              <SourcesContent key={`${message.id}-${i}`}>
                                <Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.url}
                                />
                              </SourcesContent>
                            ))}
                        </Sources>
                      )}

                    {/* Message Parts - Maintain original order */}
                    {(() => {
                      const textParts = message.parts.filter(
                        (part) => part.type === "text",
                      );
                      const fileParts = message.parts.filter(
                        (part) => part.type === "file",
                      );
                      let hasRenderedUserContent = false;

                      return (
                        <Fragment>
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case "text":
                              case "file":
                                // Group text and files together, but only render once
                                if (
                                  !hasRenderedUserContent &&
                                  (textParts.length > 0 || fileParts.length > 0)
                                ) {
                                  hasRenderedUserContent = true;
                                  return (
                                    <Fragment key={`content-${message.id}`}>
                                      <Message from={message.role}>
                                        <MessageContent>
                                          <div className="flex flex-col gap-3">
                                            {/* Render file attachments first */}
                                            {fileParts.length > 0 && (
                                              <div className="flex flex-wrap gap-2">
                                                {fileParts.map(
                                                  (filePart, fileIndex) => (
                                                    <div
                                                      key={`file-${message.id}-${fileIndex}`}
                                                    >
                                                      {filePart.mediaType?.startsWith(
                                                        "image/",
                                                      ) ? (
                                                        // biome-ignore lint/performance/noImgElement: Data URLs from user uploads cannot use Next.js Image
                                                        <img
                                                          src={filePart.url}
                                                          alt={
                                                            filePart.filename ||
                                                            "attachment"
                                                          }
                                                          className="max-w-48 max-h-48 rounded-lg border object-cover"
                                                        />
                                                      ) : (
                                                        <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted">
                                                          <PaperclipIcon className="size-4 text-muted-foreground" />
                                                          <span className="text-sm font-medium">
                                                            {filePart.filename ||
                                                              "attachment"}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}

                                            {/* Render text content */}
                                            {textParts.map(
                                              (textPart, textIndex) => (
                                                <Response
                                                  key={`text-${message.id}-${textIndex}`}
                                                >
                                                  {textPart.text}
                                                </Response>
                                              ),
                                            )}
                                          </div>
                                        </MessageContent>
                                      </Message>

                                      {/* Actions for assistant messages */}
                                      {message.role === "assistant" &&
                                        textParts.length > 0 && (
                                          <Actions className="mt-2">
                                            <Action
                                              onClick={() => regenerate()}
                                              tooltip="Retry"
                                            >
                                              <RefreshCcwIcon className="size-3" />
                                            </Action>
                                            <Action
                                              onClick={() =>
                                                navigator.clipboard.writeText(
                                                  textParts
                                                    .map((part) => part.text)
                                                    .join("\n"),
                                                )
                                              }
                                              tooltip="Copy"
                                            >
                                              <CopyIcon className="size-3" />
                                            </Action>
                                          </Actions>
                                        )}
                                    </Fragment>
                                  );
                                }
                                return null;

                              case "reasoning":
                                return (
                                  <Reasoning
                                    key={`${message.id}-${i}`}
                                    className="w-full"
                                    isStreaming={
                                      status === "streaming" &&
                                      message.id === messages.at(-1)?.id &&
                                      part === message.parts.at(-1)
                                    }
                                  >
                                    <ReasoningTrigger />
                                    <ReasoningContent>
                                      {part.text}
                                    </ReasoningContent>
                                  </Reasoning>
                                );

                              case "source-url":
                                // Sources are rendered above, skip them here
                                return null;

                              case "dynamic-tool": {
                                // Handle dynamic tools (including MCP tools)
                                // Dynamic tools have type: 'dynamic-tool' with toolName property
                                const dynamicToolPart = part as {
                                  type: string;
                                  toolName?: string;
                                  state?:
                                    | "input-streaming"
                                    | "input-available"
                                    | "output-available"
                                    | "output-error";
                                  result?: unknown;
                                  input?: unknown;
                                  output?: unknown;
                                  errorText?: string;
                                };
                                const toolName = dynamicToolPart.toolName || "";

                                // Parse tool name for MCP tools
                                // Dynamic tools from MCP servers use format: serverName__toolName
                                // (e.g., 'localhost__add' becomes 'localhost: add')
                                // This naming convention is specific to dynamic tools created via
                                // experimental_createMCPClient in src/app/api/chat/route.ts
                                // Static tools (tavily, exa, etc.) don't use this format
                                let displayTitle = toolName;
                                if (toolName.includes("__")) {
                                  const parts = toolName.split("__");
                                  const serverName = parts[0];
                                  const actualToolName = parts
                                    .slice(1)
                                    .join("__");
                                  displayTitle = `${serverName}: ${actualToolName}`;
                                }

                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={
                                      dynamicToolPart.state === "output-error"
                                    }
                                  >
                                    <ToolHeader
                                      title={displayTitle}
                                      type={`tool-${toolName}`}
                                      state={
                                        dynamicToolPart.state ||
                                        "output-available"
                                      }
                                    />
                                    <ToolContent>
                                      {dynamicToolPart.input ? (
                                        <ToolInput
                                          input={dynamicToolPart.input}
                                        />
                                      ) : null}
                                      {dynamicToolPart.output ||
                                      dynamicToolPart.errorText ? (
                                        <ToolOutput
                                          output={dynamicToolPart.output}
                                          errorText={dynamicToolPart.errorText}
                                        />
                                      ) : null}
                                    </ToolContent>
                                  </Tool>
                                );
                              }

                              case "tool-tavilySearch":
                              case "tool-exaSearch":
                              case "tool-perplexitySearch":
                              case "tool-ragQuery": {
                                const config =
                                  TOOL_CONFIG[
                                    part.type as keyof typeof TOOL_CONFIG
                                  ];
                                if (!config) return null;

                                const toolPart = part as unknown as
                                  | TavilySearchToolPart
                                  | ExaSearchToolPart
                                  | PerplexitySearchToolPart
                                  | RAGQueryToolPart;

                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={
                                      toolPart.state === "output-error"
                                    }
                                  >
                                    <ToolHeader
                                      title={config.title}
                                      type={toolPart.type}
                                      state={toolPart.state}
                                    />
                                    <ToolContent>
                                      {toolPart.input ? (
                                        <ToolInput input={toolPart.input} />
                                      ) : null}
                                      {toolPart.output || toolPart.errorText ? (
                                        <ToolOutput
                                          output={toolPart.output}
                                          errorText={toolPart.errorText}
                                        />
                                      ) : null}
                                    </ToolContent>
                                  </Tool>
                                );
                              }

                              case "step-start":
                                // Step boundary - render a separator
                                return i > 0 ? (
                                  <div
                                    key={`${message.id}-${i}`}
                                    className="text-gray-500"
                                  >
                                    <hr className="my-2 border-gray-300" />
                                  </div>
                                ) : null;

                              default:
                                // Unknown part type - ignore
                                return null;
                            }
                          })}
                        </Fragment>
                      );
                    })()}
                  </div>
                ))}
                {status === "submitted" && <Loader />}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <PromptInput
              onSubmit={handleSubmit}
              className="mt-4"
              globalDrop
              multiple
            >
              <PromptInputBody>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea placeholder="Type your message..." />
              </PromptInputBody>
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  {/* RAG File Upload */}
                  <label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        <FileUpIcon size={16} />
                        <span>
                          {uploading ? "Uploading..." : "Upload Docs"}
                        </span>
                      </span>
                    </Button>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".txt,.md,.json,.csv"
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0)
                          return;

                        const files = Array.from(e.target.files);
                        setUploading(true);

                        try {
                          const result = await uploadFilesToRAG(files);
                          alert(
                            `✅ Success! Indexed ${result.totalChunks} chunks from ${files.length} file(s)`,
                          );
                        } catch (error) {
                          alert(
                            `❌ Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                          );
                        } finally {
                          setUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  <Button
                    variant={ragEnabled ? "default" : "ghost"}
                    size="sm"
                    className="h-8"
                    onClick={() => setRagEnabled(!ragEnabled)}
                  >
                    <DatabaseIcon size={16} />
                    <span>RAG {ragEnabled ? "ON" : "OFF"}</span>
                  </Button>
                  <Button
                    variant={reasoningEnabled ? "default" : "ghost"}
                    size="sm"
                    className="h-8"
                    onClick={() => setReasoningEnabled(!reasoningEnabled)}
                  >
                    <BrainIcon size={16} />
                    <span>Reasoning {reasoningEnabled ? "ON" : "OFF"}</span>
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={
                          mcpConnections.length > 0 ? "default" : "ghost"
                        }
                        size="sm"
                        className="h-8"
                      >
                        <PlugIcon size={16} />
                        <span>
                          {mcpConnections.length === 0
                            ? "MCP"
                            : `MCP (${mcpConnections.length})`}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96">
                      <MCPConnector
                        sessionId={sessionId}
                        onConnectionsChange={handleMcpConnectionsChange}
                      />
                    </PopoverContent>
                  </Popover>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={
                          searchProviders.length > 0 ? "default" : "ghost"
                        }
                        size="sm"
                        className="h-8"
                      >
                        <GlobeIcon size={16} />
                        <span>
                          {searchProviders.length === 0
                            ? "Search"
                            : `Search (${searchProviders.length})`}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {searchProviderOptions.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.id}
                          checked={searchProviders.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSearchProviders([
                                ...searchProviders,
                                option.id,
                              ]);
                            } else {
                              setSearchProviders(
                                searchProviders.filter((p) => p !== option.id),
                              );
                            }
                          }}
                          disabled={option.disabled}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Nested Model Selection with Provider Hover Submenus */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 justify-between"
                      >
                        <span className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {currentModel.providerName}
                          </span>
                          <span>{currentModel.name}</span>
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {providers.map((provider, index) => (
                        <div key={provider.id}>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <span className="flex items-center gap-2">
                                <span className="font-medium">
                                  {provider.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({provider.models.length} models)
                                </span>
                              </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-56 max-h-80 overflow-y-auto">
                              {provider.models.map((modelOption) => (
                                <DropdownMenuItem
                                  key={modelOption.id}
                                  onClick={() => setModel(modelOption.id)}
                                  className="flex items-center justify-between"
                                >
                                  <span>{modelOption.name}</span>
                                  {model === modelOption.id && (
                                    <span className="text-xs text-primary">
                                      ✓
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {index < providers.length - 1 && (
                            <DropdownMenuSeparator />
                          )}
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={status !== "ready"}
                  status={status}
                />
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}
