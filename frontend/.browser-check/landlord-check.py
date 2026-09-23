# Landlord "amber ink" verification: real login as landlord, checks the
# scoped styles compute correctly on /landlord and /landlord/new.
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("APP_URL", "http://localhost:5173")
EMAIL = os.environ.get("E2E_LANDLORD_EMAIL", "landlord1@example.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "password")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)
SHOTS = os.path.join(os.path.dirname(__file__), "shots") + "/"

issues = []


def check(name, cond, detail=""):
    print(("[OK] " if cond else "[XX] ") + name + (f" ({detail})" if detail else ""))
    if not cond:
        issues.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: errors.append(m.text)
        if m.type == "error" and "favicon" not in m.text.lower()
        else None,
    )

    # Login through the UI
    page.goto(BASE + "/login", wait_until="domcontentloaded")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url(BASE + "/", timeout=15000)

    # --- My listings ----------------------------------------------------
    page.goto(BASE + "/landlord", wait_until="networkidle")
    page.wait_for_selector(".listing-row", timeout=15000)

    cta = page.locator("a[href='/landlord/new'].btn-primary").first
    cta_bg = cta.evaluate("el => getComputedStyle(el).backgroundColor")
    check("CTA is ink (mono ledger)", cta_bg == "rgb(31, 30, 29)", cta_bg)

    cta_color = cta.evaluate("el => getComputedStyle(el).color")
    check("CTA text is white", cta_color == "rgb(255, 255, 255)", cta_color)

    eyebrow = page.locator(".landlord-heading").first.evaluate(
        "el => getComputedStyle(el, '::before').content"
    )
    check("heading eyebrow present", "CHỦ TRỌ" in eyebrow, eyebrow)

    row = page.locator(".listing-row").first
    row_bg_before = row.evaluate("el => getComputedStyle(el).backgroundColor")
    row.hover()
    page.wait_for_timeout(250)
    row_bg_after = row.evaluate("el => getComputedStyle(el).backgroundColor")
    check(
        "row hover inks manilla",
        row_bg_before != row_bg_after and row_bg_after == "rgb(245, 237, 216)",
        f"{row_bg_before} -> {row_bg_after}",
    )

    status_select = row.locator("select").first
    check(
        "status select exists (row controls intact)",
        status_select.count() == 1,
    )
    page.screenshot(path=SHOTS + "landlord-mylistings.png", full_page=True)

    # --- New listing form -------------------------------------------------
    page.goto(BASE + "/landlord/new", wait_until="networkidle")
    card = page.locator("form.card").first
    tab_bg = card.evaluate(
        "el => getComputedStyle(el, '::before').backgroundColor"
    )
    check("form card has gold folder tab", tab_bg == "rgb(217, 119, 6)", tab_bg)

    first_input = page.locator("form.card input.form-control").first
    first_input.focus()
    page.wait_for_timeout(150)
    shadow = first_input.evaluate("el => getComputedStyle(el).boxShadow")
    check("focus ring is ink", "31, 30, 29" in shadow, shadow[:60])

    ai_btn = page.locator("button:has-text('Viết mô tả giúp tôi')").first
    ai_color = ai_btn.evaluate("el => getComputedStyle(el).color")
    check("AI button text is ink", "31, 30, 29" in ai_color, ai_color)
    page.screenshot(path=SHOTS + "landlord-form.png", full_page=True)

    real_errors = [
        e for e in errors if "favicon" not in e.lower() and "404" not in e
    ]
    check("console clean", not real_errors, str(real_errors[:3]))

    browser.close()

print()
print("==== SUMMARY ====")
if issues:
    for i in issues:
        print(" -", i)
    sys.exit(1)
print("LANDLORD AMBER CHECKS PASS")
