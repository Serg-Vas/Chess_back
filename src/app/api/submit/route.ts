import { askClaude } from "../../api";
import { marked } from "marked";

export async function POST(request: Request) {
  const res = await request.json()
  const prompt = res.prompt
  const response = await askClaude(prompt);
  const htmlResponse = await marked(response);

  console.log("Received prompt:", prompt)
  // You can process the prompt here, e.g., call askClaude(prompt) if needed
  return new Response(htmlResponse, { status: 200 })
}