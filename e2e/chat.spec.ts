import { expect, test } from "@playwright/test";

test("send chat message", async ({ page }) => {
  await page.goto("http://localhost:3000/chat");
  await page.getByRole("textbox", { name: "Type your message..." }).click();
  await page.getByRole("textbox", { name: "Type your message..." }).fill("Hi");

  // 按 Enter 发送消息
  await page
    .getByRole("textbox", { name: "Type your message..." })
    .press("Enter");

  // 验证消息出现在页面上
  await expect(page.getByText("Hi")).toBeVisible();

  // 验证输入框被清空
  await expect(
    page.getByRole("textbox", { name: "Type your message..." }),
  ).toHaveValue("");
});
