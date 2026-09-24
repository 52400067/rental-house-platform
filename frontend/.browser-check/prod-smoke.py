# Smoke the PRODUCTION build (vite preview) - validates the minified bundle.
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("PREVIEW_URL", "http://localhost:4173")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)
SHOTS = os.path.join(os.path.dirname(__file__), "shots") + "/"

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
        "response",
        lambda r: errors.append(f"{r.status} {r.url}")
        if r.status >= 400
        else None,
    )

    page.goto(BASE + "/", wait_until="networkidle")
    h1 = (page.locator("h1").first.text_content() or "").strip()
    cards = page.locator(".listing-card").count()
    font_loaded = page.evaluate("document.fonts.check(\"16px 'Noto Sans Variable'\")")
    serif_loaded = page.evaluate("document.fonts.check(\"16px 'Noto Serif Variable'\")")

    page.goto(BASE + "/rooms", wait_until="networkidle")
    rooms_cards = page.locator(".listing-card").count()

    print("prod h1:", h1[:60])
    print("prod home cards:", cards, "| rooms cards:", rooms_cards)
    print("body font loaded:", font_loaded, "| serif prose loaded:", serif_loaded)
    print("console/page errors:", errors if errors else "clean")
    page.screenshot(path=SHOTS + "prod-home.png")
    browser.close()

    if not h1 or rooms_cards < 1:
        print("PROD SMOKE FAILED")
        sys.exit(1)
    favicon_only = errors and all("favicon" in e for e in errors)
    if errors and not favicon_only:
        print("PROD SMOKE FAILED:", errors)
        sys.exit(1)
    if favicon_only:
        print("(only favicon 404 - dev-only noise)")
    print("PROD SMOKE PASSED")
