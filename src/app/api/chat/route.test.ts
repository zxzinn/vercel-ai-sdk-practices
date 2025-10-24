import { describe, expect, it } from "vitest";

// Type definitions tested here match the route.ts message types
interface TextMessagePart {
  type: "text";
  text: string;
}

interface ToolMessagePart {
  type: `tool-${string}`;
  input: unknown;
  output: unknown;
  state: "output-available" | "output-error";
}

interface DynamicToolMessagePart {
  type: "dynamic-tool";
  toolName: string;
  input: unknown;
  output: unknown;
  state: "output-available" | "output-error";
}

type AssistantMessagePart =
  | TextMessagePart
  | ToolMessagePart
  | DynamicToolMessagePart;

interface AssistantMessage {
  role: "assistant";
  parts: AssistantMessagePart[];
}

describe("Chat Route Message Types", () => {
  describe("AssistantMessage", () => {
    it("should construct a valid assistant message with text", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [{ type: "text", text: "Hello" }],
      };

      expect(message.role).toBe("assistant");
      expect(message.parts).toHaveLength(1);
      expect(message.parts[0]).toEqual({ type: "text", text: "Hello" });
    });

    it("should construct a message with multiple text parts", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [
          { type: "text", text: "First" },
          { type: "text", text: "Second" },
        ],
      };

      expect(message.parts).toHaveLength(2);
      const textParts = message.parts.filter(
        (p): p is TextMessagePart => p.type === "text",
      );
      expect(textParts).toHaveLength(2);
      expect(textParts[0].text).toBe("First");
      expect(textParts[1].text).toBe("Second");
    });

    it("should construct a message with tool results", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [
          {
            type: "tool-tavilySearch",
            input: { query: "test" },
            output: { results: [] },
            state: "output-available",
          },
        ],
      };

      expect(message.parts).toHaveLength(1);
      expect(message.parts[0].type).toBe("tool-tavilySearch");
      expect(message.parts[0].state).toBe("output-available");
    });

    it("should construct a message with dynamic tool results (MCP)", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "custom_server__customTool",
            input: { query: "test" },
            output: { result: "success" },
            state: "output-available",
          },
        ],
      };

      expect(message.parts).toHaveLength(1);
      const dynamicPart = message.parts[0];
      expect(dynamicPart.type).toBe("dynamic-tool");
      if (dynamicPart.type === "dynamic-tool") {
        expect(dynamicPart.toolName).toContain("__");
      }
    });

    it("should construct a message with error state", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [
          {
            type: "tool-ragQuery",
            input: { query: "test", topK: 5 },
            output: { error: "Not found" },
            state: "output-error",
          },
        ],
      };

      expect(message.parts[0].state).toBe("output-error");
    });

    it("should construct a complex message with mixed parts", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [
          {
            type: "tool-tavilySearch",
            input: { query: "test" },
            output: { results: [] },
            state: "output-available",
          },
          {
            type: "text",
            text: "Here are the results",
          },
        ],
      };

      expect(message.parts).toHaveLength(2);
      expect(message.parts[0].type).toBe("tool-tavilySearch");
      expect(message.parts[1].type).toBe("text");
    });

    it("should start with empty parts array", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [],
      };

      expect(message.parts).toHaveLength(0);
      message.parts.push({ type: "text", text: "Added dynamically" });
      expect(message.parts).toHaveLength(1);
    });
  });

  describe("Message part filtering", () => {
    it("should correctly filter text parts with type guard", () => {
      const message: AssistantMessage = {
        role: "assistant",
        parts: [
          {
            type: "tool-tavilySearch",
            input: { query: "test" },
            output: { results: [] },
            state: "output-available",
          },
          { type: "text", text: "First text" },
          { type: "text", text: "Second text" },
        ],
      };

      const textParts = message.parts.filter(
        (p): p is TextMessagePart => p.type === "text",
      );

      expect(textParts).toHaveLength(2);
      expect(textParts.every((p) => p.type === "text")).toBe(true);
      expect(textParts.map((p) => p.text)).toEqual([
        "First text",
        "Second text",
      ]);
    });

    it("should handle extracting user message content with text parts", () => {
      const userMessage = {
        content: undefined,
        parts: [
          { type: "text", text: "Hello" },
          { type: "text", text: "World" },
        ],
      };

      const userContent = userMessage.parts
        ?.filter((p): p is TextMessagePart => p.type === "text")
        .map((p) => p.text)
        .join("\n");

      expect(userContent).toBe("Hello\nWorld");
    });

    it("should prefer content over parts", () => {
      const userMessage = {
        content: "Direct content",
        parts: [{ type: "text", text: "This should be ignored" }],
      };

      const userContent =
        userMessage.content ||
        userMessage.parts
          ?.filter((p): p is TextMessagePart => p.type === "text")
          .map((p) => p.text)
          .join("\n");

      expect(userContent).toBe("Direct content");
    });
  });

  describe("Tool message part types", () => {
    it("should accept all static tool types", () => {
      const toolTypes: ToolMessagePart["type"][] = [
        "tool-tavilySearch",
        "tool-exaSearch",
        "tool-perplexitySearch",
        "tool-ragQuery",
        "tool-generateImage",
      ];

      toolTypes.forEach((toolType) => {
        const part: ToolMessagePart = {
          type: toolType,
          input: {},
          output: {},
          state: "output-available",
        };
        expect(part.type).toBe(toolType);
      });
    });

    it("should distinguish between static and dynamic tools", () => {
      const staticTool: ToolMessagePart = {
        type: "tool-tavilySearch",
        input: {},
        output: {},
        state: "output-available",
      };

      const dynamicTool: DynamicToolMessagePart = {
        type: "dynamic-tool",
        toolName: "custom__tool",
        input: {},
        output: {},
        state: "output-available",
      };

      expect(staticTool.type.startsWith("tool-")).toBe(true);
      expect(dynamicTool.type).toBe("dynamic-tool");
    });
  });
});
