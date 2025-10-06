import type { Model, ReasoningCapability } from "./providers/types";

export function getProviderFromModelId(modelId: string): string {
  return modelId.split("/")[0];
}

export function getReasoningConfig(
  modelId: string,
  allModels: Model[],
  enabled: boolean,
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
  | undefined {
  if (!enabled) return undefined;

  const modelConfig = allModels.find((m) => m.id === modelId);
  if (!modelConfig?.reasoning) return undefined;

  const provider = getProviderFromModelId(modelId);

  switch (modelConfig.reasoning.type) {
    case "openai":
      if (provider === "openai") {
        return {
          openai: {
            reasoningEffort: modelConfig.reasoning.reasoningEffort.default,
            reasoningSummary: modelConfig.reasoning.reasoningSummary.default,
          },
        };
      }
      return undefined;

    case "google":
      if (provider === "google" || provider === "vertex") {
        return {
          google: {
            thinkingConfig: {
              thinkingBudget:
                modelConfig.reasoning.thinkingConfig.thinkingBudget.default,
              includeThoughts:
                modelConfig.reasoning.thinkingConfig.includeThoughts.default,
            },
          },
        };
      }
      return undefined;

    default:
      return undefined;
  }
}
