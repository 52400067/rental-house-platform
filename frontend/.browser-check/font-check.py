# Font verification: Noto Sans (sans) for chrome, Noto Serif (serif) for
# headings + prose; all superseded fonts fully gone from the bundle.
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("APP_URL", "http://localhost:5173")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)
SHOTS = os.path.join(os.path.dirname(__file__), "shots") + "/"

SANS = "Noto Sans Variable"
SERIF = "Noto Serif Variable"

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

    # Fonts actually registered by the browser. NOTE: document.fonts.check()
    # returns vacuous true for unknown families, so we enumerate the real
    # @font-face set instead - it cannot lie.
    page.goto(BASE + "/", wait_until="networkidle")
    fams = page.evaluate("""async () => {
        await document.fonts.ready;
        const names = new Set();
        document.fonts.forEach((f) => names.add(f.family));
        return [...names];
    }""")
    check(f"{SANS} loaded", SANS in fams, str(fams))
    check(f"{SERIF} loaded", SERIF in fams)
    old_left = [
        f for f in fams
        if any(o in f for o in ("Be Vietnam", "Bricolage", "Plex Mono", "Space Grotesk", "Source Serif", "Archivo", "Literata"))
    ]
    check("superseded fonts fully removed", not old_left, str(old_left))

    # Body & UI chrome = sans
    ok, fam = starts(page, "body", SANS)
    check("body is Noto Sans (sans)", ok, fam[:60])
    ok, fam = starts(page, ".navbar .navbar-brand", SANS)
    check("navbar brand is sans", ok, fam[:60])

    # Large headings = serif editorial
    ok, fam = starts(page, "h1", SERIF)
    check("h1 is Noto Serif (serif)", ok, fam[:60])
    h1_w = page.locator("h1").first.evaluate("el => getComputedStyle(el).fontWeight")
    check("h1 weight eased below bold (560)", h1_w == "560", h1_w)

    # Prices & small chrome: sans, no mono
    page.wait_for_selector(".listing-price", timeout=15000)
    ok, fam = starts(page, ".listing-price", SANS)
    check("listing price is sans (mono removed)", ok, fam[:60])

    ok, fam = starts(page, ".hero-search", SANS)
    check("hero search chrome is sans", ok, fam[:60])

    # Hero lead = serif prose
    lead = page.locator("p.lead").first
    lead_fam = lead.evaluate("el => getComputedStyle(el).fontFamily")
    check("hero lead is serif prose", SERIF in lead_fam, lead_fam[:60])

    # Vietnamese coverage: fonts.check() with real diacritic chars proves the
    # loaded webfont face covers them. Width comparison uses DejaVu as the
    # fallback because Fedora ships system Noto fonts (same metrics), which
    # would make a Noto-vs-Noto comparison vacuous.
    coverage = page.evaluate("""() => ({
        sans: ['ệ', 'ổ', 'ẫ', 'Ư'].map((c) =>
            document.fonts.check(`16px 'Noto Sans Variable'`, c)),
        serif: ['ệ', 'ễ', 'ở', ' ỡ'].map((c) =>
            document.fonts.check(`16px 'Noto Serif Variable'`, c)),
    })""")
    check(
        "vietnamese glyph coverage (sans)",
        all(coverage["sans"]),
        str(coverage["sans"]),
    )
    check(
        "vietnamese glyph coverage (serif)",
        all(coverage["serif"]),
        str(coverage["serif"]),
    )
    diacritics_sans = page.evaluate("""() => {
        const mk = (ff) => {
            const s = document.createElement('span');
            s.style.cssText = `position:absolute;visibility:hidden;font:16px ${ff}`;
            s.textContent = 'Tiêu đề phòng trọ ưới - đo chữ có dấu ệ ổ ẫ';
            document.body.appendChild(s);
            const w = s.getBoundingClientRect().width;
            s.remove();
            return w;
        };
        return {
            webfont: mk(`'Noto Sans Variable'`),
            fallback: mk(`'DejaVu Sans', sans-serif`),
        };
    }""")
    check(
        "vietnamese glyphs measured from webfont (sans)",
        abs(diacritics_sans["webfont"] - diacritics_sans["fallback"]) > 0.5,
        f"{diacritics_sans['webfont']:.1f} vs {diacritics_sans['fallback']:.1f}",
    )
    diacritics_serif = page.evaluate("""() => {
        const mk = (ff) => {
            const s = document.createElement('span');
            s.style.cssText = `position:absolute;visibility:hidden;font:16px ${ff}`;
            s.textContent = 'Mô tả chi tiết: phòng trọ ễ nhỏ gọn near trường';
            document.body.appendChild(s);
            const w = s.getBoundingClientRect().width;
            s.remove();
            return w;
        };
        return {
            webfont: mk(`'Noto Serif Variable'`),
            fallback: mk(`'DejaVu Serif', serif`),
        };
    }""")
    check(
        "vietnamese glyphs measured from webfont (serif)",
        abs(diacritics_serif["webfont"] - diacritics_serif["fallback"]) > 0.5,
        f"{diacritics_serif['webfont']:.1f} vs {diacritics_serif['fallback']:.1f}",
    )

    # Room detail: description prose serif, big heading serif
    page.goto(BASE + "/rooms/1", wait_until="networkidle")
    page.wait_for_selector(".prose, h1", timeout=15000)
    h1_ok, h1_fam = starts(page, "h1", SERIF)
    check("room h1 is serif", h1_ok, h1_fam[:60])
    if page.locator(".prose").count() > 0:
        ok, fam = starts(page, ".prose", SERIF)
        check("room description is serif", ok, fam[:60])
    else:
        check("room description is serif", False, "no .prose element found")
    rh_w = page.locator("h1").first.evaluate("el => getComputedStyle(el).fontWeight")
    check("rooms page h1 weight eased (560)", rh_w == "560", rh_w)

    # Auth visual quote = serif
    page.goto(BASE + "/login", wait_until="networkidle")
    q = page.locator(".auth-visual h2")
    if q.count() > 0:
        q_fam = q.first.evaluate("el => getComputedStyle(el).fontFamily")
        check("auth visual heading is serif", SERIF in q_fam, q_fam[:60])

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
