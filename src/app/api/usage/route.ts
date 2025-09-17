// import { getUsage } from "../../api";

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const sessionId = searchParams.get("sessionId");
//   if (!sessionId) return new Response("Missing sessionId", { status: 400 });

//   const usage = getUsage(sessionId);
//   if (!usage) return new Response("Usage not found", { status: 404 });

//   return new Response(JSON.stringify(usage), {
//     headers: { "Content-Type": "application/json" },
//   });
// }
