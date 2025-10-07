import {
  experimental_createMCPClient as createMCPClient_AI,
  type experimental_MCPClient as MCPClient,
} from "ai";

export type { MCPClient };

export interface MCPClientConfig {
  endpoint: string;
  accessToken?: string;
  sessionId?: string;
}

export async function createMCPClient(
  config: MCPClientConfig,
): Promise<MCPClient> {
  const client = await createMCPClient_AI({
    transport: {
      type: "sse",
      url: config.endpoint,
      ...(config.accessToken && {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      }),
    },
  });

  return client;
}

export async function discoverMCPTools(client: MCPClient) {
  return await client.tools();
}

export async function listMCPServerTools(
  client: MCPClient,
): Promise<Array<{ name: string; description?: string }>> {
  const tools = await client.tools();

  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
  }));
}

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export async function getMCPServerInfo(
  endpoint: string,
): Promise<MCPServerInfo | null> {
  try {
    const client = await createMCPClient({ endpoint });

    const serverInfo = {
      name: "Unknown",
      version: "0.0.0",
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
    };

    await client.close();

    return serverInfo;
  } catch (error) {
    console.error("Failed to get MCP server info:", error);
    return null;
  }
}
