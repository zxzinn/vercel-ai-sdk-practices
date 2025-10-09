export function getSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const STORAGE_KEY = "mcp_session_id";
  let sessionId = sessionStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}
