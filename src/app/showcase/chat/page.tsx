"use client";

import { useChat } from "@ai-sdk/react";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
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
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
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
import { ResponseWithCode } from "@/components/custom/response-with-code";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { anthropicModels, googleModels, openaiModels } from "@/lib/providers";

// Type for Tavily search tool parts
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

const models = [
  ...openaiModels.slice(0, 3),
  ...anthropicModels.slice(0, 2),
  ...googleModels.slice(0, 2),
];

export default function AIElementsChatShowcase() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].id);
  const [searchProviders, setSearchProviders] = useState<string[]>([]);

  const { messages, sendMessage, status, regenerate, error } = useChat();

  const toggleSearchProvider = (provider: string, checked: boolean) => {
    if (checked) {
      setSearchProviders([...searchProviders, provider]);
    } else {
      setSearchProviders(searchProviders.filter((p) => p !== provider));
    }
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Validate model selection
    if (!models.some((m) => m.id === model)) {
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
        },
      },
    );
    setInput("");
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
                      (() => {
                        const sourceParts = message.parts.filter(
                          (part) => part.type === "source-url",
                        );
                        return (
                          sourceParts.length > 0 && (
                            <Sources>
                              <SourcesTrigger count={sourceParts.length} />
                              {sourceParts.map((part, i) => (
                                <SourcesContent key={`${message.id}-${i}`}>
                                  <Source href={part.url} title={part.url} />
                                </SourcesContent>
                              ))}
                            </Sources>
                          )
                        );
                      })()}

                    {/* Message Parts */}
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Fragment key={`${message.id}-${i}`}>
                              <Message from={message.role}>
                                <MessageContent>
                                  <ResponseWithCode>
                                    {part.text}
                                  </ResponseWithCode>
                                </MessageContent>
                              </Message>
                              {message.role === "assistant" &&
                                i === message.parts.length - 1 && (
                                  <Actions className="mt-2">
                                    <Action
                                      onClick={() => regenerate()}
                                      tooltip="Retry"
                                    >
                                      <RefreshCcwIcon className="size-3" />
                                    </Action>
                                    <Action
                                      onClick={() =>
                                        navigator.clipboard
                                          .writeText(part.text)
                                          .catch(() => {
                                            // Silently handle copy failures
                                          })
                                      }
                                      tooltip="Copy"
                                    >
                                      <CopyIcon className="size-3" />
                                    </Action>
                                  </Actions>
                                )}
                            </Fragment>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className="w-full"
                              isStreaming={
                                status === "streaming" &&
                                i === message.parts.length - 1 &&
                                message.id === messages.at(-1)?.id
                              }
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
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
                              defaultOpen={toolPart.state === "output-error"}
                            >
                              <ToolHeader
                                title="Web Search"
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
                          return null;
                      }
                    })}
                  </div>
                ))}
                {status === "submitted" && <Loader />}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {error && (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive mb-4">
                <p>An error occurred: {error.message}</p>
              </div>
            )}

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
                <PromptInputTextarea
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  placeholder="Type your message..."
                />
              </PromptInputBody>
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
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
                        onCheckedChange={(checked) =>
                          toggleSearchProvider("tavily", checked)
                        }
                      >
                        Tavily Search
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("exa")}
                        onCheckedChange={(checked) =>
                          toggleSearchProvider("exa", checked)
                        }
                        disabled
                      >
                        Exa Search (Coming Soon)
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("bing")}
                        onCheckedChange={(checked) =>
                          toggleSearchProvider("bing", checked)
                        }
                        disabled
                      >
                        Bing Search (Coming Soon)
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={searchProviders.includes("perplexity")}
                        onCheckedChange={(checked) =>
                          toggleSearchProvider("perplexity", checked)
                        }
                        disabled
                      >
                        Perplexity (Coming Soon)
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <PromptInputModelSelect
                    onValueChange={(value) => {
                      setModel(value);
                    }}
                    value={model}
                  >
                    <PromptInputModelSelectTrigger>
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((model) => (
                        <PromptInputModelSelectItem
                          key={model.id}
                          value={model.id}
                        >
                          {model.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!input?.trim() || status !== "ready"}
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
