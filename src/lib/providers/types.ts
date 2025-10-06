export type ReasoningBudgetLevel = "low" | "medium" | "high";

export interface OpenAIReasoning {
  type: "openai";
  reasoningEffort: {
    supported: ("minimal" | "low" | "medium" | "high")[];
    default: "minimal" | "low" | "medium" | "high";
    budgetMapping: {
      low: "low";
      medium: "medium";
      high: "high";
    };
  };
  reasoningSummary: {
    supported: ("auto" | "detailed")[];
    default: "auto" | "detailed";
  };
}

export interface GoogleReasoning {
  type: "google";
  thinkingConfig: {
    thinkingBudget: {
      min: number;
      max: number;
      default: number;
      budgetMapping: {
        low: number;
        medium: number;
        high: number;
      };
    };
    includeThoughts: { supported: boolean; default: boolean };
  };
}

export interface AnthropicReasoning {
  type: "anthropic";
  thinking: {
    budgetTokens: {
      min: number;
      recommended: number;
      budgetMapping: {
        low: number;
        medium: number;
        high: number;
      };
    };
  };
}

export type ReasoningCapability =
  | OpenAIReasoning
  | GoogleReasoning
  | AnthropicReasoning;

export interface Model {
  id: string;
  name: string;
  reasoning?: ReasoningCapability;
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
}
