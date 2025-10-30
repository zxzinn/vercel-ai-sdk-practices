import type { CoreMessage } from "ai";
import { streamObject } from "ai";
import type { NextRequest } from "next/server";
import { artifactSchema } from "@/lib/artifacts/schema";
import { getCurrentUser } from "@/lib/auth/server";
import { getAllModels } from "@/lib/providers/loader";

export const maxDuration = 300;

interface RequestBody {
  messages: CoreMessage[];
  model: string;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body: RequestBody = await request.json();
    const { messages, model } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages", { status: 400 });
    }

    // Validate model exists
    const allModels = getAllModels();
    const modelExists = allModels.some((m) => m.id === model);

    if (!modelExists) {
      return new Response(`Model ${model} not found`, { status: 400 });
    }

    const result = streamObject({
      model,
      schema: artifactSchema,
      system: `You are an expert at creating interactive code artifacts. Generate complete, self-contained code that can be executed or rendered directly in a browser.

Guidelines:
- For HTML: Include all necessary CSS and JavaScript inline
- For React: Export a single default component, use functional components with hooks
- For SVG: Create valid, complete SVG markup
- Always write complete, runnable code - no placeholders or TODO comments
- Code must be production-ready and follow best practices
- Include error handling where appropriate

When asked to create visual content, interactive demos, data visualizations, or executable code, respond with an artifact.`,
      messages,
      maxRetries: 0,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Artifact generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
