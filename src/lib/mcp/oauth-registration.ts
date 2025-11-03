import { z } from "zod";

const RegistrationResponseSchema = z.object({
  client_id: z.string(),
  client_secret: z.string().optional(),
});

export interface ClientRegistrationParams {
  registrationEndpoint: string;
  redirectUri: string;
  clientName?: string;
  clientUri?: string;
  apiKey?: string;
}

export interface ClientRegistrationResult {
  clientId: string;
  clientSecret?: string;
}

export async function registerOAuthClient(
  params: ClientRegistrationParams,
): Promise<ClientRegistrationResult> {
  const {
    registrationEndpoint,
    redirectUri,
    clientName = "Vercel AI MCP Client",
    clientUri,
    apiKey,
  } = params;

  const response = await fetch(registrationEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey && { "X-API-Key": apiKey }),
    },
    body: JSON.stringify({
      client_name: clientName,
      client_uri: clientUri,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Client registration failed: ${response.status} - ${errorText}`,
    );
  }

  const data = await response.json();
  const validation = RegistrationResponseSchema.safeParse(data);

  if (!validation.success) {
    throw new Error(
      `Invalid registration response: ${validation.error.message}`,
    );
  }

  return {
    clientId: validation.data.client_id,
    clientSecret: validation.data.client_secret,
  };
}
