# Scripts

## test-reasoning.ts

Manual test script to verify all reasoning-capable models are working correctly.

### Purpose

- Test reasoning functionality for OpenAI, Google Gemini, and Anthropic Claude
- Use minimal tokens (prompt: "1+1=?")
- Run manually when needed, **not part of CI/CD**

### Prerequisites

**Option 1: Using AI Gateway (Recommended - tests all models)**
```bash
export AI_GATEWAY_API_KEY="your-ai-gateway-key"
npm run test:reasoning
```

**Option 2: Test Google models only (no AI Gateway needed)**
```bash
# Ensure you have Google API key
export GOOGLE_API_KEY="your-google-key"
npm run test:reasoning
```

### Usage

```bash
npm run test:reasoning
```

### Features

- ✅ Auto-discovers all reasoning-capable models
- ✅ Uses "low" budget level (minimal cost)
- ✅ Shows test results, duration, and token usage per model
- ✅ Provides detailed summary report

### Test History

**2025-10-06** (zxzinn): All 15 models passed ✅

### Notes

- Requires appropriate API keys in environment variables
- Will incur minimal API costs (typically < $0.10)
- Recommended to run after major updates or periodically (e.g., monthly)

#### Model Exclusions

**o3-pro**: Not included as it requires Responses API and Tier 1-3 access with organization verification. Vercel AI Gateway doesn't currently support this model.
