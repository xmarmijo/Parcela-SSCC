import { test, expect } from "@playwright/test";

test("login page loads and shows form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /iniciar sesi/i })).toBeVisible();
  await expect(page.getByLabel(/correo o rut/i)).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});

test("login with invalid credentials shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/correo o rut/i).fill("noexiste@test.cl");
  await page.locator("#password").fill("wrongpassword");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page.getByText(/credenciales incorrectas/i)).toBeVisible({ timeout: 10000 });
});

test("login with valid admin credentials redirects", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/correo o rut/i).fill("miguel.armijo.n@gmail.com");
  await page.locator("#password").fill("ParcelaSSCC2026!");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await page.waitForURL(/\/(reservar|mis-reservas|familia)/, { timeout: 15000 });
});
