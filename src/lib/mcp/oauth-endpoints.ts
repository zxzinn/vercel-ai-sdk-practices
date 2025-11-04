import { z } from "zod";

const OAuthMetadataSchema = z.object({
  registration_endpoint: z.string().url().optional(),
  authorization_endpoint: z.string().url().optional(),
  token_endpoint: z.string().url().optional(),
  revocation_endpoint: z.string().url().optional(),
});

export interface OAuthEndpoints {
  registration: string;
  authorization: string;
  token: string;
}

export async function discoverOAuthEndpoints(
  baseUrl: string,
): Promise<OAuthEndpoints> {
  const wellKnownUrl = new URL(
    "/.well-known/oauth-authorization-server",
    baseUrl,
  ).toString();

  try {
    const response = await fetch(wellKnownUrl);

    if (response.ok) {
      const data = await response.json();
      const validation = OAuthMetadataSchema.safeParse(data);

      if (validation.success) {
        const metadata = validation.data;

        return {
          registration:
            metadata.registration_endpoint ||
            new URL("/register", baseUrl).toString(),
          authorization:
            metadata.authorization_endpoint ||
            new URL("/authorize", baseUrl).toString(),
          token:
            metadata.token_endpoint || new URL("/token", baseUrl).toString(),
        };
      }
    }
  } catch (error) {
    console.warn("OAuth metadata discovery failed:", error);
  }

  return {
    registration: new URL("/register", baseUrl).toString(),
    authorization: new URL("/authorize", baseUrl).toString(),
    token: new URL("/token", baseUrl).toString(),
  };
}
