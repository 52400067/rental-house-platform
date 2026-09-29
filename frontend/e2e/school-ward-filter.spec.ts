import { expect, test } from "@playwright/test";

/**
 * Regression guard: the school dropdown in the Rooms filter sidebar must
 * surface the school's ward (each uni is pinned to one ward) and the
 * "loc phong trong phuong nay" action must actually filter the listing
 * query by that ward.
 *
 * Asserted at the API layer (NOT by card text - ListingSeeder bakes ward
 * names into seeded titles, so text checks would pass vacuously): the
 * refetch triggered by the button must carry ward_id and return only
 * listings in that ward.
 */
test.describe("rooms school-ward filter", () => {
    test("school exposes its ward and filters listings by ward", async ({ page }) => {
        await page.goto("/rooms");

        const schoolSelect = page.locator("#filter-school");
        await expect(schoolSelect).toBeVisible();

        // VLU -> Phường Bình Lợi Trung. Ward id 19 on a fresh seed (rotation
        // in ListingSeeder assigns listings to wards 1..30 first), so this
        // ward reliably has seeded rooms.
        await schoolSelect.selectOption({ label: "VLU" });

        // Hint shows the school's ward + the one-click filter action.
        // Scoped to .form-text: a bare getByText would also match the ward
        // <option> inside the disabled "Khu vực" select earlier in the DOM.
        const wardHint = page
            .locator("div.form-text")
            .filter({ hasText: "Phường Bình Lợi Trung" });
        await expect(wardHint).toBeVisible();
        const wardButton = page.getByRole("button", {
            name: "- loc phong trong phuong nay",
        });
        await expect(wardButton).toBeVisible();

        // The ward dropdown lists the school's ward first, marked.
        const wardDropdown = page.locator("select.mt-2");
        await expect(wardDropdown).toBeVisible();
        await expect(
            wardDropdown.locator("option", { hasText: "(trường nằm đây)" }),
        ).toHaveCount(1);

        // Click = refetch with ward_id=19; response must contain ONLY
        // listings of that ward.
        const listingsResponse = page.waitForResponse(
            (r) => r.url().includes("/listings") && r.url().includes("ward_id=19"),
        );
        await wardButton.click();
        const res = await listingsResponse;
        const body = (await res.json()) as {
            data: Array<{ ward: { id: number; name: string } }>;
        };
        expect(body.data.length, "ward has seeded rooms").toBeGreaterThan(0);
        for (const listing of body.data) {
            expect(listing.ward?.id).toBe(19);
        }

        // UI: cards are rendered from that response.
        await expect(page.locator(".listing-card").first()).toBeVisible();

        // Reset clears the ward filter -> the action disappears.
        await page.getByRole("button", { name: "Đặt lại" }).click();
        await expect(wardButton).toBeHidden();
    });
});
