"""Diagnostic WebSocket: ket noi Echo co thanh cong? Frame nao den?"""
import os

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
CHROME = "/usr/lib64/chromium-browser/chromium-browser"

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    page = browser.new_page()
    frames = []
    conns = []

    def on_ws(ws):
        conns.append(ws.url)
        ws.on("framereceived", lambda f: frames.append(("RECV", f)))
        ws.on("framesent", lambda f: frames.append(("SENT", f)))

    page.on("websocket", on_ws)
    page.on("console", lambda m: print("console:", m.type, m.text[:120]))
    page.on("requestfailed", lambda r: print("reqfail:", r.url[:90], r.failure))

    # Login student1 va mo thread
    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill("#email", "student1@example.com")
    page.fill("#password", "password")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10000)

    page.goto(BASE + "/messages", wait_until="networkidle")
    page.wait_for_selector(".list-group-item", timeout=10000)
    page.locator(".list-group-item").first.click()
    page.wait_for_selector(".chat-thread", timeout=10000)
    print("threads open, ws conns:", conns)

    # Send a message from this client to trigger broadcast
    page.fill(".chat-composer textarea", "DIAG: tu gui tu A")
    page.click(".chat-composer .btn-send")
    page.wait_for_timeout(6000)

    print(f"\n=== {len(frames)} frames ===")
    for kind, f in frames[:15]:
        print(kind, repr(f)[:180])

    browser.close()
