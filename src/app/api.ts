import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "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",
});

export async function askClaude(prompt: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // return the first text block
    return msg.content[0]?.text || "No response from Claude";

  } catch (err) {
    console.error("Anthropic API error:", err);
    return "Error fetching response";
  }
}