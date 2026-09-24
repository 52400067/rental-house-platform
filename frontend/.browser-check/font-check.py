# Font verification: Space Grotesk is the single family (Positivus style).
# Weight contrast (500 body / 700 display) carries the hierarchy.
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("APP_URL", "http://localhost:5173")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)
SHOTS = os.path.join(os.path.dirname(__file__), "shots") + "/"

FAM = "Space Grotesk Variable"

issues = []


def check(name, cond, detail=""):
    print(("[OK] " if cond else "[XX] ") + name + (f" ({detail})" if detail else ""))
    if not cond:
        issues.append(name)


def family_of(page, sel):
    return page.locator(sel).first.evaluate("el => getComputedStyle(el).fontFamily")


def starts(page, sel, family):
    fam = family_of(page, sel)
    return fam.split(",")[0].strip().strip('"') == family, fam


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # Fonts actually registered by the browser.
    page.goto(BASE + "/", wait_until="networkidle")
    fams = page.evaluate("""async () => {
        await document.fonts.ready;
        const names = new Set();
        document.fonts.forEach((f) => names.add(f.family));
        return [...names];
    }""")
    check(f"{FAM} loaded", FAM in fams, str(fams))
    old_left = [
        f for f in fams
        if any(o in f for o in ("Be Vietnam", "Bricolage", "Plex Mono", "Noto Sans", "Noto Serif",
                                "Space Grotesk Medium", "Archivo", "Literata", "Source Serif"))
    ]
    check("superseded fonts fully removed", not old_left, str(old_left))

    # Whole site is one family
    ok, fam = starts(page, "body", FAM)
    check("body is Space Grotesk", ok, fam[:60])
    ok, fam = starts(page, "h1", FAM)
    check("h1 is Space Grotesk", ok, fam[:60])
    ok, fam = starts(page, ".navbar .navbar-brand", FAM)
    check("navbar brand is Space Grotesk", ok, fam[:60])

    # Weight contrast: display 700, body 500, card titles 700
    h1_w = page.locator("h1").first.evaluate("el => getComputedStyle(el).fontWeight")
    check("h1 weight is 700", h1_w == "700", h1_w)
    body_w = page.evaluate("getComputedStyle(document.body).fontWeight")
    check("body weight is 500", body_w == "500", body_w)
    page.wait_for_selector(".listing-price", timeout=15000)
    price_w = page.locator(".listing-price").first.evaluate(
        "el => getComputedStyle(el).fontWeight"
    )
    check("price weight is 700", price_w == "700", price_w)

    # Vietnamese coverage in the single face
    coverage = page.evaluate("""() => ['ệ', 'ổ', 'ẫ', 'Ư', 'ễ', 'ở', 'ỡ'].map((c) =>
        document.fonts.check(`16px 'Space Grotesk Variable'`, c))""")
    check("vietnamese glyph coverage", all(coverage), str(coverage))

    # Room detail: title still Space Grotesk
    page.goto(BASE + "/rooms/1", wait_until="networkidle")
    ok, fam = starts(page, "h1", FAM)
    check("room h1 is Space Grotesk", ok, fam[:60])
    rh_w = page.locator("h1.h4").first.evaluate("el => getComputedStyle(el).fontWeight")
    check("room title (h1.h4) weight is 700", rh_w == "700", rh_w)

    page.goto(BASE + "/", wait_until="networkidle")
    page.screenshot(path=SHOTS + "fonts-home.png", full_page=False)

    check("no page errors", not errors, str(errors[:2]))
    browser.close()

print()
print("==== SUMMARY ====")
if issues:
    for i in issues:
        print(" -", i)
    sys.exit(1)
print("FONT CHECKS PASS")
