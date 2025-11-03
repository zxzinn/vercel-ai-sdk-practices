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
import { validateRequestRaw } from "@/lib/validation/api-validation";

const ConnectRequestSchema = z.object({
  endpoint: z.string().url(),
  name: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  apiKey: z.string().min(1).optional(),
  skipClientRegistration: z.boolean().optional(),
  authorizationEndpoint: z.string().url().optional(),
  tokenEndpoint: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check Redis configuration early, before any operations
    checkRedisConfig();

    const body = await req.json();
    const validationResult = validateRequestRaw(ConnectRequestSchema, body);
    if (validationResult instanceof Response) return validationResult;

    const {
      endpoint,
      name,
      sessionId,
      apiKey,
      skipClientRegistration,
      authorizationEndpoint: customAuthEndpoint,
      tokenEndpoint: customTokenEndpoint,
    } = validationResult;

    const connectionId = crypto.randomUUID();
    const connectionName = name || new URL(endpoint).hostname;

    const mcpServerUrl = new URL(endpoint);
    const redirectUri = new URL(
      "/api/mcp/oauth/callback",
      req.nextUrl.origin,
    ).toString();

    let clientId: string;
    let authEndpoint: string;
    let tokenEndpoint: string;

    if (skipClientRegistration) {
      clientId = "vercel-ai-mcp-client";
      authEndpoint =
        customAuthEndpoint ||
        new URL("/authorize", mcpServerUrl.origin).toString();
      tokenEndpoint =
        customTokenEndpoint ||
        new URL("/token", mcpServerUrl.origin).toString();
    } else {
      // Try to discover OAuth endpoints from .well-known
      const wellKnownUrl = new URL(
        "/.well-known/oauth-authorization-server",
        mcpServerUrl.origin,
      ).toString();

      let discoveredEndpoints: {
        registration_endpoint?: string;
        authorization_endpoint?: string;
        token_endpoint?: string;
      } = {};

      try {
        const metadataResponse = await fetch(wellKnownUrl);
        if (metadataResponse.ok) {
          discoveredEndpoints = await metadataResponse.json();
        }
      } catch {
        // Metadata discovery failed, will use defaults
      }

      const registerEndpoint =
        discoveredEndpoints.registration_endpoint ||
        new URL("/register", mcpServerUrl.origin).toString();

      const registrationResponse = await fetch(registerEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && { "X-API-Key": apiKey }),
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
      clientId = registrationData.client_id;
      authEndpoint =
        discoveredEndpoints.authorization_endpoint ||
        new URL("/authorize", mcpServerUrl.origin).toString();
      tokenEndpoint =
        discoveredEndpoints.token_endpoint ||
        new URL("/token", mcpServerUrl.origin).toString();
    }

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
      apiKey,
      tokenEndpoint,
    });

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
