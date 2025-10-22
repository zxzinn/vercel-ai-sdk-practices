"use client";

import { useChat } from "@ai-sdk/react";
import {
  AlertCircleIcon,
  BrainIcon,
  CopyIcon,
  DatabaseIcon,
  GlobeIcon,
  PaperclipIcon,
  PlugIcon,
  RefreshCcwIcon,
  XIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { SpaceSelector } from "@/components/spaces/space-selector";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { loadAllProviders } from "@/lib/providers/loader";
import { getSessionId } from "@/lib/session";
import { TOOL_CONFIG } from "@/lib/tools/config";

// Dynamically load all available providers
const providers = loadAllProviders();

const searchProviderOptions = [
  { id: "tavily" as const, label: "Tavily Search" },
  { id: "exa" as const, label: "Exa Search" },
  { id: "perplexity" as const, label: "Perplexity Search" },
  { id: "bing" as const, label: "Bing Search (Coming Soon)", disabled: true },
];

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlConversationId = searchParams.get("id");

  const [model, setModel] = useState<string>("openai/gpt-5-nano");
  const [searchProviders, setSearchProviders] = useState<string[]>([]);
  const [ragEnabled, setRagEnabled] = useState<boolean>(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [reasoningEnabled, setReasoningEnabled] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mcpConnections, setMcpConnections] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [hasUpdatedUrl, setHasUpdatedUrl] = useState(false);
  // Use ref instead of state to avoid triggering useEffect when value changes
  const isNewConversationRef = useRef(false);

  useEffect(() => {
    setSessionId(getSessionId());
    // Use URL conversationId or generate new one
    if (urlConversationId) {
      setConversationId(urlConversationId);
      setHasUpdatedUrl(true); // URL already has conversationId
      // Don't set isNewConversationRef here - let loadConversation handle it
    } else {
      setConversationId(
        `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      );
      setHasUpdatedUrl(false); // New conversation, need to update URL later
      isNewConversationRef.current = true; // New conversation
    }
  }, [urlConversationId]);

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
    setMessages,
  } = useChat({
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  // Manage conversation messages: clear when no ID, load when ID provided
  useEffect(() => {
    async function loadConversation() {
      // Clear messages when starting a new conversation (no conversationId in URL)
      if (!urlConversationId) {
        setMessages([]);
        return;
      }

      // Skip loading history for new conversations (created by optimistic update)
      // to prevent clearing user's first message
      if (isNewConversationRef.current) {
        isNewConversationRef.current = false; // Reset flag after first check
        return;
      }

      // Clear messages first when switching to a different existing conversation
      setMessages([]);
      setLoadingHistory(true);

      try {
        const response = await fetch(
          `/api/chat/conversations/${urlConversationId}`,
        );
        if (response.ok) {
          const data = await response.json();
          const historyMessages = data.conversation.messages
            .map((msg: { role: string; content: unknown }) => {
              // Defensive: ensure content exists and is an object
              if (!msg.content || typeof msg.content !== "object") {
                console.warn("Invalid message content:", msg);
                return null;
              }

              // Content is stored as complete UIMessage object
              const message = msg.content as Record<string, unknown>;

              // Add id if missing
              if (!message.id) {
                message.id = nanoid();
              }

              // Ensure parts array exists
              if (!Array.isArray(message.parts)) {
                message.parts = [];
              }

              return message;
            })
            .filter(
              (
                msg: Record<string, unknown> | null,
              ): msg is Record<string, unknown> => msg !== null,
            );
          setMessages(historyMessages);
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadConversation();
  }, [urlConversationId, setMessages]);

  // Custom regenerate function that includes our body parameters
  const regenerate = () => {
    originalRegenerate({
      body: {
        model: model,
        webSearch: searchProviders.length > 0,
        searchProviders: searchProviders,
        rag: ragEnabled,
        spaceId: selectedSpaceId,
        reasoning: reasoningEnabled,
        mcpConnectionIds: mcpConnections.map((c) => c.id),
        sessionId,
        conversationId,
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
          spaceId: selectedSpaceId,
          reasoning: reasoningEnabled,
          mcpConnectionIds: mcpConnections.map((c) => c.id),
          sessionId,
          conversationId,
        },
      },
    );

    // Optimistic URL update: Update URL immediately after sending message
    if (!urlConversationId && !hasUpdatedUrl) {
      setHasUpdatedUrl(true);
      // Keep isNewConversation flag true so history loading is skipped
      router.push(`/chat?id=${conversationId}`, { scroll: false });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-start gap-4">
            <SidebarTrigger className="mt-2" />
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Elements Chat</h1>
              <p className="text-muted-foreground">
                Enhanced chat interface with file attachments, model selection,
                and web search
              </p>
            </div>
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
                                // Handle MCP dynamic tools
                                const toolName = part.toolName;

                                // Parse MCP tool names (format: serverName__toolName)
                                let displayTitle = toolName;
                                if (toolName.includes("__")) {
                                  const [serverName, ...rest] =
                                    toolName.split("__");
                                  displayTitle = `${serverName}: ${rest.join("__")}`;
                                }

                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={part.state === "output-error"}
                                  >
                                    <ToolHeader
                                      title={displayTitle}
                                      type={`tool-${toolName}` as const}
                                      state={part.state}
                                    />
                                    <ToolContent>
                                      {part.input ? (
                                        <ToolInput input={part.input} />
                                      ) : null}
                                      {part.output || part.errorText ? (
                                        <ToolOutput
                                          output={part.output}
                                          errorText={part.errorText}
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

                              default: {
                                // Handle static tools (tavily, exa, rag, generateImage...)
                                if (
                                  part.type.startsWith("tool-") &&
                                  "state" in part
                                ) {
                                  const toolName = part.type.replace(
                                    "tool-",
                                    "",
                                  );
                                  const config =
                                    toolName in TOOL_CONFIG
                                      ? TOOL_CONFIG[
                                          toolName as keyof typeof TOOL_CONFIG
                                        ]
                                      : undefined;

                                  // Special handling for generateImage tool
                                  if (
                                    toolName === "generateImage" &&
                                    part.state === "output-available"
                                  ) {
                                    return (
                                      <div
                                        key={`${message.id}-${i}`}
                                        className="my-4"
                                      >
                                        <Tool defaultOpen={true}>
                                          <ToolHeader
                                            title={config?.title || toolName}
                                            type={part.type}
                                            state={part.state}
                                          />
                                          <ToolContent>
                                            {part.input &&
                                            typeof part.input === "object" &&
                                            part.input !== null &&
                                            "prompt" in part.input ? (
                                              <div className="space-y-2 p-4">
                                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                  Prompt
                                                </h4>
                                                <p className="text-sm">
                                                  {
                                                    (
                                                      part.input as {
                                                        prompt: string;
                                                      }
                                                    ).prompt
                                                  }
                                                </p>
                                              </div>
                                            ) : null}
                                            {part.output &&
                                            typeof part.output === "object" &&
                                            "url" in part.output ? (
                                              <div className="p-4">
                                                {/* biome-ignore lint/a11y/useAltText: Generated image, prompt is shown separately */}
                                                {/* biome-ignore lint/performance/noImgElement: Dynamic AI-generated URLs cannot use Next.js Image without runtime configuration */}
                                                <img
                                                  src={
                                                    (
                                                      part.output as {
                                                        url: string;
                                                        size?: string;
                                                        quality?: string;
                                                      }
                                                    ).url
                                                  }
                                                  className="max-w-full rounded-lg border"
                                                  loading="lazy"
                                                />
                                                <p className="text-muted-foreground text-xs mt-2">
                                                  Size:{" "}
                                                  {
                                                    (
                                                      part.output as {
                                                        size?: string;
                                                      }
                                                    ).size
                                                  }{" "}
                                                  • Quality:{" "}
                                                  {
                                                    (
                                                      part.output as {
                                                        quality?: string;
                                                      }
                                                    ).quality
                                                  }
                                                </p>
                                              </div>
                                            ) : null}
                                            {"errorText" in part &&
                                            part.errorText ? (
                                              <ToolOutput
                                                output={undefined}
                                                errorText={
                                                  (
                                                    part as {
                                                      errorText: string;
                                                    }
                                                  ).errorText
                                                }
                                              />
                                            ) : null}
                                          </ToolContent>
                                        </Tool>
                                      </div>
                                    );
                                  }

                                  // Default tool rendering
                                  return (
                                    <Tool
                                      key={`${message.id}-${i}`}
                                      defaultOpen={
                                        part.state === "output-error"
                                      }
                                    >
                                      <ToolHeader
                                        title={config?.title || toolName}
                                        type={part.type}
                                        state={part.state}
                                      />
                                      <ToolContent>
                                        {part.input ? (
                                          <ToolInput input={part.input} />
                                        ) : null}
                                        {part.output || part.errorText ? (
                                          <ToolOutput
                                            output={part.output}
                                            errorText={part.errorText}
                                          />
                                        ) : null}
                                      </ToolContent>
                                    </Tool>
                                  );
                                }
                                return null;
                              }
                            }
                          })}
                        </Fragment>
                      );
                    })()}
                  </div>
                ))}
                {loadingHistory && (
                  <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                    Loading conversation history...
                  </div>
                )}
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
                  {/* Space Selector for RAG */}
                  <SpaceSelector
                    selectedSpaceId={selectedSpaceId}
                    onSpaceChange={setSelectedSpaceId}
                  />
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

export default function AIElementsChatShowcase() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
