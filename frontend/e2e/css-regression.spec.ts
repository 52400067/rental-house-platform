import { expect, test } from "@playwright/test";

/**
 * CSS regression guard (TECH-DEBT #4 follow-up).
 *
 * The stylesheet split once dropped the .corner-fab shape; the selector-parity
 * script (scripts/check-css-parity.mjs) protects the source, this spec proves
 * the rendered result: the FAB family keeps its circular badge shape and the
 * back-to-top button activates on scroll.
 *
 * Runs guest-only against the seeded demo stack (E2E_BASE_URL, default :5173).
 */
test.describe("corner FAB family", () => {
    test("FAB keeps the circular 52px badge shape", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".corner-fab").first()).toBeAttached();

        const shape = await page
            .locator(".corner-fab")
            .first()
            .evaluate((el) => {
                const s = getComputedStyle(el);
                return { radius: s.borderRadius, width: s.width, height: s.height };
            });
        expect(shape.radius).toBe("50%");
        expect(shape.width).toBe("52px");
        expect(shape.height).toBe("52px");
    });

    test("back-to-top activates on scroll", async ({ page }) => {
        await page.goto("/");
        const fab = page.locator(".back-to-top");
        await expect(fab).toHaveCount(1);

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(fab).toHaveClass(/show/, { timeout: 5_000 });
    });
});
