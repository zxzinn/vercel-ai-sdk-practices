import "@testing-library/jest-dom";

// Skip environment validation in tests
process.env.SKIP_ENV_VALIDATION = "1";

// Set minimal test environment variables (using type assertion for readonly properties)
if (!process.env.CHROMA_URL) {
  (process.env as any).CHROMA_URL = "http://localhost:8000";
}
