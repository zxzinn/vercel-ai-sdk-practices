const STORAGE_KEY = "selected_model_id";
const DEFAULT_MODEL_ID = "openai/gpt-5-nano";

export function getStoredModelId(): string {
  if (typeof window === "undefined") {
    return DEFAULT_MODEL_ID;
  }
  const storedModelId = localStorage.getItem(STORAGE_KEY);
  return storedModelId ?? DEFAULT_MODEL_ID;
}

export function setStoredModelId(modelId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, modelId);
}

export function clearStoredModelId(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
