import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "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",
});

export async function askClaude(prompt: string): Promise<ReadableStream> {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }

          if (event.type === "message_stop") {
            break;
          }
        }
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode("[Error streaming response]")
        );
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}