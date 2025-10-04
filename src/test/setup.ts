import "@testing-library/jest-dom";

// Skip environment validation in tests
process.env.SKIP_ENV_VALIDATION = "1";

// Set minimal test environment variables
process.env.NODE_ENV = "test";
process.env.CHROMA_URL = "http://localhost:8000";
