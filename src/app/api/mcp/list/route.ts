import type { NextRequest } from "next/server";
import { z } from "zod";
import { listMCPConnections } from "@/lib/mcp/redis";

const ListRequestSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ListRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { sessionId } = validation.data;

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

    return Response.json(
      {
        error: "Failed to list MCP connections",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
