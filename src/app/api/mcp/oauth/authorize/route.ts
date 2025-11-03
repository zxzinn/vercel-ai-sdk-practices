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
import { discoverOAuthEndpoints } from "@/lib/mcp/oauth-endpoints";
import { registerOAuthClient } from "@/lib/mcp/oauth-registration";
import { storeOAuthState } from "@/lib/mcp/redis";
import { validateRequestRaw } from "@/lib/validation/api-validation";

const AuthorizeRequestSchema = z.object({
  endpoint: z.string().url(),
  name: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  connectionId: z.string().min(1),
  registrationApiKey: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    checkRedisConfig();

    const body = await req.json();
    const validationResult = validateRequestRaw(AuthorizeRequestSchema, body);
    if (validationResult instanceof Response) return validationResult;

    const { endpoint, name, sessionId, connectionId, registrationApiKey } =
      validationResult;

    const connectionName = name || new URL(endpoint).hostname;
    const mcpServerUrl = new URL(endpoint);
    const redirectUri = new URL(
      "/api/mcp/oauth/callback",
      req.nextUrl.origin,
    ).toString();

    const oauthEndpoints = await discoverOAuthEndpoints(mcpServerUrl.origin);

    const { clientId } = await registerOAuthClient({
      registrationEndpoint: oauthEndpoints.registration,
      redirectUri,
      clientUri: req.nextUrl.origin,
      apiKey: registrationApiKey,
    });

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    await storeOAuthState(state, {
      sessionId,
      connectionId,
      endpoint,
      codeVerifier,
      clientId,
      connectionName,
      apiKey: registrationApiKey,
      tokenEndpoint: oauthEndpoints.token,
    });

    const authUrl = new URL(oauthEndpoints.authorization);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return Response.json({
      authUrl: authUrl.toString(),
      connectionId,
      sessionId,
    });
  } catch (error) {
    console.error("MCP OAuth authorize error:", error);

    if (error instanceof RedisConfigError) {
      return createRedisConfigErrorResponse();
    }

    return Response.json(
      {
        error: "Failed to initiate OAuth authorization",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
