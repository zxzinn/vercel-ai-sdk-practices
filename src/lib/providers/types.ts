export interface Model {
  id: string;
  name: string;
  supportsReasoning?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
}
