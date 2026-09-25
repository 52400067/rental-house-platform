"""Reaction checks (Messenger-style): picker 6 emoji, chip realtime.

2 context: A = student1, B = landlord1. Biet:
  A. A mo menu -> picker 6 emoji -> chon ❤️ -> chip xuat hien o CẢ A và B
  B. A doi sang 😂 -> chip doi theo (o ca hai phia)
  C. A chon lai 😂 -> reaction BO (chip bien mat ca hai phia)
Can: API :8000 + Reverb :8080 + dev :5173 + DB.
"""
import time

from playwright.sync_api import expect, sync_playwright

from checklib import (BASE, CHROME, LANDLORD, LANDLORD_NAME, STUDENT,
                      STUDENT_NAME, login, make_checker, open_conv)

check, finish = make_checker()


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

    def send_b(text):
        b.fill(".chat-composer textarea", text)
        b.click(".chat-composer .btn-send")
        expect(a.locator(".chat-bubble", has_text=text)).to_be_visible(timeout=6000)

    # ---- A. Dat reaction ---------------------------------------------------
    def react():
        stamp = f"REACT {int(time.time())}"
        send_b(stamp)
        # A mo menu tren tin vua B gui (tin cua nguoi khac - chi co picker)
        row = a.locator(".chat-row", has_text=stamp).last
        row.locator(".chat-bubble").first.click()
        menu = a.locator(".chat-menu")
        expect(menu).to_be_visible()
        assert menu.locator(".chat-reaction-emoji").count() == 6, "thieu emoji"
        menu.locator(".chat-reaction-emoji", has_text="❤️").click()
        # Chip xuat hien ca hai phia (B nhan qua .message.reacted)
        expect(a.locator(".chat-reaction-chip", has_text="❤️").last).to_be_visible(timeout=6000)
        expect(b.locator(".chat-reaction-chip", has_text="❤️").last).to_be_visible(timeout=6000)
    check("react: A tha ❤️ -> chip xuat hien ca hai phia", react)

    # ---- B. Doi emoji -------------------------------------------------------
    def change():
        row = a.locator(".chat-row", has_text="REACT").last
        row.locator(".chat-bubble").first.click()
        a.locator(".chat-menu").locator(".chat-reaction-emoji", has_text="😂").click()
        expect(a.locator(".chat-reaction-chip", has_text="😂").last).to_be_visible(timeout=6000)
        expect(b.locator(".chat-reaction-chip", has_text="😂").last).to_be_visible(timeout=6000)
    check("change: doi ❤️ sang 😂 dong bo ca hai phia", change)

    # ---- C. Toggle bo --------------------------------------------------------
    def toggle_off():
        row = a.locator(".chat-row", has_text="REACT").last
        row.locator(".chat-bubble").first.click()
        a.locator(".chat-menu").locator(".chat-reaction-emoji", has_text="😂").click()
        expect(a.locator(".chat-reaction-chip", has_text="😂")).to_have_count(0, timeout=6000)
        expect(b.locator(".chat-reaction-chip", has_text="😂")).to_have_count(0, timeout=6000)
    check("toggle: chon lai cung emoji -> bo, chip bien mat", toggle_off)

    browser.close()

finish()
