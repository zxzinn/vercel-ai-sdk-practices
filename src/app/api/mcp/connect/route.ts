import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  checkRedisConfig,
  createRedisConfigErrorResponse,
  RedisConfigError,
} from "@/lib/mcp/check-redis-config";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/mcp/oauth";
import { storeOAuthState } from "@/lib/mcp/redis";

const ConnectRequestSchema = z.object({
  endpoint: z.string().url(),
  name: z.string().min(1).optional(),
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Check Redis configuration early, before any operations
    checkRedisConfig();

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

    // Return specific error response for Redis configuration issues
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
