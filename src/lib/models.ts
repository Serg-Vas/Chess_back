// models.ts
export interface Model {
  id: string;
  outputPrice: number;
  inputPrice: number;
}

export const models: Model[] = [
  {
    id: "claude-opus-4-1-20250805",
    outputPrice: 75,
    inputPrice: 15,
  },
  {
    id: "claude-opus-4-20250514",
    inputPrice: 75,
    outputPrice: 15,
  },
  {
    id: "claude-sonnet-4-20250514",
    inputPrice: 15,
    outputPrice: 3,
  },
  {
    id: "claude-3-7-sonnet-20250219",
    inputPrice: 15,
    outputPrice: 3,
  },
  {
    id: "claude-3-5-haiku-20241022",
    inputPrice: 1.25,
    outputPrice: 0.25,
  },
];
