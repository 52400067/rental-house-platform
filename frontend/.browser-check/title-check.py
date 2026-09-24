# Post-title ink verification: card titles + landlord row titles must
# read as ink (#1f1e1d), not link-rust; hover warms to book-cloth rust.
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

INK = "rgb(31, 30, 29)"
RUST_HOVER = "rgb(154, 70, 48)"  # --brand-dark #9a4630

issues = []


def check(name, cond, detail=""):
    print(("[OK] " if cond else "[XX] ") + name + (f" ({detail})" if detail else ""))
    if not cond:
        issues.append(name)


def color_of(page, sel):
    return page.locator(sel).first.evaluate("el => getComputedStyle(el).color")


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # --- Home: listing card titles ---------------------------------------
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_selector(".listing-card .card-title a", timeout=15000)
    check(
        "home card title is ink",
        color_of(page, ".listing-card .card-title a") == INK,
        color_of(page, ".listing-card .card-title a"),
    )

    # Hover affordance still works: title warms to rust
    title = page.locator(".listing-card .card-title a").first
    title.hover()
    page.wait_for_timeout(150)
    hover_color = title.evaluate("el => getComputedStyle(el).color")
    check("card title hover is rust", hover_color == RUST_HOVER, hover_color)

    # --- /rooms: card titles ---------------------------------------------
    page.goto(BASE + "/rooms", wait_until="networkidle")
    page.wait_for_selector(".listing-card .card-title a", timeout=15000)
    check(
        "rooms card title is ink",
        color_of(page, ".listing-card .card-title a") == INK,
        color_of(page, ".listing-card .card-title a"),
    )

    page.screenshot(path=SHOTS + "titles-rooms.png", full_page=False)

    # --- Landlord row titles ---------------------------------------------
    page.goto(BASE + "/login", wait_until="domcontentloaded")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url(BASE + "/", timeout=15000)

    page.goto(BASE + "/landlord", wait_until="networkidle")
    page.wait_for_selector(".listing-row a.fw-semibold", timeout=15000)
    check(
        "landlord row title is ink",
        color_of(page, ".listing-row a.fw-semibold") == INK,
        color_of(page, ".listing-row a.fw-semibold"),
    )

    page.screenshot(path=SHOTS + "titles-landlord.png", full_page=False)

    browser.close()

print()
print("==== SUMMARY ====")
if issues:
    for i in issues:
        print(" -", i)
    sys.exit(1)
print("TITLE INK CHECKS PASS")
