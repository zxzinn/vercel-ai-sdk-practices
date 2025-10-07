import type { NextRequest } from "next/server";
import { z } from "zod";
import { exchangeCodeForToken } from "@/lib/mcp/oauth";
import {
  getMCPConnection,
  getOAuthState,
  storeMCPConnection,
} from "@/lib/mcp/redis";

// HTML escape utility to prevent XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// JSON escape for embedding in script tags
function escapeJson(value: string): string {
  return JSON.stringify(value);
}

const CallbackParamsSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Get the parent origin for postMessage (use referer or default to own origin)
    const refererHeader = req.headers.get("referer");
    const parentOrigin = refererHeader
      ? new URL(refererHeader).origin
      : req.nextUrl.origin;

    const searchParams = req.nextUrl.searchParams;
    const params = CallbackParamsSchema.parse({
      code: searchParams.get("code") || undefined,
      state: searchParams.get("state") || undefined,
      error: searchParams.get("error") || undefined,
      error_description: searchParams.get("error_description") || undefined,
    });

    if (params.error) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Error</title>
            <script>
              window.opener?.postMessage({
                type: 'mcp-oauth-error',
                error: ${escapeJson(params.error)},
                description: ${escapeJson(params.error_description || "Unknown error")}
              }, ${escapeJson(parentOrigin)});
              window.close();
            </script>
          </head>
          <body>
            <h1>Authentication Error</h1>
            <p>${escapeHtml(params.error_description || params.error)}</p>
            <p>This window will close automatically...</p>
          </body>
        </html>
      `,
        {
          status: 400,
          headers: {
            "Content-Type": "text/html",
            "Content-Security-Policy":
              "default-src 'none'; script-src 'unsafe-inline'",
          },
        },
      );
    }

    const stateData = await getOAuthState(params.state);

    if (!stateData) {
      return new Response("Invalid or expired state parameter", {
        status: 400,
      });
    }

    const {
      sessionId,
      connectionId,
      connectionName,
      endpoint,
      codeVerifier,
      clientId,
    } = stateData;

    const mcpServerUrl = new URL(endpoint);
    const tokenEndpoint = new URL("/token", mcpServerUrl.origin).toString();
    const redirectUri = new URL(
      "/api/mcp/oauth/callback",
      req.nextUrl.origin,
    ).toString();

    const tokenResponse = await exchangeCodeForToken({
      tokenEndpoint,
      code: params.code,
      codeVerifier,
      redirectUri,
      clientId: clientId || "vercel-ai-mcp-client",
    });

    // Create and store the connection with OAuth tokens (only after successful OAuth)
    const connection = {
      id: connectionId,
      name: connectionName,
      endpoint,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storeMCPConnection(sessionId, connection);

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
          <script>
            window.opener?.postMessage({
              type: 'mcp-oauth-success',
              connectionId: ${escapeJson(connectionId)},
              sessionId: ${escapeJson(sessionId)}
            }, ${escapeJson(parentOrigin)});
            window.close();
          </script>
        </head>
        <body>
          <h1>Authentication Successful</h1>
          <p>You can now close this window.</p>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Content-Security-Policy":
            "default-src 'none'; script-src 'unsafe-inline'",
        },
      },
    );
  } catch (error) {
    console.error("OAuth callback error:", error);

    // Check if it's a validation error (missing params) vs runtime error
    const isValidationError = error instanceof z.ZodError;
    const statusCode = isValidationError ? 400 : 500;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
          <script>
            window.opener?.postMessage({
              type: 'mcp-oauth-error',
              error: 'callback_failed',
              description: ${escapeJson(errorMessage)}
            }, ${escapeJson(req.nextUrl.origin)});
            window.close();
          </script>
        </head>
        <body>
          <h1>Authentication Failed</h1>
          <p>${escapeHtml(errorMessage)}</p>
          <p>This window will close automatically...</p>
        </body>
      </html>
    `,
      {
        status: statusCode,
        headers: {
          "Content-Type": "text/html",
          "Content-Security-Policy":
            "default-src 'none'; script-src 'unsafe-inline'",
        },
      },
    );
  }
}
