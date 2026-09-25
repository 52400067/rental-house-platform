import { expect, test } from "@playwright/test";

// Seeded demo account (deploy.sh seed output). Kept in sync with the docs.
const STUDENT = { email: "student1@example.com", password: "password" };

test.describe("smoke", () => {
    test("guests can browse the home feed without logging in", async ({ page }) => {
        await page.goto("/");

        // Guests browse freely; the hero section is the stable landmark.
        await expect(page.locator(".hero-section")).toBeVisible();
    });

    test("seeded student can log in and see the app", async ({ page }) => {
        await page.goto("/login");

        await page.getByPlaceholder("nhap@email.com").fill(STUDENT.email);
        await page.locator('input[type="password"]').fill(STUDENT.password);
        await page.locator('button[type="submit"]').click();

        // Successful login lands on the home feed.
        await expect(page).toHaveURL(/\/($|\?)/, { timeout: 10_000 });
        await expect(page.locator("header, nav").first()).toBeVisible();
    });

    test("guests hitting a protected route get bounced to login", async ({ page }) => {
        await page.goto("/favorites");
        await expect(page).toHaveURL(/\/login/);
    });
});
