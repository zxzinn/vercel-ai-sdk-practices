import { z } from "zod";

const envSchema = z
  .object({
    // AI Gateway authentication
    AI_GATEWAY_API_KEY: z.string().optional(),
    VERCEL_OIDC_TOKEN: z.string().optional(),

    // OpenAI (fallback if not using AI Gateway)
    OPENAI_API_KEY: z.string().optional(),

    // Web search providers
    TAVILY_API_KEY: z.string().optional(),
    EXA_API_KEY: z.string().optional(),

    // RAG - Vector store
    CHROMA_URL: z.string().optional().default("http://localhost:8000"),

    // Node environment
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    // Vercel environment
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  })
  .refine(
    (data) => {
      // At least one authentication method must be provided
      return (
        data.AI_GATEWAY_API_KEY || data.VERCEL_OIDC_TOKEN || data.OPENAI_API_KEY
      );
    },
    {
      message:
        "At least one API key must be provided: AI_GATEWAY_API_KEY, VERCEL_OIDC_TOKEN, or OPENAI_API_KEY",
    },
  );

function validateEnv() {
  // Skip validation during build or when explicitly disabled
  const shouldSkip = process.env.SKIP_ENV_VALIDATION === "1";

  if (shouldSkip) {
    console.warn("⚠️  Environment validation skipped");
    return process.env as z.infer<typeof envSchema>;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
