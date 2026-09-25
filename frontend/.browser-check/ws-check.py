"""WebSocket chat checks (Reverb + Echo, thay polling).

2 context browser: student1 va landlord1. Biet:
  A. Tin nhan B gui den A realtime trong thread khong reload (ws, khong poll)
  B. Badge unread tren Navbar tang realtime khi A khong o trong thread
  C. Khong con request polling GET /conversations/{id}/messages lap lai
Chay can: API :8000 + Reverb :8080 + dev :5173 + DB.
"""
import os
import time

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("E2E_BASE", "http://localhost:5173")
STUDENT = (os.environ.get("E2E_EMAIL", "student1@example.com"), "password")
LANDLORD = ("landlord1@example.com", "password")
# Ten hien thi trong seeder (sidebar khong hien email).
STUDENT_NAME = "Nguyễn Văn An"
LANDLORD_NAME = "Trần Văn Thành"
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


def login(page, email, password):
    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", password)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10000)


def open_conv_with(page, other_name):
    """Mo hoi thoai voi other_name tu trang /messages."""
    page.goto(BASE + "/messages", wait_until="networkidle")
    page.wait_for_selector(".list-group-item", timeout=10000)
    items = page.locator(".list-group-item")
    n = items.count()
    for i in range(n):
        item = items.nth(i)
        if other_name in (item.inner_text() or ""):
            item.click()
            page.wait_for_selector(".chat-thread", timeout=10000)
            return True
    return False


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    ctx_a = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx_b = browser.new_context(viewport={"width": 1280, "height": 800})
    a = ctx_a.new_page()
    b = ctx_b.new_page()

    errors = []
    a.on("pageerror", lambda e: errors.append(str(e)))

    # ---- Setup: A = student1 mo thread voi landlord1 ----------------------
    def setup():
        login(a, *STUDENT)
        assert open_conv_with(a, LANDLORD_NAME), "student1 chua co hoi thoai voi landlord1"
        a.wait_for_timeout(1500)  # ws connected + initial load
    check("A login student1 + mo thread", setup)

    def setup_b():
        login(b, *LANDLORD)
        assert open_conv_with(b, STUDENT_NAME), "landlord1 chua co hoi thoai voi student1"
        b.wait_for_timeout(1500)
    check("B login landlord1 + mo thread", setup_b)

    # ---- A. Realtime bubble B -> A trong thread ---------------------------
    def realtime_bubble():
        # Text unique per run: cac lan chay truoc de lai tin trong DB.
        stamp = f"WS E2E {int(time.time())}"
        b.fill(".chat-composer textarea", stamp)
        b.click(".chat-composer .btn-send")
        expect(
            a.locator(".chat-thread .chat-bubble", has_text=stamp)
        ).to_be_visible(timeout=6000)
    check("tin nhan B den A realtime trong thread", realtime_bubble)

    # ---- B. Badge unread tang khi A khong o thread ------------------------
    def realtime_badge():
        a.goto(BASE + "/rooms", wait_until="networkidle")
        badge = a.locator("a[href='/messages'] .badge")
        b0 = badge.count() and int(badge.inner_text()) or 0
        b.fill(".chat-composer textarea", f"WS E2E badge {int(time.time())}")
        b.click(".chat-composer .btn-send")
        expect(badge).to_be_visible(timeout=6000)
        expect(badge).to_have_text(str(b0 + 1), timeout=6000)
    check("badge unread tang realtime (A o trang khac)", realtime_badge)

    # ---- C. Khong con polling messages ------------------------------------
    def no_polling():
        hits = []
        a.on("request", lambda r: hits.append(r.url) if "/messages?" in (r.url or "") else None)
        b.fill(".chat-composer textarea", "WS E2E: khong poll")
        b.click(".chat-composer .btn-send")
        a.wait_for_timeout(7000)
        polling = [u for u in hits if "after_id" in u]
        assert not polling, f"van con polling: {polling[:3]}"
    check("khong con request poll after_id", no_polling)

    def no_errors():
        assert not errors, f"pageerrors: {errors[:2]}"
    check("khong pageerror", no_errors)

    browser.close()

fails = [n for n, s in results if s == "FAIL"]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
assert not fails, f"failed: {fails}"
