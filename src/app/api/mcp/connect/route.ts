import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/mcp/oauth";
import {
  deleteMCPConnection,
  type MCPConnectionState,
  storeMCPConnection,
  storeOAuthState,
} from "@/lib/mcp/redis";

const ConnectRequestSchema = z.object({
  endpoint: z.string().url(),
  name: z.string().min(1).optional(),
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ConnectRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { endpoint, name, sessionId } = validation.data;

    const connectionId = crypto.randomUUID();
    const connectionName = name || new URL(endpoint).hostname;

    const connection: MCPConnectionState = {
      id: connectionId,
      name: connectionName,
      endpoint,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Perform OAuth registration first before persisting connection
    const mcpServerUrl = new URL(endpoint);
    const registerEndpoint = new URL(
      "/register",
      mcpServerUrl.origin,
    ).toString();
    const redirectUri = new URL(
      "/api/mcp/oauth/callback",
      req.nextUrl.origin,
    ).toString();

    const registrationResponse = await fetch(registerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_name: "Vercel AI MCP Client",
        client_uri: req.nextUrl.origin,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });

    if (!registrationResponse.ok) {
      throw new Error(
        `Client registration failed: ${registrationResponse.status}`,
      );
    }

    const registrationData = await registrationResponse.json();
    const clientId = registrationData.client_id;

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store OAuth state with connection info (connection will be persisted after OAuth success)
    await storeOAuthState(state, {
      sessionId,
      connectionId,
      endpoint,
      codeVerifier,
      clientId,
      connectionName,
    });

    const authEndpoint = new URL("/authorize", mcpServerUrl.origin).toString();

    const authUrl = new URL(authEndpoint);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return Response.json({
      requiresAuth: true,
      authUrl: authUrl.toString(),
      connectionId,
      sessionId,
    });
  } catch (error) {
    console.error("MCP connect error:", error);

    // Check if it's a Redis configuration error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isRedisError = errorMessage.includes("Redis configuration missing");

    return Response.json(
      {
        error: isRedisError
          ? "MCP feature requires Redis configuration"
          : "Failed to connect to MCP server",
        message: errorMessage,
      },
      { status: isRedisError ? 503 : 500 },
    );
  }
}
