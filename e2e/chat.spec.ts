import { expect, test } from "@playwright/test";

test("send chat message", async ({ page }) => {
  await page.goto("http://localhost:3000/chat", {
    waitUntil: "networkidle",
  });

  const messageInput = page.getByPlaceholder("Type your message...");

  // Wait for the input to be stable and ready
  await messageInput.waitFor({ state: "visible" });
  await page.waitForTimeout(500);

  await messageInput.fill("Hi");
  await messageInput.press("Enter");

  // Verify the message appears in the chat area (not sidebar)
  await expect(page.getByRole("log").getByText("Hi")).toBeVisible();

  // Verify the input box is cleared
  await expect(messageInput).toHaveValue("");
});
