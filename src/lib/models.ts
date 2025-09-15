// models.ts
export interface Model {
  id: string;
  price: number; // USD per 1M tokens (official Anthropic pricing)
}

export const models: Model[] = [
  {
    id: "claude-opus-4-1-20250805",
    price: 75, // $75 / MTok
  },
  {
    id: "claude-opus-4-20250514",
    price: 75,
  },
  {
    id: "claude-sonnet-4-20250514",
    price: 15, // $15 / MTok
  },
  {
    id: "claude-3-7-sonnet-20250219",
    price: 15,
  },
  {
    id: "claude-3-5-haiku-20241022",
    price: 4, // $4 / MTok
  },
  {
    id: "claude-haiku-3-20250514",
    price: 1.25, // $1.25 / MTok
  },
];
