"""Delete-message checks (kieu Facebook): unsend ca hai phia + xoa cho minh.

2 context: student1 (A) va landlord1 (B). Biet:
  A. "Thu hod" (unsend): bubble o CẢ A và B thành tombstone realtime
  B. "Xóa chỉ ở phía mình": bubble bien mat o phia thuc hien, phia kia giu nguyen
  C. Tombstone van hien sau reload (DB-persisted)
Chay can: API :8000 + Reverb :8080 + dev :5173 + DB.
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


def send_b(page, text):
    b = page.locator(".chat-composer textarea")
    b.fill(text)
    page.click(".chat-composer .btn-send")


TOMBSTONE = "Tin nhắn đã được thu hồi"


def open_sheet(page, bubble_text):
    """Click bubble -> modal action sheet kieu Facebook hien ra."""
    row = page.locator(".chat-row", has_text=bubble_text).last
    row.locator(".chat-bubble").first.click()
    sheet = page.locator(".chat-sheet")
    expect(sheet).to_be_visible()
    return sheet


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
        a.wait_for_timeout(1200); b.wait_for_timeout(1200)
    check("setup: 2 browser vao cung thread", setup)

    # ---- A. Unsend (thu hoi) ca hai phia ----------------------------------
    def unsend():
        stamp = f"UNSEND {int(time.time())}"
        send_b(b, stamp)
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=6000)
        sheet = open_sheet(b, stamp)
        sheet.locator(".chat-sheet-btn.danger", has_text="Thu hồi").click()
        # Phia B tombstone
        expect(b.locator(".chat-bubble-unsent").last).to_contain_text(TOMBSTONE, timeout=6000)
        # Phia A tombstone realtime
        expect(a.locator(".chat-bubble-unsent").last).to_contain_text(TOMBSTONE, timeout=6000)
    check("unsend: ca hai phia thanh tombstone realtime", unsend)

    # ---- B. Xoa chi o phia minh -------------------------------------------
    def delete_for_me():
        stamp = f"DELME {int(time.time())}"
        send_b(b, stamp)
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=6000)
        sheet = open_sheet(b, stamp)
        sheet.locator(".chat-sheet-btn", has_text="phía mình").click()
        b.wait_for_timeout(500)
        # Phia B: bien mat
        expect(b.locator(".chat-bubble", has_text=stamp)).to_have_count(0, timeout=6000)
        # Phia A: van con
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=3000)
    check("delete-for-me: chi phia thuc hien mat tin", delete_for_me)

    # ---- C. Tombstone ton tai sau reload ----------------------------------
    def persisted():
        a.reload(wait_until="networkidle")
        a.wait_for_selector(".chat-bubble-unsent", timeout=10000)
        expect(a.locator(".chat-bubble-unsent").last).to_contain_text(TOMBSTONE)
    check("tombstone ton tai sau reload", persisted)

    browser.close()

fails = [n for n, s in results if s == "FAIL"]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
assert not fails, f"failed: {fails}"
