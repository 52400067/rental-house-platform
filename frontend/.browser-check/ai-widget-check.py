"""AI chat widget checks (floating Messenger-style box).

Covers: launcher pinned bottom-right on public pages, guest login CTA
(no /login redirect), popup open/close, Home tile opens the widget,
authed send + real AI round-trip, design-token styles, old page removal,
375px fit. Run with preview :4173 and API :8000 up.
"""
import os

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("E2E_BASE", "http://localhost:4173")
EMAIL = os.environ.get("E2E_EMAIL", "student1@example.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "password")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)

results = []


def check(name, fn):
    try:
        fn()
        results.append((name, "PASS"))
        print(f"  [PASS] {name}")
    except Exception as e:  # noqa: BLE001
        results.append((name, "FAIL"))
        print(f"  [FAIL] {name}: {str(e)[:200]}")


def is_bottom_right(box, vw, vh):
    return box["x"] + box["width"] > vw - 60 and box["y"] + box["height"] > vh - 60


def api_up():
    """DB-backed endpoints need Postgres; skip auth checks when it is down."""
    import urllib.request
    try:
        with urllib.request.urlopen(
            "http://localhost:8000/api/listings?per_page=1", timeout=5
        ) as r:
            return r.status == 200
    except Exception:
        return False


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ---- Guest: launcher on public pages ---------------------------------
    for path in ["/", "/rooms", "/map"]:
        page.goto(BASE + path, wait_until="networkidle")
        el = page.locator(".ai-widget-launcher")
        check(f"launcher visible on {path}",
              lambda el=el: expect(el).to_be_visible())
        check(f"launcher pinned bottom-right on {path}",
              lambda path=path, el=el: is_bottom_right(
                  el.bounding_box(),
                  page.viewport_size["width"],
                  page.viewport_size["height"]))

    # ---- Guest: guest CTA, no 401 redirect -------------------------------
    def guest_panel():
        page.goto(BASE + "/", wait_until="networkidle")
        page.click(".ai-widget-launcher")
        expect(page.locator(".ai-widget-panel")).to_be_visible()
        expect(page.locator(".ai-widget-guest")).to_be_visible()
        expect(page.locator(".ai-widget-guest a[href='/login']")).to_be_visible()
        page.wait_for_timeout(600)
        assert "/login" not in page.url, "redirected to /login"
    check("guest CTA shown, no /login redirect", guest_panel)

    # ---- Toggle + Esc (panel is open from the previous check) ------------
    def toggle():
        page.keyboard.press("Escape")
        expect(page.locator(".ai-widget-panel")).not_to_be_visible()
        page.click(".ai-widget-launcher")
        expect(page.locator(".ai-widget-panel")).to_be_visible()
    check("Esc minimizes, launcher reopens", toggle)

    # ---- Home tile opens widget -----------------------------------------
    def tile_opens():
        page.goto(BASE + "/", wait_until="networkidle")
        page.click("button.feature-tile:has(h5:text('Trợ lý AI'))")
        expect(page.locator(".ai-widget-panel")).to_be_visible()
    check("Home 'Trợ lý AI' tile opens widget", tile_opens)

    # ---- Old page gone (SPA wildcard redirects to /) ---------------------
    def old_page_gone():
        page.goto(BASE + "/ai/chat", wait_until="networkidle")
        page.wait_for_timeout(500)
        assert "/ai/chat" not in page.url, f"still on {page.url}"
    check("standalone /ai/chat redirects away (page removed)", old_page_gone)

    # ---- Authed: login then real AI round-trip ---------------------------
    if not api_up():
        print("  [SKIP] authed checks (API/Postgres down - start Postgres + :8000)")
    else:
        def login():
            page.goto(BASE + "/login", wait_until="networkidle")
            page.fill("#email", EMAIL)
            page.fill("#password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: "/login" not in u, timeout=10000)
        check("login as student1", login)

        def authed_send():
            page.goto(BASE + "/rooms", wait_until="networkidle")
            page.click(".ai-widget-launcher")
            expect(page.locator(".ai-widget-thread")).to_be_visible()
            page.fill(".ai-widget-composer input", "E2E widget: tiền cọc thường là bao nhiêu?")
            page.click(".ai-widget-composer .btn-send")
            mine = page.locator(".ai-widget-thread .chat-row.mine .chat-bubble")
            expect(mine.first).to_contain_text("E2E widget", timeout=5000)
            # Real AI round-trip (backend proxies to the AI service, may take ~30s;
            # backend answers 503-fallback itself when the AI service is down).
            reply = page.locator(
                ".ai-widget-thread .chat-row:not(.mine) .chat-bubble"
            ).last
            expect(reply).to_be_visible(timeout=45000)
            assert reply.inner_text().strip(), "empty AI reply"
        check("authed send -> AI reply round-trip", authed_send)

        # ---- Thread survives minimize/reopen ---------------------------------
        def thread_persists():
            page.click(".ai-widget-launcher")  # minimize
            page.wait_for_timeout(300)
            page.click(".ai-widget-launcher")  # reopen
            mine = page.locator(".ai-widget-thread .chat-row.mine .chat-bubble")
            expect(mine.first).to_contain_text("E2E widget", timeout=5000)
        check("thread survives minimize/reopen", thread_persists)

        # ---- Styles match design system --------------------------------------
        def styles():
            # Previous check left the panel open - only open if closed.
            if not page.locator(".ai-widget-panel").is_visible():
                page.click(".ai-widget-launcher")
            expect(page.locator(".ai-widget-panel")).to_be_visible()
            page.mouse.move(5, 5)  # leave :hover before asserting colors
            page.wait_for_timeout(400)
            bg = page.locator(".ai-widget-launcher").evaluate(
                "el => getComputedStyle(el).backgroundColor")
            assert bg == "rgb(185, 255, 102)", f"launcher bg {bg}, want lime"
            panel = page.locator(".ai-widget-panel").evaluate(
                """el => { const s = getComputedStyle(el);
                          return [s.borderRadius, s.borderTopColor]; }""")
            assert panel[0] == "20px", f"panel radius {panel[0]}, want 20px"
            assert "26, 35" in panel[1] or panel[1] == "rgb(25, 26, 35)", panel[1]
            head = page.locator(".ai-widget-header").evaluate(
                "el => getComputedStyle(el).backgroundColor")
            assert head == "rgb(25, 26, 35)", f"header bg {head}, want ink"
            # Desktop: panel docks LEFT of the head (Facebook web chat).
            pb = page.locator(".ai-widget-panel").bounding_box()
            lb = page.locator(".ai-widget-launcher").bounding_box()
            assert pb["x"] + pb["width"] <= lb["x"] + 2, (
                f"panel right {pb['x'] + pb['width']} vs head left {lb['x']}")
        check("widget styles (lime launcher, ink header, docked-left panel)", styles)

        # ---- Back-to-top same size as the AI head -----------------------------
        def same_size():
            page.mouse.wheel(0, 2000)
            page.wait_for_timeout(600)
            bt = page.locator(".back-to-top.show").bounding_box()
            lw = page.locator(".ai-widget-launcher").bounding_box()
            assert bt, "back-to-top not shown after scroll"
            assert abs(bt["width"] - lw["width"]) < 2, (
                f"back-to-top {bt['width']}px vs launcher {lw['width']}px")
        check("back-to-top matches launcher size", same_size)

    # ---- 375px fit --------------------------------------------------------
    def mobile():
        mp = ctx.new_page()
        mp.set_viewport_size({"width": 375, "height": 667})
        mp.goto(BASE + "/rooms", wait_until="networkidle")
        mp.click(".ai-widget-launcher")
        box = mp.locator(".ai-widget-panel").bounding_box()
        assert box["x"] >= 0 and box["x"] + box["width"] <= 375, f"panel x {box}"
        mp.close()
    check("375px: panel fits viewport", mobile)

    # ---- No page errors ---------------------------------------------------
    def no_errors():
        assert not errors, f"pageerrors: {errors[:2]}"
    check("no pageerrors during run", no_errors)

    browser.close()

fails = [n for n, s in results if s == "FAIL"]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
assert not fails, f"failed: {fails}"
