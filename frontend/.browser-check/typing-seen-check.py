"""Typing indicator + seen receipt checks (realtime qua Reverb).

2 context: A = student1, B = landlord1 trong cung thread.
  A. A go phIM -> B thay bubble 3 cham "dang soan" (whisper), mat sau ~2.5s
  B. B gui tin -> A tu markRead -> B thay nhan "Da xem" realtime
  C. "Da xem" van con sau khi B reload (seen_at luu DB)
Can: API :8000 + Reverb :8080 + dev :5173 + DB.
"""
import os
import time

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("E2E_BASE", "http://localhost:5173")
STUDENT = ("student1@example.com", "password")
LANDLORD = ("landlord1@example.com", "password")
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


def login(page, email, password="password"):
    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", password)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10000)


def open_conv(page, other_name):
    page.goto(BASE + "/messages", wait_until="networkidle")
    page.wait_for_selector(".list-group-item", timeout=10000)
    items = page.locator(".list-group-item")
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
        login(a, *STUDENT); open_conv(a, LANDLORD_NAME)
        login(b, *LANDLORD); open_conv(b, STUDENT_NAME)
        a.wait_for_timeout(1500); b.wait_for_timeout(1500)
    check("setup: 2 browser vao cung thread", setup)

    # ---- A. Typing indicator (whisper) -------------------------------------
    def typing():
        a.fill(".chat-composer textarea", "Đang gõ để B nhìn thấy...")
        expect(b.locator(".chat-typing")).to_be_visible(timeout=6000)
        # Tu mat sau debounce 2.5s (cho them margin).
        expect(b.locator(".chat-typing")).to_have_count(0, timeout=6000)
        a.fill(".chat-composer textarea", "")
    check("typing: B thay 3 cham khi A go, tu mat sau ~2.5s", typing)

    # ---- B. Seen receipt (markRead -> .message.seen) -----------------------
    def seen():
        stamp = f"SEEN {int(time.time())}"
        b.fill(".chat-composer textarea", stamp)
        b.click(".chat-composer .btn-send")
        # Tin den phia A -> listener cua A tu markRead -> B nhan .message.seen
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=6000)
        expect(b.locator(".chat-seen")).to_have_text("Đã xem", timeout=6000)
    check("seen: B thay 'Da xem' sau khi A mo thread (realtime)", seen)

    # ---- C. Persist sau reload ---------------------------------------------
    def persisted():
        b.reload(wait_until="networkidle")
        b.wait_for_selector(".chat-thread", timeout=10000)
        b.wait_for_timeout(800)
        expect(b.locator(".chat-seen").first).to_have_text("Đã xem", timeout=6000)
    check("seen: 'Da xem' van con sau reload (DB)", persisted)

    browser.close()

fails = [n for n, s in results if s == "FAIL"]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
assert not fails, f"failed: {fails}"
