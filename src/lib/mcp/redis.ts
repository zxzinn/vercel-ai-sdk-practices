import { Redis } from "@upstash/redis";
import { z } from "zod";
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

// Zod schemas for runtime validation
const MCPConnectionStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  endpoint: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

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

  // Parse if string (for backwards compatibility or manual writes)
  const parsedData = typeof data === "string" ? JSON.parse(data) : data;

  // Validate data structure with Zod
  const validation = MCPConnectionStateSchema.safeParse(parsedData);
  if (!validation.success) {
    console.error(
      `Invalid MCP connection data in Redis for key ${key}:`,
      validation.error.issues,
    );
    // Return null instead of throwing to handle corrupted data gracefully
    return null;
  }

  return validation.data;
}

export async function listMCPConnections(
  sessionId: string,
): Promise<MCPConnectionState[]> {
  const redis = getRedisClient();
  const pattern = `${MCP_CONNECTION_PREFIX}${sessionId}:*`;

  // Use SCAN instead of KEYS to avoid blocking Redis
  // SCAN is cursor-based and non-blocking, suitable for production
  const allKeys: string[] = [];
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: pattern,
      count: 100, // Scan up to 100 keys per iteration
    });

    allKeys.push(...keys);
    cursor = nextCursor;
  } while (cursor !== "0");

  if (allKeys.length === 0) return [];

  const connections = await Promise.all(
    allKeys.map(async (key) => {
      const data = await redis.get(key);
      if (!data) return null;

      // Parse if string
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;

      // Validate data structure
      const validation = MCPConnectionStateSchema.safeParse(parsedData);
      if (!validation.success) {
        console.error(
          `Invalid MCP connection data in Redis for key ${key}:`,
          validation.error.issues,
        );
        return null;
      }

      return validation.data;
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

const OAuthStateDataSchema = z.object({
  sessionId: z.string(),
  connectionId: z.string(),
  connectionName: z.string(),
  endpoint: z.string(),
  codeVerifier: z.string(),
  clientId: z.string().optional(),
});

export interface OAuthStateData {
  sessionId: string;
  connectionId: string;
  connectionName: string;
  endpoint: string;
  codeVerifier: string;
  clientId?: string;
}

export async function storeOAuthState(
  state: string,
  data: OAuthStateData,
): Promise<void> {
  const redis = getRedisClient();
  const key = `oauth:state:${state}`;

  await redis.setex(key, 600, JSON.stringify(data));
}

export async function getOAuthState(
  state: string,
): Promise<OAuthStateData | null> {
  const redis = getRedisClient();
  const key = `oauth:state:${state}`;

  const data = await redis.get(key);
  if (!data) return null;

  // Delete state immediately (single-use token)
  await redis.del(key);

  // Parse if string
  const parsedData = typeof data === "string" ? JSON.parse(data) : data;

  // Validate data structure - OAuth state is critical for security
  const validation = OAuthStateDataSchema.safeParse(parsedData);
  if (!validation.success) {
    console.error(
      `Invalid OAuth state data in Redis for key ${key}:`,
      validation.error.issues,
    );
    // Throw error for OAuth state validation failure (security-critical)
    throw new Error(
      "Invalid OAuth state data - possible data corruption or tampering",
    );
  }

  return validation.data;
}
