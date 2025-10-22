export function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : "";
  const baseName =
    lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const sanitizedExtension = extension.replace(/[^a-zA-Z0-9.]/g, "");

  return sanitizedBaseName + sanitizedExtension;
}
