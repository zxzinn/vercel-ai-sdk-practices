import { useChat } from "@ai-sdk/react";
import { fireEvent, render } from "@testing-library/react";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import AIElementsChatShowcase from "./page";

vi.mock("@ai-sdk/react");
vi.mock("@/lib/providers/loader", () => ({
  loadAllProviders: () => [
    {
      id: "openai",
      name: "OpenAI",
      models: [{ id: "openai/gpt-5-nano", name: "GPT-5 Nano" }],
    },
  ],
}));
vi.mock("@/lib/session", () => ({ getSessionId: () => "test-session" }));
vi.mock("@/components/mcp/mcp-connector", () => ({ MCPConnector: () => null }));
vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: any) => children,
  ConversationContent: ({ children }: any) => children,
  ConversationScrollButton: () => null,
}));
vi.mock("@/components/ai-elements/prompt-input", () => ({
  PromptInput: ({ children }: any) => children,
  PromptInputBody: ({ children }: any) => children,
  PromptInputAttachments: () => null,
  PromptInputTextarea: () => null,
  PromptInputToolbar: ({ children }: any) => children,
  PromptInputTools: ({ children }: any) => children,
  PromptInputActionMenu: ({ children }: any) => children,
  PromptInputActionMenuTrigger: () => null,
  PromptInputActionMenuContent: () => null,
  PromptInputActionAddAttachments: () => null,
  PromptInputSubmit: () => null,
}));
vi.mock("@/components/ai-elements/message", () => ({
  Message: () => null,
  MessageContent: () => null,
}));
vi.mock("@/components/ai-elements/response", () => ({ Response: () => null }));
vi.mock("@/components/ai-elements/actions", () => ({
  Action: () => null,
  Actions: () => null,
}));
vi.mock("@/components/ai-elements/loader", () => ({ Loader: () => null }));
vi.mock("@/components/ai-elements/reasoning", () => ({
  Reasoning: () => null,
  ReasoningContent: () => null,
  ReasoningTrigger: () => null,
}));
vi.mock("@/components/ai-elements/sources", () => ({
  Sources: () => null,
  Source: () => null,
  SourcesContent: () => null,
  SourcesTrigger: () => null,
}));
vi.mock("@/components/ai-elements/tool", () => ({
  Tool: () => null,
  ToolContent: () => null,
  ToolHeader: () => null,
  ToolInput: () => null,
  ToolOutput: () => null,
}));

describe("Chat Error Handling", () => {
  const mockClearError = vi.fn();

  const defaultUseChatReturn = {
    messages: [] as UIMessage[],
    sendMessage: vi.fn(),
    status: "ready" as const,
    error: undefined,
    clearError: mockClearError,
    regenerate: vi.fn(),
    stop: vi.fn(),
    resumeStream: vi.fn(),
    addToolResult: vi.fn(),
    setMessages: vi.fn(),
    id: "test-id",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useChat).mockReturnValue(defaultUseChatReturn);
  });

  it("should display error message when error exists", () => {
    vi.mocked(useChat).mockReturnValue({
      ...defaultUseChatReturn,
      error: new Error("Rate limit exceeded"),
    });

    const { container } = render(<AIElementsChatShowcase />);

    expect(container.textContent).toContain("Chat Error");
    expect(container.textContent).toContain("Rate limit exceeded");
  });

  it("should NOT display error when no error", () => {
    const { container } = render(<AIElementsChatShowcase />);

    expect(container.textContent).not.toContain("Chat Error");
  });

  it("should call clearError when close button is clicked", () => {
    vi.mocked(useChat).mockReturnValue({
      ...defaultUseChatReturn,
      error: new Error("Test error"),
    });

    const { container } = render(<AIElementsChatShowcase />);

    const closeButton = container.querySelector("button");
    expect(closeButton).toBeTruthy();

    fireEvent.click(closeButton!);
    expect(mockClearError).toHaveBeenCalledOnce();
  });

  it("should log errors via onError callback", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const testError = new Error("Test error");

    vi.mocked(useChat).mockImplementation((options) => {
      options?.onError?.(testError);
      return defaultUseChatReturn;
    });

    render(<AIElementsChatShowcase />);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Chat error:", testError);
    consoleErrorSpy.mockRestore();
  });
});
