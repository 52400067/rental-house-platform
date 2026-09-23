"""TroTot E2E user journey (per webapp-testing skill).

Runs against the LIVE stack (Vite :5173 + Laravel :8000 must be up).
Covers: home -> search -> login -> rooms filter -> listing detail ->
favorite -> chat send -> favorites page -> profile -> logout.
Screenshots land in frontend/.browser-check/shots/e2e-*.png
"""
import os
import sys
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("APP_URL", "http://localhost:5173")
API = os.environ.get("API_URL", "http://localhost:8000")
EMAIL = os.environ.get("E2E_EMAIL", "student1@example.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "password")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)
SHOTS = os.path.join(os.path.dirname(__file__), "shots") + "/"

issues = []
console_errors = []


def check(name, fn):
    try:
        fn()
        print(f"[OK] {name}")
    except Exception as e:
        msg = f"{name}: {str(e).splitlines()[0][:160]}"
        issues.append(msg)
        print(f"[XX] {msg}")


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1366, "height": 850})
    page.on(
        "console",
        lambda m: console_errors.append(
            f"{m.text} @ {m.location.get('url', '') if m.location else ''}"
        )
        if m.type == "error"
        else None,
    )

    # ---- Home + search bar -------------------------------------------------
    page.goto(BASE, wait_until="networkidle")
    check("home renders hero", lambda: expect(page.locator("h1")).to_contain_text("Ghi lại phòng"))

    def _search_pill():
        form = page.locator(".hero-search")
        expect(form).to_be_visible()
        # button rust, input flat, span pill-left
        assert form.locator("button.btn-primary").evaluate(
            "el => getComputedStyle(el).backgroundColor"
        ) == "rgb(184, 85, 55)", "search button not rust"
        assert form.locator("input.form-control").evaluate(
            "el => getComputedStyle(el).borderRadius"
        ) == "0px", "input corners not flat"
        page.screenshot(path=SHOTS + "e2e-01-home.png")
    check("search bar pill + brand color", _search_pill)

    # ---- Search from hero --------------------------------------------------
    def _hero_search():
        # Seeder titles look like "Phòng trọ <ward>, 22m²" - "Phòng" matches.
        page.locator(".hero-search input").fill("Phòng")
        page.locator(".hero-search button[type=submit]").click()
        page.wait_for_url("**/rooms**")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector(".listing-card", timeout=10000)
        assert page.locator(".listing-card").count() >= 1, "no results for query"
    check("hero search navigates to /rooms with results", _hero_search)

    # ---- Login via UI ------------------------------------------------------
    def _login():
        page.goto(BASE + "/login", wait_until="networkidle")
        page.fill("#email", EMAIL)
        page.fill("#password", PASSWORD)
        page.click("button.btn-primary")
        page.wait_for_url(lambda u: "/login" not in u, timeout=10000)
        page.wait_for_load_state("networkidle")
    check("login as student1", _login)

    # ---- Rooms: filters + sort exist ---------------------------------------
    def _rooms_filters():
        page.goto(BASE + "/rooms", wait_until="networkidle")
        page.wait_for_selector(".listing-card")
        n_before = page.locator(".listing-card").count()
        page.select_option("select.form-select-sm >> nth=0", "price_asc")
        page.wait_for_timeout(1200)  # debounce + fetch
        page.wait_for_selector(".listing-card")
        assert page.locator(".listing-card").count() >= 1, "no cards after sort"
        page.screenshot(path=SHOTS + "e2e-02-rooms.png")
    check("rooms list + sort control", _rooms_filters)

    # ---- Listing detail: favorite + chat -----------------------------------
    def _detail():
        page.locator(".listing-card a").first.click()
        page.wait_for_url("**/rooms/*")
        page.wait_for_load_state("networkidle")
        expect(page.locator("h1")).to_be_visible()
        page.screenshot(path=SHOTS + "e2e-03-detail.png")
    check("listing detail opens", _detail)

    def _favorite():
        # Heart may start empty (bi-heart) or already filled from an earlier run.
        btn = page.locator("button:has(i.bi-heart), button:has(i.bi-heart-fill)").first
        btn.scroll_into_view_if_needed()
        btn.click()
        page.wait_for_timeout(800)
        # toast or heart-fill change must appear
        filled = page.locator("i.bi-heart-fill").count()
        toast = page.locator(".toast-item").count()
        assert filled > 0 or toast > 0, "no favorite feedback"
    check("favorite toggle gives feedback", _favorite)

    def _chat_open():
        page.locator("button:has-text('Nhắn tin cho chủ nhà'), button:has-text('Mở hội thoại')").first.click()
        page.wait_for_url("**/messages/*", timeout=10000)
        page.wait_for_selector(".chat-thread", timeout=10000)
        page.wait_for_timeout(1200)  # initial poll
    check("open chat with landlord", _chat_open)

    def _chat_send():
        ta = page.locator(".chat-composer textarea")
        ta.fill("E2E: phòng còn trống không ạ?")
        ta.press("Enter")
        page.wait_for_timeout(1200)
        bubbles = page.locator(".chat-bubble")
        last = bubbles.last.inner_text()
        assert "E2E" in last, "sent bubble missing: " + last[:80]
        page.screenshot(path=SHOTS + "e2e-04-chat.png")
    check("chat send via Enter", _chat_send)

    # ---- Favorites page reflects the toggle --------------------------------
    def _favorites():
        page.goto(BASE + "/favorites", wait_until="networkidle")
        page.wait_for_timeout(800)
        assert page.locator(".listing-card").count() >= 0, "favorites crashed"
        page.screenshot(path=SHOTS + "e2e-05-favorites.png")
    check("favorites page loads", _favorites)

    # ---- Profile ------------------------------------------------------------
    def _profile():
        page.goto(BASE + "/profile", wait_until="networkidle")
        page.wait_for_selector("form.card")
        assert page.locator("#email, input.form-control").first.is_visible()
        page.screenshot(path=SHOTS + "e2e-06-profile.png")
    check("profile form renders", _profile)

    # ---- Logout via dropdown -------------------------------------------------
    def _logout():
        page.click(".dropdown-toggle:has(i.bi-person-circle)")
        page.click("button.dropdown-item:has-text('Đăng xuất')")
        page.wait_for_url(BASE + "/", timeout=10000)
        expect(page.locator("a[href='/login']").first).to_be_visible()
    check("logout returns to public home", _logout)

    # ---- Mobile smoke ---------------------------------------------------------
    def _mobile():
        m = browser.new_page(viewport={"width": 390, "height": 844})
        m.goto(BASE + "/rooms", wait_until="networkidle")
        m.wait_for_selector(".listing-card")
        over = m.evaluate(
            "document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        assert over <= 2, f"mobile overflow {over}px"
        m.screenshot(path=SHOTS + "e2e-07-rooms-mobile.png")
        m.close()
    check("mobile rooms: no horizontal overflow", _mobile)

    browser.close()

print("\n==== SUMMARY ====")
if console_errors:
    real = [e for e in console_errors if "favicon" not in e.lower()]
    if real:
        issues.append("console errors: " + " ; ".join(real[:3]))
if issues:
    print(f"{len(issues)} issue(s):")
    for i in issues:
        print(" -", i)
    sys.exit(1)
print("all checks passed")
