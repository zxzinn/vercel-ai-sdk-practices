export interface OpenAIReasoning {
  type: "openai";
  reasoningEffort: {
    supported: ("minimal" | "low" | "medium" | "high")[];
    default: "minimal" | "low" | "medium" | "high";
  };
  reasoningSummary: {
    supported: ("auto" | "detailed")[];
    default: "auto" | "detailed";
  };
}

export interface GoogleReasoning {
  type: "google";
  thinkingConfig: {
    thinkingBudget: { min: number; max: number; default: number };
    includeThoughts: { supported: boolean; default: boolean };
  };
}

export type ReasoningCapability = OpenAIReasoning | GoogleReasoning;

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
