import { test, expect } from "@playwright/test";

test("QR validation page shows invalid for bad token", async ({ page }) => {
  await page.goto("/validar/token-inexistente-123");
  await expect(page.getByText(/código qr inválido/i)).toBeVisible({ timeout: 10000 });
});

test("QR validation page shows valid for known token", async ({ page }) => {
  await page.goto("/validar/826427e8-137a-4a09-b3fa-384176e630b1");
  // This token was already used, so it should show "Ya Utilizado"
  await expect(page.getByText(/ya utilizado|pase validado/i)).toBeVisible({ timeout: 10000 });
});
