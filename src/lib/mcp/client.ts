import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  experimental_createMCPClient as createMCPClient_AI,
  type experimental_MCPClient as MCPClient,
} from "ai";

export type { MCPClient };
export type { StreamableHTTPClientTransport };

export interface MCPClientConfig {
  endpoint: string;
  accessToken?: string;
  sessionId: string;
}

export interface MCPClientWithTransport {
  client: MCPClient;
  transport: StreamableHTTPClientTransport;
}

export async function createMCPClient(
  config: MCPClientConfig,
): Promise<MCPClientWithTransport> {
  const transport = new StreamableHTTPClientTransport(
    new URL(config.endpoint),
    {
      sessionId: config.sessionId,
      requestInit: config.accessToken
        ? {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
            },
          }
        : undefined,
    },
  );

  const client = await createMCPClient_AI({
    transport: transport,
    name: `mcp-client-${config.sessionId}`,
  });

  return { client, transport };
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
