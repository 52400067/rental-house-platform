"""Delete-message checks (kieu Facebook): unsend ca hai phia + xoa cho minh.

2 context: student1 (A) va landlord1 (B). Biet:
  A. "Thu hod" (unsend): bubble o CẢ A và B thành tombstone realtime
  B. "Xóa chỉ ở phía mình": bubble bien mat o phia thuc hien, phia kia giu nguyen
  C. Tombstone van hien sau reload (DB-persisted)
Chay can: API :8000 + Reverb :8080 + dev :5173 + DB.
"""
import time

from playwright.sync_api import expect, sync_playwright

from checklib import (BASE, CHROME, LANDLORD, LANDLORD_NAME, STUDENT,
                      STUDENT_NAME, login, make_checker, open_conv, open_menu,
                      send_b)

check, finish = make_checker()

TOMBSTONE = "Tin nhắn đã được thu hồi"


def open_menu(page, bubble_text):
    """Click bubble -> menu nho kieu Messenger neo vao bubble."""
    row = page.locator(".chat-row", has_text=bubble_text).last
    row.locator(".chat-bubble").first.click()
    menu = page.locator(".chat-menu")
    expect(menu).to_be_visible()
    return menu


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

    # ---- A. Unsend (thu hoi) ca hai phia: menu -> dialog xac nhan ---------
    def unsend():
        stamp = f"UNSEND {int(time.time())}"
        send_b(b, stamp)
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=6000)
        menu = open_menu(b, stamp)
        menu.locator("button", has_text="Thu hồi").click()
        dialog = b.locator(".chat-confirm")
        expect(dialog).to_be_visible()
        # Copy trong dialog noi ro hau qua cho moi nguoi.
        expect(dialog).to_contain_text("mọi người")
        dialog.locator(".chat-confirm-btn.primary").click()
        # Phia B tombstone
        expect(b.locator(".chat-bubble-unsent").last).to_contain_text(TOMBSTONE, timeout=6000)
        # Phia A tombstone realtime
        expect(a.locator(".chat-bubble-unsent").last).to_contain_text(TOMBSTONE, timeout=6000)
    check("unsend: menu -> xac nhan -> tombstone ca hai phia", unsend)

    # ---- B. Xoa chi o phia minh -------------------------------------------
    # ---- B. Xoa chi o phia minh: menu, chay ngay, khong confirm -----------
    def delete_for_me():
        stamp = f"DELME {int(time.time())}"
        send_b(b, stamp)
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=6000)
        menu = open_menu(b, stamp)
        menu.locator("button", has_text="phía mình").click()
        b.wait_for_timeout(500)
        # Phia B: bien mat
        expect(b.locator(".chat-bubble", has_text=stamp)).to_have_count(0, timeout=6000)
        # Phia A: van con
        expect(a.locator(".chat-bubble", has_text=stamp)).to_be_visible(timeout=3000)
    check("delete-for-me: chay ngay, chi phia thuc hien mat tin", delete_for_me)

    # ---- C. Tombstone ton tai sau reload ----------------------------------
    def persisted():
        a.reload(wait_until="networkidle")
        a.wait_for_selector(".chat-bubble-unsent", timeout=10000)
        expect(a.locator(".chat-bubble-unsent").last).to_contain_text(TOMBSTONE)
    check("tombstone ton tai sau reload", persisted)

    browser.close()

finish()
