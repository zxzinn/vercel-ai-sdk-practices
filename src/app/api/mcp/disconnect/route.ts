import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  checkRedisConfig,
  createRedisConfigErrorResponse,
  RedisConfigError,
} from "@/lib/mcp/check-redis-config";
import { deleteMCPConnection } from "@/lib/mcp/redis";
import { validateRequestRaw } from "@/lib/validation/api-validation";

const DisconnectRequestSchema = z.object({
  connectionId: z.string().min(1),
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Check Redis configuration early, before any operations
    checkRedisConfig();

    const body = await req.json();
    const validationResult = validateRequestRaw(DisconnectRequestSchema, body);
    if (validationResult instanceof Response) return validationResult;

    const { connectionId, sessionId } = validationResult;

    await deleteMCPConnection(sessionId, connectionId);

    return Response.json({
      success: true,
      message: "MCP connection removed successfully",
    });
  } catch (error) {
    console.error("MCP disconnect error:", error);

    // Return specific error response for Redis configuration issues
    if (error instanceof RedisConfigError) {
      return createRedisConfigErrorResponse();
    }

    return Response.json(
      {
        error: "Failed to disconnect MCP server",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
