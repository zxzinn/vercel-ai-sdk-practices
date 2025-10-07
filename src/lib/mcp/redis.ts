import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.",
    );
  }

  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

export interface MCPConnectionState {
  id: string;
  name: string;
  endpoint: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

const MCP_CONNECTION_PREFIX = "mcp:connection:";
const MCP_CONNECTION_TTL = 3600 * 24 * 7;

export async function storeMCPConnection(
  sessionId: string,
  connection: MCPConnectionState,
): Promise<void> {
  const redis = getRedisClient();
  const key = `${MCP_CONNECTION_PREFIX}${sessionId}:${connection.id}`;

  await redis.setex(key, MCP_CONNECTION_TTL, JSON.stringify(connection));
}

export async function getMCPConnection(
  sessionId: string,
  connectionId: string,
): Promise<MCPConnectionState | null> {
  const redis = getRedisClient();
  const key = `${MCP_CONNECTION_PREFIX}${sessionId}:${connectionId}`;

  const data = await redis.get(key);
  if (!data) return null;

  if (typeof data === "string") {
    return JSON.parse(data) as MCPConnectionState;
  }

  return data as MCPConnectionState;
}

export async function listMCPConnections(
  sessionId: string,
): Promise<MCPConnectionState[]> {
  const redis = getRedisClient();
  const pattern = `${MCP_CONNECTION_PREFIX}${sessionId}:*`;

  const keys = await redis.keys(pattern);
  if (keys.length === 0) return [];

  const connections = await Promise.all(
    keys.map(async (key) => {
      const data = await redis.get(key);
      if (!data) return null;

      if (typeof data === "string") {
        return JSON.parse(data) as MCPConnectionState;
      }

      return data as MCPConnectionState;
    }),
  );

  return connections.filter(
    (conn): conn is MCPConnectionState => conn !== null,
  );
}

export async function deleteMCPConnection(
  sessionId: string,
  connectionId: string,
): Promise<void> {
  const redis = getRedisClient();
  const key = `${MCP_CONNECTION_PREFIX}${sessionId}:${connectionId}`;

  await redis.del(key);
}

export async function storeOAuthState(
  state: string,
  data: {
    sessionId: string;
    connectionId: string;
    endpoint: string;
    codeVerifier: string;
    clientId?: string;
  },
): Promise<void> {
  const redis = getRedisClient();
  const key = `oauth:state:${state}`;

  await redis.setex(key, 600, JSON.stringify(data));
}

export async function getOAuthState(state: string): Promise<{
  sessionId: string;
  connectionId: string;
  endpoint: string;
  codeVerifier: string;
  clientId?: string;
} | null> {
  const redis = getRedisClient();
  const key = `oauth:state:${state}`;

  const data = await redis.get(key);
  if (!data) return null;

  await redis.del(key);

  if (typeof data === "string") {
    return JSON.parse(data);
  }

  return data as {
    sessionId: string;
    connectionId: string;
    endpoint: string;
    codeVerifier: string;
    clientId?: string;
  };
}
