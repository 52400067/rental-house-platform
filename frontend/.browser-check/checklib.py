"""Shared helpers for the .browser-check scripts.

Mechanical extraction from ws-check / delete-check / typing-seen-check /
reaction-check / preview-check / ai-widget-check - no behavior changes.

Usage in a script:
    from checklib import (BASE, CHROME, STUDENT, LANDLORD,
                          STUDENT_NAME, LANDLORD_NAME,
                          make_checker, login, open_conv, send_b, open_menu)

    check, finish = make_checker()
    ...
    check("ten check", lambda: ...)
    finish()   # in tong ket + assert khong FAIL
"""
import os

from playwright.sync_api import expect

# ---- Hằng số dùng chung (env override được) ------------------------------
BASE = os.environ.get("E2E_BASE", "http://localhost:5173")
STUDENT = (os.environ.get("E2E_EMAIL", "student1@example.com"), "password")
LANDLORD = ("landlord1@example.com", "password")

# Ten hien thi trong seeder - sidebar khong hien email.
STUDENT_NAME = "Nguyễn Văn An"
LANDLORD_NAME = "Trần Văn Thành"

CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)


def make_checker():
    """Trả về (check, finish). Mỗi script tự gọi một lần ở đầu.

    check(name, fn)   - chạy fn, ghi PASS/FAIL, không dừng script
    finish()          - in tong ket, raise nếu có FAIL
    """
    results = []

    def check(name, fn):
        try:
            fn()
            results.append((name, "PASS"))
            print(f"  [PASS] {name}")
        except Exception as e:  # noqa: BLE001
            results.append((name, "FAIL"))
            print(f"  [FAIL] {name}: {str(e)[:200]}")

    def finish():
        fails = [n for n, s in results if s == "FAIL"]
        print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
        assert not fails, f"failed: {fails}"

    return check, finish


def login(page, email, password="password", base=None):
    """base: override khi script chay tren origin khac (vd preview :4173).
    QUAN TRONG: token nam trong localStorage THEO ORIGIN - login nham origin
    thi cac buoc sau khong thay dang nhap."""
    page.goto((base or BASE) + "/login", wait_until="networkidle")
    page.fill("#email", email)
    page.fill("#password", password)
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10000)


def open_conv(page, other_name, base=None):
    """Mo hoi thoai voi other_name tu trang /messages. True neu tim thay."""
    page.goto((base or BASE) + "/messages", wait_until="networkidle")
    page.wait_for_selector(".messages-item", timeout=10000)
    items = page.locator(".messages-item")
    n = items.count()
    for i in range(n):
        item = items.nth(i)
        if other_name in (item.inner_text() or ""):
            item.click()
            page.wait_for_selector(".chat-thread", timeout=10000)
            return True
    return False


def send_b(page, text):
    """Goi tin tu composer (khong assert - script tu expect phu hop)."""
    box = page.locator(".chat-composer textarea")
    box.fill(text)
    page.click(".chat-composer .btn-send")


def open_menu(page, bubble_text):
    """Click bubble chua bubble_text -> menu tuy chon hien ra. Tra ve menu."""
    row = page.locator(".chat-row", has_text=bubble_text).last
    row.locator(".chat-bubble").first.click()
    menu = page.locator(".chat-menu")
    expect(menu).to_be_visible()
    return menu
