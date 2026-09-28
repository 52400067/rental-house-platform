import { expect, test } from "@playwright/test";

/**
 * Regression guard: the landlord contact card (`.sticky-top`) must always
 * stay BELOW the sticky navbar while scrolling.
 *
 * Bug: both elements are Bootstrap `.sticky-top` (z-index 1020). The card
 * stuck at `top: 1rem` slid up over the 57px navbar and, being later in the
 * DOM, painted on top of it. Fix: `top: calc(var(--navbar-h) + 1rem)`.
 *
 * The invariant is checked in REAL rendered geometry: the card's top edge
 * must always be >= the navbar's bottom edge, at every scroll depth.
 */
test.describe("room detail sticky contact card", () => {
    test("card stays below the navbar at every scroll depth", async ({ page }) => {
        await page.goto("/rooms");

        await page.locator(".listing-card a").first().click();
        const card = page.locator(".sticky-top.card");
        const navbar = page.locator(".navbar");
        await expect(card).toBeVisible();
        await expect(navbar).toBeVisible();

        // Multiple depths: top, several middle positions, page bottom.
        for (const y of [0, 400, 1200, 3000, 99999]) {
            await page.evaluate((v) => window.scrollTo(0, v), y);
            // Sticky offset resolves within the same frame; a rAF wait keeps
            // the measurement deterministic.
            await page.evaluate(() => requestAnimationFrame(() => undefined));

            const nav = await navbar.boundingBox();
            const box = await card.boundingBox();
            if (!nav || !box) {
                throw new Error(`navbar/card off-viewport at scrollY=${y}`);
            }
            const navBottom = nav.y + nav.height;
            expect(box.y, `card must not overlap navbar at scrollY=${y}`).toBeGreaterThanOrEqual(
                navBottom - 1, // 1px tolerance for subpixel rounding
            );
        }
    });
});
