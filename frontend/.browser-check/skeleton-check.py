# Skeleton regression against the REAL stack (no mock server, no port conflicts).
# Route-interception with DEFERRED FULFILLMENT: the handler fetches the real
# response immediately but does not serve it yet - the request stays pending,
# so the app keeps its skeleton visible. The main thread (event loop free)
# checks skeleton + shimmer, then fulfills to release real content.
import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("APP_URL", "http://localhost:5173")
API = os.environ.get("API_URL", "http://localhost:8000")
EMAIL = os.environ.get("E2E_EMAIL", "student1@example.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "password")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)

issues = []


def api_glob(path):
    # Match the API host:port + path prefix regardless of query string.
    return re.compile(rf"^{re.escape(API)}/api{path}")


def shimmer_alive(page):
    # Sample the shimmer pseudo-element's transform twice; a moving
    # translateX means the animation is actually running.
    t1 = page.evaluate(
        "getComputedStyle(document.querySelector('.skeleton'), '::after').transform"
    )
    page.wait_for_timeout(350)
    t2 = page.evaluate(
        "getComputedStyle(document.querySelector('.skeleton'), '::after').transform"
    )
    return t1 != t2


def run_probe(ctx, name, url, pattern, loaded_check):
    page = ctx.new_page()
    pending = []

    def handle(route):
        # Fetch the real response now; serve it later from the main thread.
        try:
            resp = route.fetch()
            pending.append((route, resp))
        except Exception:
            route.abort()

    page.route(pattern, handle)
    page.goto(BASE + url, wait_until="domcontentloaded")
    page.wait_for_timeout(800)  # React mounts; fetch sits pending in the held route

    n_skel = page.locator(".skeleton").count()
    skel_visible = n_skel > 0 and page.locator(".skeleton").first.is_visible()

    if not skel_visible:
        issues.append(
            f"{name}: skeleton never appeared while API was held ({n_skel} nodes, "
            f"{len(pending)} held)"
        )
    else:
        if not shimmer_alive(page):
            issues.append(f"{name}: skeleton visible but shimmer not animating")
        page.screenshot(
            path=os.path.join(os.path.dirname(__file__), "shots", f"skel-{name}.png")
        )

    # Release: serve the held responses, then wait for the loaded state.
    for route, resp in pending:
        try:
            route.fulfill(response=resp)
        except Exception:
            pass
    try:
        loaded_check(page)
    except Exception as e:
        issues.append(f"{name}: after load -> {type(e).__name__}: {e}")
    # Serve any requests the app fired after the first release (polls,
    # StrictMode double-fetch) so no handler coroutines dangle at close.
    page.wait_for_timeout(300)
    for route, resp in pending:
        try:
            route.fulfill(response=resp)
        except Exception:
            pass
    page.close()


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})

    # Log in once through the UI; localStorage persists for the whole context.
    page = ctx.new_page()
    page.goto(BASE + "/login", wait_until="domcontentloaded")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    try:
        page.wait_for_url(BASE + "/", timeout=15000)
    except Exception as e:
        print(f"[XX] login failed: {e}")
        sys.exit(1)
    page.close()

    run_probe(
        ctx, "home", "/", api_glob(r"/listings\?.*per_page=6"),
        lambda pg: pg.wait_for_selector(".listing-card", timeout=15000),
    )
    run_probe(
        ctx, "rooms", "/rooms", api_glob(r"/listings\?"),
        lambda pg: pg.wait_for_selector(".listing-card", timeout=15000),
    )
    run_probe(
        ctx, "roomdetail", "/rooms/1", api_glob(r"/listings/\d+"),
        lambda pg: pg.wait_for_selector(".card.sticky-top", timeout=15000),
    )
    run_probe(
        ctx, "favorites", "/favorites", api_glob(r"/favorites"),
        lambda pg: pg.wait_for_selector(
            ".listing-card, .alert, .text-secondary", timeout=15000
        ),
    )
    run_probe(
        ctx, "messages", "/messages", api_glob(r"/conversations"),
        lambda pg: pg.wait_for_selector(
            ".messages-item, .alert, .text-secondary", timeout=15000
        ),
    )
    run_probe(
        ctx, "profile", "/profile", api_glob(r"/me"),
        lambda pg: pg.wait_for_selector("form", timeout=15000),
    )

    browser.close()

print()
print("==== SUMMARY ====")
if issues:
    for i in issues:
        print(" -", i)
    sys.exit(1)
print("ALL SKELETON CHECKS PASS")
