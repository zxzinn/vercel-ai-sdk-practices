import type { Model } from "./types";

export const openaiModels: Model[] = [
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["minimal", "low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["minimal", "low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["minimal", "low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/gpt-5-codex",
    name: "GPT-5 Codex",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
  },
  {
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 Mini",
  },
  {
    id: "openai/gpt-4.1-nano",
    name: "GPT-4.1 Nano",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
  },
  {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
  },
  {
    id: "openai/gpt-3.5-turbo-instruct",
    name: "GPT-3.5 Turbo Instruct",
  },
  {
    id: "openai/o3",
    name: "o3",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/o3-mini",
    name: "o3 Mini",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/o4-mini",
    name: "o4 Mini",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/o1",
    name: "o1",
    reasoning: {
      type: "openai",
      reasoningEffort: {
        supported: ["low", "medium", "high"],
        default: "medium",
        budgetMapping: {
          low: "low",
          medium: "medium",
          high: "high",
        },
      },
      reasoningSummary: {
        supported: ["auto", "detailed"],
        default: "detailed",
      },
    },
  },
  {
    id: "openai/o1-mini",
    name: "o1 Mini",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
  },
];
