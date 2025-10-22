import type { Model } from "./types";

export const googleModels: Model[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    reasoning: {
      type: "google",
      thinkingConfig: {
        thinkingBudget: {
          min: 0,
          max: 24576,
          default: -1,
          budgetMapping: {
            low: 4096,
            medium: 8192,
            high: 16384,
          },
        },
        includeThoughts: { supported: true, default: true },
      },
    },
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    reasoning: {
      type: "google",
      thinkingConfig: {
        thinkingBudget: {
          min: 128,
          max: 32768,
          default: -1,
          budgetMapping: {
            low: 4096,
            medium: 8192,
            high: 16384,
          },
        },
        includeThoughts: { supported: true, default: true },
      },
    },
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    reasoning: {
      type: "google",
      thinkingConfig: {
        thinkingBudget: {
          min: 0,
          max: 24576,
          default: 0,
          budgetMapping: {
            low: 4096,
            medium: 8192,
            high: 16384,
          },
        },
        includeThoughts: { supported: true, default: false },
      },
    },
  },
  {
    id: "google/gemini-2.5-flash-preview-09-2025",
    name: "Gemini 2.5 Flash Preview",
  },
  {
    id: "google/gemini-2.5-flash-lite-preview-09-2025",
    name: "Gemini 2.5 Flash Lite Preview",
  },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
  },
  {
    id: "google/gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
  },
  {
    id: "google/gemini-2.5-flash-image-preview",
    name: "Gemini 2.5 Flash Image Preview",
  },
  {
    id: "google/gemma-2-9b",
    name: "Gemma 2 9B",
  },
];
