export interface BuiltInMCPConnector {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon?: string;
  requiresApiKey?: boolean;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  docsUrl?: string;
}

export const BUILT_IN_MCP_CONNECTORS: BuiltInMCPConnector[] = [
  {
    id: "sentry",
    name: "Sentry",
    description:
      "Connect to Sentry for error tracking, issue management, and performance monitoring",
    endpoint: "https://mcp.sentry.dev/mcp",
    icon: "🔍",
    requiresApiKey: false,
    docsUrl: "https://docs.sentry.io/product/sentry-mcp/",
  },
];
