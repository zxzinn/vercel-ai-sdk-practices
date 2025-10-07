import {
  experimental_createMCPClient as createMCPClient_AI,
  type experimental_MCPClient as MCPClient,
} from "ai";

export type { MCPClient };

export interface MCPClientConfig {
  endpoint: string;
  accessToken?: string;
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
