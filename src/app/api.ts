// api.ts
import Anthropic from "@anthropic-ai/sdk";
import { readUsers, writeUsers } from "../lib/usersStore";

const anthropic = new Anthropic({
  apiKey: process.env.API_KEY || "",
});

// ---------------------------------------------
// 1️⃣ Streaming chat function (existing behavior)
// ---------------------------------------------
interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function askClaude(
  email: string,
  prompt: string,
  modelId: string,
  maxTokens: number,
  // sessionId: string
): Promise<{ stream: ReadableStream; usagePromise: Promise<any> }> {
  const users = await readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("User not found");
  if (!user.history) user.history = [];

  const history = user.history;
  history.push({ role: "user", content: prompt });

  let resolveUsage: (usage: any) => void;
  const usagePromise = new Promise<any>((resolve) => (resolveUsage = resolve));

  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = "";

      try {
        const claudeStream = anthropic.messages.stream({
          model: modelId,
          max_tokens: maxTokens,
          messages: history,
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            assistantText += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        }

        const finalMessage = await claudeStream.finalMessage();
        history.push({ role: "assistant", content: assistantText });
        await writeUsers(users);

        resolveUsage({
          usage: {
            input_tokens: finalMessage.usage.input_tokens,
            output_tokens: finalMessage.usage.output_tokens,
          },
          textLength: assistantText.length,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(`[Error streaming response]: ${err}`));
        resolveUsage({ error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return { stream, usagePromise };
}

// ---------------------------------------------
// 2️⃣ Single-response function (for chess moves)
// ---------------------------------------------
export async function askClaudeOnce(
  email: string,
  prompt: string,
  modelId: string,
  maxTokens: number
): Promise<string> {
  const users = await readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("User not found");
  if (!user.history) user.history = [];
  // console.log("user history:", user.history);
  
  const history = user.history;
  history.push({ role: "user", content: prompt });

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: history,
  });

  const assistantText = response.content[0]?.text ?? "";
  history.push({ role: "assistant", content: assistantText });
  await writeUsers(users);

  return assistantText.trim();
}
