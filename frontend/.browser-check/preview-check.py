"""Sidebar preview checks (Messenger-style latest message preview).

2 context: A = student1 (nguoi nhan), B = landlord1 (nguoi gui).
  A. B gui tin -> sidebar cua A: item day len dau, preview chua tin, badge +1
  B. Nguoi gui (B o trang khac): preview co prefix "Bạn: "
Can: API :8000 + Reverb :8080 + dev :5173 + DB.
"""
import os
import time

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("E2E_BASE", "http://localhost:5173")
STUDENT = ("student1@example.com", "password")
LANDLORD = ("landlord1@example.com", "password")
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


def login(page, email, password="password"):
    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", password)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10000)


def open_conv(page, other_name):
    page.goto(BASE + "/messages", wait_until="networkidle")
    page.wait_for_selector(".messages-item", timeout=10000)
    items = page.locator(".messages-item")
    for i in range(items.count()):
        item = items.nth(i)
        if other_name in (item.inner_text() or ""):
            item.click()
            page.wait_for_selector(".chat-thread", timeout=10000)
            return


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    ca = browser.new_context(viewport={"width": 1280, "height": 800})
    cb = browser.new_context(viewport={"width": 1280, "height": 800})
    a = ca.new_page()
    b = cb.new_page()

    def setup():
        login(a, *STUDENT)
        open_conv(a, "Trần Văn Thành")
        login(b, *LANDLORD)
        open_conv(b, "Nguyễn Văn An")
        a.wait_for_timeout(1200)
        b.wait_for_timeout(1200)
    check("setup: 2 browser vao cung thread", setup)

    # ---- A. Nguoi nhan: preview + push-to-top + badge ----------------------
    def receiver_preview():
        stamp = f"PREVIEW {int(time.time())}"
        a.goto(BASE + "/rooms", wait_until="networkidle")  # A roi khoi thread
        b.fill(".chat-composer textarea", stamp)
        b.click(".chat-composer .btn-send")
        # B (nguoi gui, dang o thread): preview cap nhat + prefix "Bạn:"
        first_b = b.locator(".messages-item").first
        expect(first_b).to_contain_text("Bạn:", timeout=6000)
        expect(first_b).to_contain_text(stamp)
        # A (o trang khac): quay lai /messages — tim item chua stamp, co badge
        a.goto(BASE + "/messages", wait_until="networkidle")
        a.wait_for_timeout(1000)
        first_a = a.locator(".messages-item", has_text=stamp).first
        expect(first_a).to_be_visible(timeout=6000)
        expect(first_a.locator(".badge")).to_be_visible()
    check("preview: nguoi gui 'Bạn:', nguoi nhan badge +1, push-to-top", receiver_preview)

    browser.close()

fails = [n for n, s in results if s == "FAIL"]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
assert not fails, f"failed: {fails}"
