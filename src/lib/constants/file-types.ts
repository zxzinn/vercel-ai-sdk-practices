/**
 * Supported file types for RAG document ingestion
 */

export const SUPPORTED_TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".mdx",
  ".json",
  ".csv",
  ".xml",
  ".html",
  ".htm",
  ".yaml",
  ".yml",
  ".toml",
] as const;

export const SUPPORTED_TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/mdx",
  "application/json",
  "text/csv",
  "application/xml",
  "text/xml",
  "text/html",
  "application/xhtml+xml",
  "text/yaml",
  "application/x-yaml",
  "application/toml",
] as const;

export const SUPPORTED_EXTENSIONS_STRING = SUPPORTED_TEXT_EXTENSIONS.join(",");

export const SUPPORTED_EXTENSIONS_DISPLAY = SUPPORTED_TEXT_EXTENSIONS.map(
  (ext) => ext.slice(1).toUpperCase(),
).join(", ");

/**
 * Check if a file extension is supported for text-based RAG ingestion
 */
export function isSupportedTextFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  if (!ext) return false;
  return SUPPORTED_TEXT_EXTENSIONS.some((supported) =>
    supported.endsWith(`.${ext}`),
  );
}

/**
 * Check if a MIME type is supported for text-based RAG ingestion
 */
export function isSupportedTextMimeType(mimeType: string): boolean {
  return SUPPORTED_TEXT_MIME_TYPES.includes(
    mimeType as (typeof SUPPORTED_TEXT_MIME_TYPES)[number],
  );
}
