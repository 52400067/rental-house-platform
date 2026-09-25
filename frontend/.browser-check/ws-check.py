"""WebSocket chat checks (Reverb + Echo, thay polling).

2 context browser: student1 va landlord1. Biet:
  A. Tin nhan B gui den A realtime trong thread khong reload (ws, khong poll)
  B. Badge unread tren Navbar tang realtime khi A khong o trong thread
  C. Khong con request polling GET /conversations/{id}/messages lap lai
Chay can: API :8000 + Reverb :8080 + dev :5173 + DB.
"""
import time

from playwright.sync_api import expect, sync_playwright

from checklib import (BASE, CHROME, LANDLORD, LANDLORD_NAME, STUDENT,
                      STUDENT_NAME, login, make_checker, open_conv)

check, finish = make_checker()

# open_conv_with cu = open_conv (tra True/False) trong checklib.
open_conv_with = open_conv


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

finish()
