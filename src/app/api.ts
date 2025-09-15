import Anthropic from "@anthropic-ai/sdk";
import { models } from "../lib/models";
import { readUsers, writeUsers, User } from "../lib/usersStore";

const anthropic = new Anthropic({
  apiKey: process.env.API_KEY || "",
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function askClaude(
  email: string,
  prompt: string,
  modelId: string,
  maxTokens: number
): Promise<ReadableStream> {
  // Валідація моделі
  const found = models.find((m) => m.id === modelId);
  if (!found) throw new Error("Invalid model id");

  // Завантажуємо користувачів
  const users = await readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("User not found");

  console.log("user", user);
  
  // Додаємо історію, якщо її ще немає
  if (!user.history) user.history = [];
const history = user.history;


  // Додаємо новий prompt як повідомлення user
  history.push({ role: "user", content: prompt });

  // Створюємо ReadableStream для потокового прийому відповіді
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: modelId,
          max_tokens: maxTokens,
          messages: history,
        });
        console.log("history", history);
        let assistantText = "";

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            assistantText += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          if (event.type === "message_stop") break;
        }

        // Додаємо відповідь ШІ до історії і зберігаємо
        history.push({ role: "assistant", content: assistantText });
        await writeUsers(users);
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(`[Error streaming response]: ${err}`));
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
