import { expect, test } from "@playwright/test";

/**
 * Regression guard: the user dropdown in the navbar (Hồ sơ / Phòng yêu
 * thích / Đăng xuất) must paint ABOVE the sticky landlord contact card
 * on RoomDetail.
 *
 * Bug: .navbar is .sticky-top (Bootstrap z-index 1020) and therefore a
 * stacking context - its whole subtree, including the .dropdown-menu,
 * competed at layer 1020. The contact card (.sticky-top.card, also
 * 1020, later in the DOM) painted over the open menu. Fix: explicit
 * z-index: var(--z-chrome) (1045) on .navbar in chrome.css; the menu
 * inherits the navbar's layer, so its own Bootstrap z-index (1000)
 * never matters against elements outside the navbar.
 *
 * The menu's rectangle intentionally OVERLAPS the card's rectangle
 * (right-aligned dropdown over the right-column card) - what matters is
 * paint order, probed with document.elementFromPoint: at every sampled
 * point inside the open menu, the topmost element must belong to the
 * menu (that is what a user's click would hit).
 */
test.describe("navbar user dropdown", () => {
    test("open menu paints above the sticky contact card", async ({ page }) => {
        // Login as the seeded student (the user button only renders when
        // logged in).
        await page.goto("/login");
        await page.locator("#login-email").fill("student1@example.com");
        await page.locator("#login-password").fill("password");
        await page.getByRole("button", { name: "Đăng nhập" }).click();
        await expect(page.locator(".navbar .dropdown-toggle")).toBeVisible();

        // RoomDetail is where the sticky contact card lives.
        await page.goto("/rooms");
        await page.locator(".listing-card a").first().click();
        const card = page.locator(".sticky-top.card");
        const navbar = page.locator(".navbar");
        const menu = page.locator(".navbar .dropdown-menu");
        await expect(card).toBeVisible();

        // Open the user menu.
        await page.locator(".navbar .dropdown-toggle").click();
        await expect(menu).toBeVisible();
        await expect(menu).toContainText("Đăng xuất");

        // Paint-order precondition: the navbar's stacking context must sit
        // above the card's (both are positioned siblings in the root
        // context, so this comparison IS the paint order).
        const navZ = Number(await navbar.evaluate((el) => getComputedStyle(el).zIndex));
        const cardZ = Number(await card.evaluate((el) => getComputedStyle(el).zIndex));
        expect(navZ, "navbar must carry the chrome layer").toBeGreaterThanOrEqual(1045);
        expect(navZ, "navbar layer must beat the card layer").toBeGreaterThan(cardZ);

        const nav = await navbar.boundingBox();
        const box = await menu.boundingBox();
        if (!nav || !box) {
            throw new Error("navbar/menu off-viewport");
        }
        const menuBottom = box.y + box.height;

        // The dropdown opens under the bar: its bottom edge clears the
        // navbar (guards the inverse bug, menu sliding under the navbar).
        expect(menuBottom, "menu must render below the navbar").toBeGreaterThanOrEqual(
            nav.y + nav.height - 1, // 1px tolerance for subpixel rounding
        );

        // Behavioral probe: at sampled points inside the open menu
        // (inset past the rounded corners), the topmost paintable element
        // must be the menu or one of its children. Before the fix this
        // returned the contact card in the overlap region.
        const covered = await page.evaluate(
            (pts) => {
                const menuEl = document.querySelector(".navbar .dropdown-menu");
                if (!menuEl) return ["menu not in DOM"];
                const hits: string[] = [];
                for (const p of pts) {
                    if (p.x < 0 || p.y < 0) continue;
                    if (p.x > window.innerWidth || p.y > window.innerHeight) continue;
                    const el = document.elementFromPoint(p.x, p.y);
                    if (!el) {
                        hits.push(`nothing at ${p.x},${p.y}`);
                    } else if (el !== menuEl && !menuEl.contains(el)) {
                        hits.push(`${el.tagName}.${el.className} at ${p.x},${p.y}`);
                    }
                }
                return hits;
            },
            [
                { x: box.x + box.width / 2, y: box.y + box.height / 2 },
                { x: box.x + 8, y: box.y + 8 },
                { x: box.x + box.width - 8, y: box.y + 8 },
                { x: box.x + 8, y: menuBottom - 8 },
                { x: box.x + box.width - 8, y: menuBottom - 8 },
            ],
        );
        expect(
            covered,
            `menu must be topmost at every sampled point (covered by: ${covered.join("; ")})`,
        ).toEqual([]);
    });
});
