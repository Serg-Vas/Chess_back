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
    outputPrice: 75,
    inputPrice: 15,
  },
  {
    id: "claude-sonnet-4-20250514",
    outputPrice: 15,
    inputPrice: 3,
  },
  {
    id: "claude-3-7-sonnet-20250219",
    outputPrice: 15,
    inputPrice: 3,
  },
  {
    id: "claude-3-5-haiku-20241022",
    outputPrice: 1.25,
    inputPrice: 0.25,
  },
];
