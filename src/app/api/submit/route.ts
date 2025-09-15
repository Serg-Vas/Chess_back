import { askClaude } from "../../api";

export async function POST(request: Request) {
  try {
    const { email, prompt, modelId, maxTokens } = await request.json();
    if (!email) return new Response("Missing email", { status: 400 });
    if (!prompt) return new Response("Missing prompt", { status: 400 });
    if (!modelId) return new Response("Missing modelId", { status: 400 });
    if (!maxTokens) return new Response("Missing maxTokens", { status: 400 });

    console.log("Received request:", { email, prompt, modelId, maxTokens });

    const stream = await askClaude(email, prompt, modelId, maxTokens);
    console.log("Stream created");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("Error in /submit:", err);
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
