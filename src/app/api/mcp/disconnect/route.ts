import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  checkRedisConfig,
  createRedisConfigErrorResponse,
  RedisConfigError,
} from "@/lib/mcp/check-redis-config";
import { deleteMCPConnection } from "@/lib/mcp/redis";

const DisconnectRequestSchema = z.object({
  connectionId: z.string().min(1),
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Check Redis configuration early, before any operations
    checkRedisConfig();

    const body = await req.json();
    const validation = DisconnectRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { connectionId, sessionId } = validation.data;

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
