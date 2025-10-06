#!/usr/bin/env tsx

/**
 * Manual Reasoning Test Script
 *
 * Usage: npx tsx scripts/test-reasoning.ts
 *
 * Tests all models with reasoning capability using minimal tokens.
 * Only runs when manually executed - not part of CI/CD.
 *
 * Requirements:
 * - Set AI_GATEWAY_API_KEY environment variable
 * - Or install individual provider SDKs (@ai-sdk/openai, @ai-sdk/anthropic)
 */

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getAllModels } from "../src/lib/providers/loader";
import { getReasoningConfig } from "../src/lib/reasoning-support";

// Check for AI Gateway configuration
const hasAIGateway =
  !!process.env.AI_GATEWAY_API_KEY || !!process.env.VERCEL_OIDC_TOKEN;

// Only Google SDK is installed, others require AI Gateway
const PROVIDER_SDK_MAP: Record<string, any> = {
  google,
};

const TEST_PROMPT = "1+1=?";

interface TestResult {
  modelId: string;
  success: boolean;
  error?: string;
  tokens?: {
    prompt: number | undefined;
    completion: number | undefined;
    reasoning?: number;
  };
  duration?: number;
}

async function testModel(modelId: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const allModels = getAllModels();
    const reasoningConfig = getReasoningConfig(modelId, allModels, true, "low");

    if (!reasoningConfig) {
      return {
        modelId,
        success: false,
        error: "No reasoning support",
      };
    }

    // Extract provider name
    const [providerName, modelName] = modelId.split("/");

    // Check if we can test this model
    if (!hasAIGateway && !PROVIDER_SDK_MAP[providerName]) {
      return {
        modelId,
        success: false,
        error: `Skipped: No AI Gateway and ${providerName} SDK not installed`,
      };
    }

    // Use AI Gateway (string ID) or provider SDK
    const model = hasAIGateway
      ? modelId
      : PROVIDER_SDK_MAP[providerName](modelName);

    const result = await generateText({
      model,
      prompt: TEST_PROMPT,
      providerOptions: reasoningConfig,
    });

    const duration = Date.now() - startTime;

    return {
      modelId,
      success: true,
      tokens: {
        prompt: result.usage.inputTokens,
        completion: result.usage.outputTokens,
        reasoning: (result.usage as any).reasoningTokens,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      modelId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

async function main() {
  console.log("🧪 Reasoning Test Script");
  console.log("========================\n");

  if (!hasAIGateway) {
    console.log("⚠️  AI Gateway not configured");
    console.log("   Only Google models will be tested");
    console.log(
      "   To test all models, set AI_GATEWAY_API_KEY environment variable\n",
    );
  }

  console.log(`Test prompt: "${TEST_PROMPT}"`);
  console.log(`Budget level: low\n`);

  const allModels = getAllModels();
  const reasoningModels = allModels.filter((m) => m.reasoning);

  console.log(
    `Found ${reasoningModels.length} models with reasoning support:\n`,
  );

  const results: TestResult[] = [];

  for (const model of reasoningModels) {
    process.stdout.write(`Testing ${model.id}... `);
    const result = await testModel(model.id);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.duration}ms`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  console.log("\n📊 Summary");
  console.log("==========\n");

  const successful = results.filter((r) => r.success);
  const skipped = results.filter(
    (r) => !r.success && r.error?.startsWith("Skipped"),
  );
  const failed = results.filter(
    (r) => !r.success && !r.error?.startsWith("Skipped"),
  );

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`⏭️  Skipped: ${skipped.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    const totalTokens = successful.reduce(
      (sum, r) => sum + (r.tokens?.prompt || 0) + (r.tokens?.completion || 0),
      0,
    );
    const totalDuration = successful.reduce(
      (sum, r) => sum + (r.duration || 0),
      0,
    );
    console.log(`\n💰 Total tokens used: ${totalTokens}`);
    console.log(
      `⏱️  Average duration: ${Math.round(totalDuration / successful.length)}ms`,
    );
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed Models:");
    failed.forEach((r) => {
      console.log(`  - ${r.modelId}: ${r.error}`);
    });
  }

  if (skipped.length > 0 && !hasAIGateway) {
    console.log("\n💡 Tip: Set AI_GATEWAY_API_KEY to test all models");
  }

  console.log("\n✨ Test complete!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
