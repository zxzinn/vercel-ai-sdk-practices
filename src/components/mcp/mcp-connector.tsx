"use client";

import {
  CheckCircleIcon,
  ExternalLinkIcon,
  PlugIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUILT_IN_MCP_CONNECTORS,
  type BuiltInMCPConnector,
} from "@/lib/mcp/built-in-connectors";
import { cn } from "@/lib/utils";

interface MCPConnection {
  id: string;
  name: string;
  endpoint: string;
  tools: string[];
  status: "connected" | "connecting" | "error";
}

interface MCPConnectorProps {
  sessionId: string;
  onConnectionsChange?: (connections: MCPConnection[]) => void;
}

// OAuth callback message validation schemas
const OAuthSuccessMessageSchema = z.object({
  type: z.literal("mcp-oauth-success"),
  connectionId: z.string().optional(),
  sessionId: z.string().optional(),
});

const OAuthErrorMessageSchema = z.object({
  type: z.literal("mcp-oauth-error"),
  error: z.string().optional(),
  description: z.string().optional(),
});

const OAuthMessageSchema = z.union([
  OAuthSuccessMessageSchema,
  OAuthErrorMessageSchema,
]);

type OAuthMessage = z.infer<typeof OAuthMessageSchema>;

export function MCPConnector({
  sessionId,
  onConnectionsChange,
}: MCPConnectorProps) {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [name, setName] = useState("");
  const [registrationApiKey, setRegistrationApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuiltIn, setSelectedBuiltIn] =
    useState<BuiltInMCPConnector | null>(null);

  // Track cleanup functions for OAuth popups to prevent memory leaks
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  const loadConnections = useCallback(async () => {
    try {
      const response = await fetch("/api/mcp/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setConnections(
          data.connections.map(
            (conn: { id: string; name: string; endpoint: string }) => ({
              ...conn,
              tools: [],
              status: "connected" as const,
            }),
          ),
        );
      }
    } catch (error) {
      console.error("Failed to load MCP connections:", error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadConnections();
    }
  }, [sessionId, loadConnections]);

  useEffect(() => {
    // Always notify parent of connection changes, including when empty
    onConnectionsChange?.(connections);
  }, [connections, onConnectionsChange]);

  // Cleanup all OAuth popups on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const cleanup of cleanupFunctionsRef.current) {
        cleanup();
      }
      cleanupFunctionsRef.current = [];
    };
  }, []);

  const handleConnectBuiltIn = async (connector: BuiltInMCPConnector) => {
    setConnecting(true);
    setError(null);
    setSelectedBuiltIn(connector);

    try {
      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: connector.endpoint,
          name: connector.name,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.requiresAuth) {
        const authWindow = window.open(
          data.authUrl,
          "mcp-oauth",
          "width=600,height=700",
        );

        if (!authWindow) {
          setConnecting(false);
          setError(
            "Popup blocked. Please allow popups for this site and try again.",
          );
          return;
        }

        let checkIntervalId: NodeJS.Timeout | null = null;
        const startTime = Date.now();
        const TIMEOUT_MS = 5 * 60 * 1000;

        const cleanup = () => {
          if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
          }
          window.removeEventListener("message", handleMessage);
          const index = cleanupFunctionsRef.current.indexOf(cleanup);
          if (index > -1) {
            cleanupFunctionsRef.current.splice(index, 1);
          }
        };

        const handleMessage = (event: MessageEvent) => {
          if (event.source !== authWindow) {
            return;
          }

          const callbackOrigin = window.location.origin;
          if (event.origin !== callbackOrigin) {
            console.warn(
              "[MCP OAuth] Ignored message from unexpected origin:",
              event.origin,
              "Expected:",
              callbackOrigin,
            );
            return;
          }

          // Handle close popup request (doesn't need schema validation)
          if (event.data?.type === "mcp-close-popup") {
            try {
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
            } catch (e) {
              console.error("[MCP OAuth] Failed to close popup:", e);
            }
            return;
          }

          const validation = OAuthMessageSchema.safeParse(event.data);
          if (!validation.success) {
            console.warn(
              "[MCP OAuth] Ignored message with invalid format:",
              event.data,
              "Errors:",
              validation.error.issues,
            );
            return;
          }

          const data: OAuthMessage = validation.data;

          if (data.type === "mcp-oauth-success") {
            cleanup();
            try {
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
            } catch (e) {
              console.error("[MCP OAuth] Failed to close popup:", e);
            }
            loadConnections();
            setShowDialog(false);
            setSelectedBuiltIn(null);
            setConnecting(false);
          } else if (data.type === "mcp-oauth-error") {
            cleanup();
            try {
              if (authWindow) {
                authWindow.close();
              }
            } catch {
              // Ignore COOP errors when closing window
            }
            setError(
              data.description || "Authentication failed. Please try again.",
            );
            setSelectedBuiltIn(null);
            setConnecting(false);
          }
        };

        window.addEventListener("message", handleMessage);

        cleanupFunctionsRef.current.push(cleanup);

        // Monitor popup window state
        checkIntervalId = setInterval(() => {
          if (Date.now() - startTime > TIMEOUT_MS) {
            cleanup();
            setConnecting(false);
            setSelectedBuiltIn(null);
            setError("Authentication timeout. Please try again.");
            return;
          }

          try {
            if (authWindow?.closed) {
              cleanup();
              setConnecting(false);
              setSelectedBuiltIn(null);
            }
          } catch {
            cleanup();
            setConnecting(false);
            setSelectedBuiltIn(null);
          }
        }, 1000);
      } else {
        setError(data.error || "Failed to connect to MCP server");
        setConnecting(false);
        setSelectedBuiltIn(null);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to MCP server",
      );
      setConnecting(false);
      setSelectedBuiltIn(null);
    }
  };

  const handleConnect = async () => {
    if (!endpoint.trim()) return;

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpoint.trim(),
          name: name.trim() || undefined,
          registrationApiKey: registrationApiKey.trim() || undefined,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.requiresAuth) {
        const authWindow = window.open(
          data.authUrl,
          "mcp-oauth",
          "width=600,height=700",
        );

        // Handle popup blocker
        if (!authWindow) {
          setConnecting(false);
          setError(
            "Popup blocked. Please allow popups for this site and try again.",
          );
          return;
        }

        const handleMessage = (event: MessageEvent) => {
          // Validate message origin and source
          if (event.source !== authWindow) {
            return; // Ignore messages not from our popup
          }

          // Only accept messages from our own origin (the OAuth callback URL)
          // This prevents malicious MCP servers from spoofing OAuth messages
          const callbackOrigin = window.location.origin;
          if (event.origin !== callbackOrigin) {
            console.warn(
              "Ignored message from unexpected origin:",
              event.origin,
              "Expected:",
              callbackOrigin,
            );
            return;
          }

          // Validate message data structure to prevent malformed messages
          const validation = OAuthMessageSchema.safeParse(event.data);
          if (!validation.success) {
            console.warn(
              "Ignored message with invalid format:",
              event.data,
              "Errors:",
              validation.error.issues,
            );
            return;
          }

          const data: OAuthMessage = validation.data;

          if (data.type === "mcp-oauth-success") {
            // Clean up interval and event listener
            cleanup();
            try {
              if (authWindow) {
                authWindow.close();
              }
            } catch {
              // Ignore COOP errors when closing window
            }
            loadConnections();
            setShowCustomDialog(false);
            setShowDialog(false);
            setEndpoint("");
            setName("");
            setRegistrationApiKey("");
            setConnecting(false);
          } else if (data.type === "mcp-oauth-error") {
            // Clean up interval and event listener
            cleanup();
            try {
              if (authWindow) {
                authWindow.close();
              }
            } catch {
              // Ignore COOP errors when closing window
            }
            setError(
              data.description || "Authentication failed. Please try again.",
            );
            setConnecting(false);
          }
        };

        window.addEventListener("message", handleMessage);

        // Cleanup function to avoid memory leaks
        let checkIntervalId: NodeJS.Timeout | null = null;
        const startTime = Date.now();
        const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

        const cleanup = () => {
          if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
          }
          window.removeEventListener("message", handleMessage);
          // Remove from tracked cleanups
          const index = cleanupFunctionsRef.current.indexOf(cleanup);
          if (index > -1) {
            cleanupFunctionsRef.current.splice(index, 1);
          }
        };

        // Register cleanup function for component unmount
        cleanupFunctionsRef.current.push(cleanup);

        // Monitor popup window state
        checkIntervalId = setInterval(() => {
          // Use timestamp-based timeout for reliability across browser throttling
          if (Date.now() - startTime > TIMEOUT_MS) {
            cleanup();
            setConnecting(false);
            setError("Authentication timeout. Please try again.");
            return;
          }

          try {
            if (authWindow?.closed) {
              cleanup();
              setConnecting(false);
            }
          } catch {
            // COOP error when accessing closed property
            cleanup();
            setConnecting(false);
          }
        }, 1000);
        // Note: connecting state will be reset by handleMessage or cleanup
        // Don't reset here as OAuth flow is asynchronous
      } else {
        // Handle unexpected response (should not happen with current API)
        setError(data.error || "Failed to connect to MCP server");
        setConnecting(false);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to MCP server",
      );
      setConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, sessionId }),
      });

      if (response.ok) {
        setConnections(connections.filter((conn) => conn.id !== connectionId));
      }
    } catch (error) {
      console.error("Failed to disconnect MCP server:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlugIcon className="size-4" />
          <h3 className="text-sm font-medium">MCP Connections</h3>
        </div>
        <div className="flex gap-2">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusIcon className="size-4" />
                Connect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Connect MCP Server</DialogTitle>
                <DialogDescription>
                  Choose a built-in connector or add a custom MCP server
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Built-in Connectors */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Built-in Connectors</h4>
                  <div className="grid gap-2">
                    {BUILT_IN_MCP_CONNECTORS.map((connector) => {
                      const isConnecting =
                        connecting && selectedBuiltIn?.id === connector.id;
                      const isConnected = connections.some(
                        (conn) =>
                          conn.endpoint === connector.endpoint ||
                          conn.name === connector.name,
                      );

                      return (
                        <div
                          key={connector.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                            isConnected && "bg-muted/50",
                          )}
                        >
                          <div className="text-2xl mt-0.5">
                            {connector.icon}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-sm">
                                {connector.name}
                              </h5>
                              {isConnected && (
                                <CheckCircleIcon className="size-3 text-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {connector.description}
                            </p>
                            {connector.docsUrl && (
                              <a
                                href={connector.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                Documentation
                                <ExternalLinkIcon className="size-3" />
                              </a>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleConnectBuiltIn(connector)}
                            disabled={isConnecting || isConnected || connecting}
                          >
                            {isConnecting
                              ? "Connecting..."
                              : isConnected
                                ? "Connected"
                                : "Connect"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Server Option */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowDialog(false);
                      setShowCustomDialog(true);
                    }}
                  >
                    <PlusIcon className="size-4" />
                    Add Custom MCP Server
                  </Button>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Custom MCP Server Dialog */}
          <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect to Custom MCP Server</DialogTitle>
                <DialogDescription>
                  Enter the endpoint URL of your MCP server. If authentication
                  is required, you'll be redirected to sign in.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="mcp-name">Name (optional)</Label>
                  <Input
                    id="mcp-name"
                    placeholder="My MCP Server"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-endpoint">Endpoint URL</Label>
                  <Input
                    id="mcp-endpoint"
                    placeholder="https://your-mcp-server.workers.dev/mcp"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !connecting) {
                        handleConnect();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-api-key">
                    Registration API Key (optional)
                  </Label>
                  <Input
                    id="mcp-api-key"
                    type="password"
                    placeholder="Required only if the server needs one for registration"
                    value={registrationApiKey}
                    onChange={(e) => setRegistrationApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is only used during OAuth client registration, not for
                    connecting to the MCP server.
                  </p>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomDialog(false);
                    setEndpoint("");
                    setName("");
                    setRegistrationApiKey("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={connecting || !endpoint.trim()}
                >
                  {connecting ? "Connecting..." : "Connect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
          No MCP servers connected. Click "Connect" to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                conn.status === "connected" && "bg-muted/50",
                conn.status === "error" && "border-destructive",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium truncate">{conn.name}</h4>
                  {conn.status === "connected" && (
                    <CheckCircleIcon className="size-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conn.endpoint}
                </p>
                {conn.tools.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {conn.tools.length} tools available
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(conn.id)}
                className="ml-2 flex-shrink-0"
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
