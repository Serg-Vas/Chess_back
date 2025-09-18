import { askClaude } from "../../api";

const sessionsUsage: Record<string, any> = {};

export async function POST(request: Request) {
  try {
    const { email, prompt, modelId, maxTokens, sessionId } = await request.json();
    if (!email || !prompt || !modelId || !maxTokens || !sessionId) {
      return new Response("Missing parameters", { status: 400 });
    }

    const { stream, usagePromise } = await askClaude(email, prompt, modelId, maxTokens);

    usagePromise.then((usage) => {
      sessionsUsage[sessionId] = usage;
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}

// GET endpoint to fetch usage
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return new Response("Missing sessionId", { status: 400 });

  const usage = sessionsUsage[sessionId];
  if (!usage) return new Response("Usage not ready yet", { status: 202 });

  return Response.json(usage);
}
