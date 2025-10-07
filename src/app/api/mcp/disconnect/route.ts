import type { NextRequest } from "next/server";
import { z } from "zod";
import { deleteMCPConnection } from "@/lib/mcp/redis";

const DisconnectRequestSchema = z.object({
  connectionId: z.string().min(1),
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
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

    return Response.json(
      {
        error: "Failed to disconnect MCP server",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
