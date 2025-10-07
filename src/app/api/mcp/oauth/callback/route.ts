import type { NextRequest } from "next/server";
import { z } from "zod";
import { exchangeCodeForToken } from "@/lib/mcp/oauth";
import {
  getMCPConnection,
  getOAuthState,
  storeMCPConnection,
} from "@/lib/mcp/redis";

const CallbackParamsSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
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
                error: '${params.error}',
                description: '${params.error_description || "Unknown error"}'
              }, '*');
              window.close();
            </script>
          </head>
          <body>
            <h1>Authentication Error</h1>
            <p>${params.error_description || params.error}</p>
            <p>This window will close automatically...</p>
          </body>
        </html>
      `,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        },
      );
    }

    const stateData = await getOAuthState(params.state);

    if (!stateData) {
      return new Response("Invalid or expired state parameter", {
        status: 400,
      });
    }

    const { sessionId, connectionId, endpoint, codeVerifier, clientId } =
      stateData;

    const connection = await getMCPConnection(sessionId, connectionId);

    if (!connection) {
      return new Response("Connection not found", { status: 404 });
    }

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

    const updatedConnection = {
      ...connection,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined,
      updatedAt: Date.now(),
    };

    await storeMCPConnection(sessionId, updatedConnection);

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
          <script>
            window.opener?.postMessage({
              type: 'mcp-oauth-success',
              connectionId: '${connectionId}',
              sessionId: '${sessionId}'
            }, '*');
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
        headers: { "Content-Type": "text/html" },
      },
    );
  } catch (error) {
    console.error("OAuth callback error:", error);

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
              description: '${error instanceof Error ? error.message : "Unknown error"}'
            }, '*');
            window.close();
          </script>
        </head>
        <body>
          <h1>Authentication Failed</h1>
          <p>${error instanceof Error ? error.message : "An unknown error occurred"}</p>
          <p>This window will close automatically...</p>
        </body>
      </html>
    `,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}
