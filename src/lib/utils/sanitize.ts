/**
 * Redact sensitive fields from vectorConfig before sending to client
 */
export function redactVectorConfig(
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config) return null;

  const redacted = { ...config };

  // Remove sensitive fields
  const sensitiveFields = ["token", "apiKey", "password", "secret"];

  for (const field of sensitiveFields) {
    if (field in redacted) {
      delete redacted[field];
    }
  }

  return redacted;
}

/**
 * Serialize space for API response (convert BigInt and redact secrets)
 */
export function serializeSpace<
  T extends { storageSize: bigint | string; vectorConfig: unknown },
>(
  space: T,
): Omit<T, "storageSize" | "vectorConfig"> & {
  storageSize: string;
  vectorConfig: Record<string, unknown> | null;
} {
  const { vectorConfig, storageSize, ...rest } = space;

  // Safely handle vectorConfig - it may be a string, object, or null from Prisma
  let config: Record<string, unknown> | null = null;
  if (
    vectorConfig &&
    typeof vectorConfig === "object" &&
    !Array.isArray(vectorConfig)
  ) {
    config = vectorConfig as Record<string, unknown>;
  }

  return {
    ...rest,
    storageSize:
      typeof storageSize === "bigint" ? storageSize.toString() : storageSize,
    vectorConfig: redactVectorConfig(config),
  };
}
