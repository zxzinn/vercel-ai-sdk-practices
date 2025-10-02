"use client";

import { useChat } from "@ai-sdk/react";
import {
  CopyIcon,
  DatabaseIcon,
  FileUpIcon,
  GlobeIcon,
  PaperclipIcon,
  RefreshCcwIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
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
import { loadAllProviders } from "@/lib/providers/loader";

// Type for search tool parts
type TavilySearchToolPart = {
  type: "tool-tavilySearch";
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { query: string };
  output?: unknown;
  errorText?: string;
};

type ExaSearchToolPart = {
  type: "tool-exaSearch";
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { query: string };
  output?: unknown;
  errorText?: string;
};

type RAGQueryToolPart = {
  type: "tool-ragQuery";
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { query: string; topK?: number; collectionName?: string };
  output?: unknown;
  errorText?: string;
};

type GenerateImageToolPart = {
  type: "tool-generateImage";
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { prompt: string };
  output?: { imageUrl: string; prompt: string };
  errorText?: string;
};

// Dynamically load all available providers
const providers = loadAllProviders();

export default function AIElementsChatShowcase() {
  const [model, setModel] = useState<string>("openai/gpt-5-nano");
  const [searchProviders, setSearchProviders] = useState<string[]>([]);
  const [ragEnabled, setRagEnabled] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);

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
    regenerate: originalRegenerate,
  } = useChat();

  // Handle file upload to vector database
  // Custom regenerate function that includes our body parameters
  const regenerate = () => {
    originalRegenerate({
      body: {
        model: model,
        webSearch: searchProviders.length > 0,
        searchProviders: searchProviders,
        rag: ragEnabled,
      },
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    // Guard against submits while not ready
    if (status !== "ready") return;

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    let processedFiles = message.files;

    // Convert blob URLs to base64 data URLs for AI model compatibility
    if (message.files && message.files.length > 0) {
      processedFiles = await Promise.all(
        message.files.map(async (file) => {
          // Check if the URL is a blob URL that needs conversion
          if (file.url?.startsWith("blob:")) {
            try {
              // Fetch the blob data
              const response = await fetch(file.url);
              const blob = await response.blob();

              // Convert blob to base64 data URL
              return new Promise<typeof file>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    ...file,
                    url: reader.result as string, // This will be a base64 data URL
                  });
                };
                reader.readAsDataURL(blob);
              });
            } catch (error) {
              console.error("Error converting blob URL to base64:", error);
              return file; // Return original file if conversion fails
            }
          }
          return file; // Return file as-is if it's already a data URL
        }),
      );
    }

    sendMessage(
      {
        text: message.text ?? "",
        files: processedFiles,
      },
      {
        body: {
          model: model,
          webSearch: searchProviders.length > 0,
          searchProviders: searchProviders,
          rag: ragEnabled,
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
                                                        /* biome-ignore lint/performance/noImgElement: Dynamic user uploads, not static images */
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

                              case "tool-tavilySearch": {
                                // Show search progress with Tool component
                                const toolPart =
                                  part as unknown as TavilySearchToolPart;
                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={
                                      toolPart.state === "output-error"
                                    }
                                  >
                                    <ToolHeader
                                      title="Web Search (Tavily)"
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

                              case "tool-exaSearch": {
                                // Show search progress with Tool component
                                const toolPart =
                                  part as unknown as ExaSearchToolPart;
                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={
                                      toolPart.state === "output-error"
                                    }
                                  >
                                    <ToolHeader
                                      title="Web Search (Exa)"
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

                              case "tool-ragQuery": {
                                // Show RAG query progress
                                const toolPart =
                                  part as unknown as RAGQueryToolPart;
                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={
                                      toolPart.state === "output-error"
                                    }
                                  >
                                    <ToolHeader
                                      title="Document Search (RAG)"
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

                              case "tool-generateImage": {
                                // Show image generation progress
                                const toolPart =
                                  part as unknown as GenerateImageToolPart;
                                return (
                                  <Tool
                                    key={`${message.id}-${i}`}
                                    defaultOpen={
                                      toolPart.state === "output-error" ||
                                      toolPart.state === "output-available"
                                    }
                                  >
                                    <ToolHeader
                                      title="Image Generation (DALL-E 3)"
                                      type={toolPart.type}
                                      state={toolPart.state}
                                    />
                                    <ToolContent>
                                      {toolPart.input ? (
                                        <ToolInput input={toolPart.input} />
                                      ) : null}
                                      {toolPart.output || toolPart.errorText ? (
                                        <div className="mt-2">
                                          {toolPart.output?.imageUrl ? (
                                            /* biome-ignore lint/performance/noImgElement: External Supabase URL, not static asset */
                                            <img
                                              src={toolPart.output.imageUrl}
                                              alt={
                                                toolPart.output.prompt ||
                                                "Generated image"
                                              }
                                              className="max-w-full rounded-lg border"
                                            />
                                          ) : (
                                            <ToolOutput
                                              output={toolPart.output}
                                              errorText={toolPart.errorText}
                                            />
                                          )}
                                        </div>
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
                    <Button variant="outline" size="sm" className="h-8" asChild>
                      <span>
                        <FileUpIcon size={16} />
                        <span>Upload Docs</span>
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

                          const result = await response.json();
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
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("tavily")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSearchProviders([...searchProviders, "tavily"]);
                          } else {
                            setSearchProviders(
                              searchProviders.filter((p) => p !== "tavily"),
                            );
                          }
                        }}
                      >
                        Tavily Search
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("exa")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSearchProviders([...searchProviders, "exa"]);
                          } else {
                            setSearchProviders(
                              searchProviders.filter((p) => p !== "exa"),
                            );
                          }
                        }}
                      >
                        Exa Search
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("bing")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSearchProviders([...searchProviders, "bing"]);
                          } else {
                            setSearchProviders(
                              searchProviders.filter((p) => p !== "bing"),
                            );
                          }
                        }}
                        disabled
                      >
                        Bing Search (Coming Soon)
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("perplexity")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSearchProviders([
                              ...searchProviders,
                              "perplexity",
                            ]);
                          } else {
                            setSearchProviders(
                              searchProviders.filter((p) => p !== "perplexity"),
                            );
                          }
                        }}
                        disabled
                      >
                        Perplexity (Coming Soon)
                      </DropdownMenuCheckboxItem>
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
