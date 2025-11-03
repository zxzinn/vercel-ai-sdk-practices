import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  checkRedisConfig,
  createRedisConfigErrorResponse,
  RedisConfigError,
} from "@/lib/mcp/check-redis-config";
import { validateRequestRaw } from "@/lib/validation/api-validation";

const ConnectRequestSchema = z.object({
  endpoint: z.string().url(),
  name: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  registrationApiKey: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    checkRedisConfig();

    const body = await req.json();
    const validationResult = validateRequestRaw(ConnectRequestSchema, body);
    if (validationResult instanceof Response) return validationResult;

    const { endpoint, name, sessionId, registrationApiKey } = validationResult;

    const connectionId = crypto.randomUUID();

    const authorizeResponse = await fetch(
      new URL("/api/mcp/oauth/authorize", req.nextUrl.origin),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          name,
          sessionId,
          connectionId,
          registrationApiKey,
        }),
      },
    );

    if (!authorizeResponse.ok) {
      const errorData = await authorizeResponse.json();
      return Response.json(errorData, { status: authorizeResponse.status });
    }

    const { authUrl } = await authorizeResponse.json();

    return Response.json({
      requiresAuth: true,
      authUrl,
      connectionId,
      sessionId,
    });
  } catch (error) {
    console.error("MCP connect error:", error);

    if (error instanceof RedisConfigError) {
      return createRedisConfigErrorResponse();
    }

    return Response.json(
      {
        error: "Failed to connect to MCP server",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
