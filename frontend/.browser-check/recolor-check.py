# Recolor verification: dark navbar/footer, emerald accent, icon-only
# search button, ink-on-emerald text, amber landlord scope untouched.
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("APP_URL", "http://localhost:5173")
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

    page.goto(BASE + "/", wait_until="networkidle")

    # Dark navbar
    nav_bg = page.locator(".navbar").evaluate("el => getComputedStyle(el).backgroundColor")
    check("navbar is navy-black", "25, 26, 35" in nav_bg, nav_bg)

    nav_link = page.locator(".navbar .nav-link").first
    link_color = nav_link.evaluate("el => getComputedStyle(el).color")
    # First link may be active (white) or resting (light lilac) depending
    # on the current route - both are correct dark-bar states.
    check(
        "nav links are light",
        link_color in ("rgb(245, 245, 242)", "rgb(255, 255, 255)"),
        link_color,
    )

    # Hairline dividers between nav items
    second_item = page.locator(".navbar .nav-item").nth(1)
    sep = second_item.evaluate("el => getComputedStyle(el).borderLeftWidth")
    check("nav divider present", sep == "1px", sep)

    # Icon-only search button: emerald cap, no text
    btn = page.locator(".hero-search .btn-search-icon")
    check("icon-only search button exists", btn.count() == 1)
    btn_bg = btn.evaluate("el => getComputedStyle(el).backgroundColor")
    check("search cap is lime", btn_bg == "rgb(185, 255, 102)", btn_bg)
    btn_w = btn.evaluate("el => el.getBoundingClientRect().width")
    check("search cap is compact", 50 <= btn_w <= 70, f"{btn_w}px")
    btn_txt = (btn.text_content() or "").strip()
    check("no 'Tìm kiếm' text on button", btn_txt == "", repr(btn_txt))
    # The pill is ONE element now: the form owns radius + border + shadow,
    # the cap is clipped by it (no radius of its own).
    form_radius = page.locator(".hero-search").first.evaluate(
        "el => getComputedStyle(el).borderTopLeftRadius"
    )
    check("pill is one rounded element", form_radius == "20px", form_radius)
    cap_border = btn.evaluate("el => getComputedStyle(el).borderLeftColor")
    check("cap has ink divider", cap_border == "rgb(25, 26, 35)", cap_border)

    # Dark footer
    page.locator("footer").scroll_into_view_if_needed()
    footer_bg = page.locator("footer").evaluate("el => getComputedStyle(el).backgroundColor")
    check("footer is navy-black", footer_bg == "rgb(25, 26, 35)", footer_bg)

    # Emerald active-nav underline
    page.goto(BASE + "/rooms", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    underline = page.locator(".navbar .nav-link.active").first.evaluate(
        "el => getComputedStyle(el, '::after').backgroundColor"
    )
    check("active underline lime", underline == "rgb(185, 255, 102)", underline)

    page.goto(BASE + "/", wait_until="networkidle")
    page.screenshot(path=SHOTS + "recolor-home.png", full_page=True)

    check("no page errors", not errors, str(errors[:2]))
    browser.close()

print()
print("==== SUMMARY ====")
if issues:
    for i in issues:
        print(" -", i)
    sys.exit(1)
print("RECOLOR CHECKS PASS")
