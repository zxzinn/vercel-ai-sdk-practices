import { env } from "@/lib/env";

/**
 * Checks if Redis configuration is available for MCP features.
 * Throws a descriptive error if configuration is missing.
 *
 * This early validation ensures MCP endpoints fail fast with clear error messages
 * rather than allowing undefined credentials to reach the Upstash Redis client,
 * which would only warn at runtime and fail mysteriously during fetch operations.
 */
export function checkRedisConfig(): void {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new RedisConfigError(
      "MCP features require Redis configuration. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.",
    );
  }
}

/**
 * Custom error class for Redis configuration issues.
 * Allows API routes to distinguish configuration errors from other failures.
 */
export class RedisConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisConfigError";
  }
}

/**
 * Helper to create a consistent error response for Redis configuration issues.
 */
export function createRedisConfigErrorResponse() {
  return Response.json(
    {
      error: "MCP features are not configured",
      message:
        "Redis configuration is required for MCP features. Please contact your system administrator.",
      code: "REDIS_CONFIG_MISSING",
    },
    { status: 503 },
  );
}
