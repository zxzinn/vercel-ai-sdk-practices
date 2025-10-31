import {
  experimental_createMCPClient as createMCPClient_AI,
  type experimental_MCPClient as MCPClient,
} from "@ai-sdk/mcp";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type { MCPClient };
export type { StreamableHTTPClientTransport };

export interface MCPClientConfig {
  endpoint: string;
  accessToken?: string;
  apiKey?: string;
  sessionId: string;
}

export interface MCPClientWithTransport {
  client: MCPClient;
  transport: StreamableHTTPClientTransport;
  serverSessionId?: string;
}

export async function createMCPClient(
  config: MCPClientConfig,
): Promise<MCPClientWithTransport> {
  const headers: Record<string, string> = {};

  if (config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`;
  }

  if (config.apiKey) {
    headers["X-API-Key"] = config.apiKey;
  }

  const transport = new StreamableHTTPClientTransport(
    new URL(config.endpoint),
    {
      // Don't provide sessionId on initialization - let server generate it
      // Server will assign a sessionId during the initialize handshake
      requestInit: Object.keys(headers).length > 0 ? { headers } : undefined,
    },
  );

  const client = await createMCPClient_AI({
    transport: transport,
    name: `mcp-client-${config.sessionId}`,
  });

  // Get the server-assigned sessionId after initialization
  const serverSessionId = transport.sessionId;

  return { client, transport, serverSessionId };
}

export async function discoverMCPTools(
  clientWithTransport: MCPClientWithTransport,
) {
  return await clientWithTransport.client.tools();
}

export async function cleanupMCPClient(
  clientWithTransport: MCPClientWithTransport,
) {
  const { client, transport } = clientWithTransport;

  try {
    await transport.terminateSession();
  } catch (error) {
    console.error("Failed to terminate MCP session:", error);
  }

  await client.close();
}

export async function listMCPServerTools(
  clientWithTransport: MCPClientWithTransport,
): Promise<Array<{ name: string; description?: string }>> {
  const tools = await clientWithTransport.client.tools();

  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
  }));
}
