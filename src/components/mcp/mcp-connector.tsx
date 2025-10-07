"use client";

import { CheckCircleIcon, PlugIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

export function MCPConnector({
  sessionId,
  onConnectionsChange,
}: MCPConnectorProps) {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [name, setName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // Get expected origin from auth URL for validation
        const expectedOrigin = new URL(data.authUrl).origin;

        const handleMessage = (event: MessageEvent) => {
          // Validate message origin and source
          if (event.source !== authWindow) {
            return; // Ignore messages not from our popup
          }

          // For OAuth callback, the origin will be our own origin (callback URL)
          const callbackOrigin = window.location.origin;
          if (
            event.origin !== callbackOrigin &&
            event.origin !== expectedOrigin
          ) {
            console.warn(
              "Ignored message from unexpected origin:",
              event.origin,
            );
            return;
          }

          if (event.data?.type === "mcp-oauth-success") {
            window.removeEventListener("message", handleMessage);
            try {
              if (authWindow) {
                authWindow.close();
              }
            } catch {
              // Ignore COOP errors when closing window
            }
            loadConnections();
            setShowDialog(false);
            setEndpoint("");
            setName("");
            setConnecting(false);
          } else if (event.data?.type === "mcp-oauth-error") {
            window.removeEventListener("message", handleMessage);
            try {
              if (authWindow) {
                authWindow.close();
              }
            } catch {
              // Ignore COOP errors when closing window
            }
            setError(
              event.data.description ||
                "Authentication failed. Please try again.",
            );
            setConnecting(false);
          }
        };

        window.addEventListener("message", handleMessage);

        // Cleanup function to avoid memory leaks
        let checkIntervalId: NodeJS.Timeout | null = null;
        let checkCount = 0;

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

        checkIntervalId = setInterval(() => {
          checkCount++;

          // Timeout after 5 minutes (600 * 500ms)
          if (checkCount > 600) {
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
        }, 500);
      } else if (data.success) {
        setConnections([...connections, data.connection]);
        setShowDialog(false);
        setEndpoint("");
        setName("");
      } else {
        setError(data.error || "Failed to connect to MCP server");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to MCP server",
      );
    } finally {
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
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" />
              Connect
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect to MCP Server</DialogTitle>
              <DialogDescription>
                Enter the endpoint URL of your MCP server. If authentication is
                required, you'll be redirected to sign in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label htmlFor="mcp-name">Name (optional)</Label>
                <Input
                  id="mcp-name"
                  placeholder="My MCP Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
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
                  setShowDialog(false);
                  setEndpoint("");
                  setName("");
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
