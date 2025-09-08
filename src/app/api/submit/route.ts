// import { askClaude } from "../../api";
// import { marked } from "marked";

// export async function POST(request: Request) {
//   const res = await request.json()
//   const prompt = res.prompt
//   const response = await askClaude(prompt);
//   const htmlResponse = await marked(response);

//   console.log("Received prompt:", prompt)
//   // You can process the prompt here, e.g., call askClaude(prompt) if needed
//   return new Response(htmlResponse, { status: 200 })
// }

import { askClaude } from "../../api";

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const stream = await askClaude(prompt);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
