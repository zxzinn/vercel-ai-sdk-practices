import type { Model } from "./types";

export const anthropicModels: Model[] = [
  {
    id: "anthropic/claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    reasoning: {
      type: "anthropic",
      thinking: {
        budgetTokens: {
          min: 1024,
          recommended: 16384,
          budgetMapping: {
            low: 4096,
            medium: 16384,
            high: 32768,
          },
        },
      },
    },
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    reasoning: {
      type: "anthropic",
      thinking: {
        budgetTokens: {
          min: 1024,
          recommended: 16384,
          budgetMapping: {
            low: 4096,
            medium: 16384,
            high: 32768,
          },
        },
      },
    },
  },
  {
    id: "anthropic/claude-opus-4.1",
    name: "Claude Opus 4.1",
    reasoning: {
      type: "anthropic",
      thinking: {
        budgetTokens: {
          min: 1024,
          recommended: 16384,
          budgetMapping: {
            low: 4096,
            medium: 16384,
            high: 32768,
          },
        },
      },
    },
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    reasoning: {
      type: "anthropic",
      thinking: {
        budgetTokens: {
          min: 1024,
          recommended: 16384,
          budgetMapping: {
            low: 4096,
            medium: 16384,
            high: 32768,
          },
        },
      },
    },
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet",
    reasoning: {
      type: "anthropic",
      thinking: {
        budgetTokens: {
          min: 1024,
          recommended: 16384,
          budgetMapping: {
            low: 4096,
            medium: 16384,
            high: 32768,
          },
        },
      },
    },
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
  },
  {
    id: "anthropic/claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    reasoning: {
      type: "anthropic",
      thinking: {
        budgetTokens: {
          min: 1024,
          recommended: 16384,
          budgetMapping: {
            low: 4096,
            medium: 16384,
            high: 32768,
          },
        },
      },
    },
  },
  {
    id: "anthropic/claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
  },
];
