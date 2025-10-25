import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  checkRedisConfig,
  createRedisConfigErrorResponse,
  RedisConfigError,
} from "@/lib/mcp/check-redis-config";
import { listMCPConnections } from "@/lib/mcp/redis";
import { validateRequestRaw } from "@/lib/validation/api-validation";

const ListRequestSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Check Redis configuration early, before any operations
    checkRedisConfig();

    const body = await req.json();
    const validationResult = validateRequestRaw(ListRequestSchema, body);
    if (validationResult instanceof Response) return validationResult;

    const { sessionId } = validationResult;

    const connections = await listMCPConnections(sessionId);

    return Response.json({
      connections: connections.map((conn) => ({
        id: conn.id,
        name: conn.name,
        endpoint: conn.endpoint,
        hasAuth: !!conn.accessToken,
        createdAt: conn.createdAt,
      })),
    });
  } catch (error) {
    console.error("MCP list error:", error);

    // Return specific error response for Redis configuration issues
    if (error instanceof RedisConfigError) {
      return createRedisConfigErrorResponse();
    }

    return Response.json(
      {
        error: "Failed to list MCP connections",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
