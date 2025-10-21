import { expect, test } from "@playwright/test";

test.describe("New Conversation Flow", () => {
  test("should create new conversation and update URL when sending first message", async ({
    page,
  }) => {
    // Navigate to chat page
    await page.goto("/chat", { waitUntil: "networkidle" });

    // Verify we start at /chat without conversationId
    await expect(page).toHaveURL(/\/chat$/);

    // Find and fill message input
    const messageInput = page.getByPlaceholder("Type your message...");
    await messageInput.waitFor({ state: "visible" });
    await messageInput.fill("Test message for URL update");

    // Submit message
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify URL updates to include conversationId
    await expect(page).toHaveURL(/\/chat\?id=conv_\d+_[a-z0-9]+/, {
      timeout: 5000,
    });

    // Verify message appears in chat area (not sidebar) and doesn't disappear
    await expect(
      page.getByRole("log").getByText("Test message for URL update"),
    ).toBeVisible({ timeout: 10000 });

    // Wait a bit to ensure message doesn't disappear
    await page.waitForTimeout(1000);
    await expect(
      page.getByRole("log").getByText("Test message for URL update"),
    ).toBeVisible();
  });

  test("should clear chat when clicking New Chat button", async ({ page }) => {
    // Navigate to chat and send a message
    await page.goto("/chat", { waitUntil: "networkidle" });

    const messageInput = page.getByPlaceholder("Type your message...");
    await messageInput.waitFor({ state: "visible" });
    await messageInput.fill("Message to be cleared");
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait for URL to update (conversation created)
    await expect(page).toHaveURL(/\/chat\?id=conv_\d+_[a-z0-9]+/, {
      timeout: 5000,
    });

    // Verify message is visible in chat area
    await expect(
      page.getByRole("log").getByText("Message to be cleared"),
    ).toBeVisible({ timeout: 10000 });

    // Click "New Chat" button
    await page.getByRole("button", { name: "New chat" }).click();

    // Verify URL changes back to /chat
    await expect(page).toHaveURL(/\/chat$/);

    // Verify message is cleared in chat area (should not be visible anymore)
    await expect(
      page.getByRole("log").getByText("Message to be cleared"),
    ).not.toBeVisible();

    // Verify input is ready for new message
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toHaveValue("");
  });

  test("should maintain first message after AI responds", async ({ page }) => {
    // Navigate to chat page
    await page.goto("/chat", { waitUntil: "networkidle" });

    const messageInput = page.getByPlaceholder("Type your message...");
    await messageInput.waitFor({ state: "visible" });

    const testMessage = "First message should not disappear";
    await messageInput.fill(testMessage);
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify URL updates
    await expect(page).toHaveURL(/\/chat\?id=conv_\d+_[a-z0-9]+/, {
      timeout: 5000,
    });

    // Verify user message is visible in chat area
    await expect(page.getByRole("log").getByText(testMessage)).toBeVisible({
      timeout: 10000,
    });

    // Wait for AI response to start (look for thinking/loader indicator)
    // This ensures we're testing the message persistence during AI response
    await page.waitForTimeout(2000);

    // Verify user message is still visible after AI starts responding
    await expect(page.getByRole("log").getByText(testMessage)).toBeVisible();
  });

  test("complete workflow: new chat -> send message -> new chat again", async ({
    page,
  }) => {
    // Start at chat page
    await page.goto("/chat", { waitUntil: "networkidle" });
    const messageInput = page.getByPlaceholder("Type your message...");

    // Send first message
    await messageInput.fill("First conversation message");
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait for conversation to be created
    await expect(page).toHaveURL(/\/chat\?id=conv_\d+_[a-z0-9]+/, {
      timeout: 5000,
    });
    const firstConversationUrl = page.url();

    // Verify first message is visible in chat area
    await expect(
      page.getByRole("log").getByText("First conversation message"),
    ).toBeVisible({ timeout: 10000 });

    // Click New Chat
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(
      page.getByRole("log").getByText("First conversation message"),
    ).not.toBeVisible();

    // Send second message in new conversation
    await messageInput.fill("Second conversation message");
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait for new conversation to be created
    await expect(page).toHaveURL(/\/chat\?id=conv_\d+_[a-z0-9]+/, {
      timeout: 5000,
    });
    const secondConversationUrl = page.url();

    // Verify we have a different conversation
    expect(firstConversationUrl).not.toBe(secondConversationUrl);

    // Verify second message is visible in chat area and first is not
    await expect(
      page.getByRole("log").getByText("Second conversation message"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("log").getByText("First conversation message"),
    ).not.toBeVisible();
  });
});
