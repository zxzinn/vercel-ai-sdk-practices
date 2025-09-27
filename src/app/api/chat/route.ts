import { convertToModelMessages, streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o-mini",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
