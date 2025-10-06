import type {
  Model,
  ReasoningBudgetLevel,
  ReasoningCapability,
} from "./providers/types";

export function getProviderFromModelId(modelId: string): string {
  return modelId.split("/")[0];
}

export function getReasoningConfig(
  modelId: string,
  allModels: Model[],
  enabled: boolean,
  budgetLevel: ReasoningBudgetLevel = "medium",
):
  | {
      openai: {
        reasoningEffort: "minimal" | "low" | "medium" | "high";
        reasoningSummary: "auto" | "detailed";
      };
    }
  | {
      google: {
        thinkingConfig: {
          thinkingBudget: number;
          includeThoughts: boolean;
        };
      };
    }
  | {
      anthropic: {
        thinking: {
          type: "enabled";
          budgetTokens: number;
        };
      };
    }
  | undefined {
  if (!enabled) return undefined;

  const modelConfig = allModels.find((m) => m.id === modelId);
  if (!modelConfig?.reasoning) return undefined;

  const provider = getProviderFromModelId(modelId);

  switch (modelConfig.reasoning.type) {
    case "openai":
      return {
        openai: {
          reasoningEffort:
            modelConfig.reasoning.reasoningEffort.budgetMapping[budgetLevel],
          reasoningSummary: modelConfig.reasoning.reasoningSummary.default,
        },
      };

    case "google":
      return {
        google: {
          thinkingConfig: {
            thinkingBudget:
              modelConfig.reasoning.thinkingConfig.thinkingBudget.budgetMapping[
                budgetLevel
              ],
            includeThoughts:
              modelConfig.reasoning.thinkingConfig.includeThoughts.default,
          },
        },
      };

    case "anthropic":
      return {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens:
              modelConfig.reasoning.thinking.budgetTokens.budgetMapping[
                budgetLevel
              ],
          },
        },
      };

    default:
      return undefined;
  }
}
