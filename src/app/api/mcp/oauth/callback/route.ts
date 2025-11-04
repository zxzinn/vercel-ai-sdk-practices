import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  checkRedisConfig,
  RedisConfigError,
} from "@/lib/mcp/check-redis-config";
import { exchangeCodeForToken } from "@/lib/mcp/oauth";
import { getOAuthState, storeMCPConnection } from "@/lib/mcp/redis";

// HTML escape utility to prevent XSS in HTML content
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// OAuth callback can receive either:
// 1. Success: code + state (error parameters absent)
// 2. Error: error + error_description (code/state may be absent per RFC 6749)
const CallbackParamsSchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
  })
  .refine((data) => data.error || (data.code && data.state), {
    message: "Either error or (code and state) must be present",
  });

export async function GET(req: NextRequest) {
  try {
    // Check Redis configuration early, before any operations
    checkRedisConfig();

    // Use our own origin for postMessage - the popup was opened from our app
    // Using referer would send to OAuth provider's origin (wrong target)
    const parentOrigin = req.nextUrl.origin;

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
            <script type="application/json" id="oauth-data">
              ${JSON.stringify({
                type: "mcp-oauth-error",
                error: params.error,
                description: params.error_description || "Unknown error",
              })}
            </script>
            <script type="application/json" id="oauth-config">
              ${JSON.stringify({ parentOrigin })}
            </script>
            <script>
              const data = JSON.parse(document.getElementById('oauth-data').textContent);
              const config = JSON.parse(document.getElementById('oauth-config').textContent);
              window.opener?.postMessage(data, config.parentOrigin);
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

    // At this point, schema validation guarantees code and state are present
    if (!params.state || !params.code) {
      return new Response("Missing required parameters", { status: 400 });
    }

    const stateData = await getOAuthState(params.state);

    if (!stateData) {
      // State was already used or expired - this can happen if callback is called twice
      // Return a friendly HTML page instead of plain text error
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Already Processed</title>
            <script>
              // Try to close the window anyway
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </head>
          <body>
            <h1>Authentication Already Processed</h1>
            <p>This authentication request has already been completed.</p>
            <p>You can close this window now.</p>
          </body>
        </html>
      `,
        {
          status: 200, // Changed to 200 to avoid browser error messages
          headers: {
            "Content-Type": "text/html",
            "Content-Security-Policy":
              "default-src 'none'; script-src 'unsafe-inline'",
          },
        },
      );
    }

    const {
      sessionId,
      connectionId,
      connectionName,
      endpoint,
      codeVerifier,
      clientId,
      apiKey,
      tokenEndpoint: storedTokenEndpoint,
    } = stateData;

    // Validate required OAuth state data
    if (!clientId) {
      throw new Error(
        "Missing client_id in OAuth state - possible data corruption",
      );
    }

    if (!params.code || !params.state) {
      throw new Error("Missing code or state parameter in OAuth callback");
    }

    // Use stored tokenEndpoint or default to /token on endpoint origin
    const tokenEndpoint =
      storedTokenEndpoint || new URL("/token", endpoint).toString();
    const redirectUri = new URL(
      "/api/mcp/oauth/callback",
      req.nextUrl.origin,
    ).toString();

    const tokenResponse = await exchangeCodeForToken({
      tokenEndpoint,
      code: params.code,
      codeVerifier,
      redirectUri,
      clientId,
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
      apiKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storeMCPConnection(sessionId, connection);

    // Store success state in sessionStorage for parent to poll
    const successKey = `mcp-oauth-success-${connectionId}`;

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
          <meta http-equiv="refresh" content="2;url=about:blank">
          <script type="application/json" id="oauth-data">
            ${JSON.stringify({
              type: "mcp-oauth-success",
              successKey,
              connectionId,
              sessionId,
              parentOrigin,
            })}
          </script>
          <script>
            const data = JSON.parse(document.getElementById('oauth-data').textContent);
            const { successKey, connectionId, sessionId, parentOrigin } = data;

            // Store success flag in sessionStorage
            try {
              if (window.opener) {
                window.opener.sessionStorage.setItem(successKey, JSON.stringify({
                  type: 'mcp-oauth-success',
                  connectionId,
                  sessionId,
                  timestamp: Date.now()
                }));
              } else {
                // Try to store in current window's sessionStorage as fallback
                sessionStorage.setItem(successKey, JSON.stringify({
                  type: 'mcp-oauth-success',
                  connectionId,
                  sessionId,
                  timestamp: Date.now()
                }));
              }
            } catch (err) {
              console.error('[MCP OAuth Callback] Failed to store success flag:', err);
            }

            // Try to send postMessage if opener exists
            if (window.opener) {
              try {
                window.opener.postMessage({
                  type: 'mcp-oauth-success',
                  connectionId,
                  sessionId
                }, parentOrigin);
              } catch (err) {
                console.error('[MCP OAuth Callback] postMessage failed:', err);
              }
            }

            // Auto-close after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </head>
        <body style="text-align: center; padding: 40px; font-family: system-ui;">
          <h1 style="color: #0070f3;">✅ Success!</h1>
          <p style="font-size: 18px; margin: 20px 0;">Authentication completed successfully.</p>
          <p style="color: #666;">This window will close automatically in 2 seconds.</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #0070f3; color: white; border: none; border-radius: 5px;">Close Now</button>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Content-Security-Policy":
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
        },
      },
    );
  } catch (error) {
    console.error("OAuth callback error:", error);

    // Check if it's a validation error (missing params) vs runtime error
    const isValidationError = error instanceof z.ZodError;
    const isRedisConfigError = error instanceof RedisConfigError;
    const statusCode = isValidationError ? 400 : isRedisConfigError ? 503 : 500;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
          <script type="application/json" id="oauth-data">
            ${JSON.stringify({
              type: "mcp-oauth-error",
              error: "callback_failed",
              description: errorMessage,
            })}
          </script>
          <script type="application/json" id="oauth-config">
            ${JSON.stringify({ parentOrigin: req.nextUrl.origin })}
          </script>
          <script>
            const data = JSON.parse(document.getElementById('oauth-data').textContent);
            const config = JSON.parse(document.getElementById('oauth-config').textContent);
            window.opener?.postMessage(data, config.parentOrigin);
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
