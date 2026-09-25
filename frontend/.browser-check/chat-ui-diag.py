"""Chat UI diagnostics: menu clipping o day thread + scrollbar metrics.

In ra so lieu (khong duoc xem anh truc tiep) va luu screenshot de nguoi
dung tu mo xem: shots/chat-ui-before.png / -after.png
"""
import os

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
CHROME = "/usr/lib64/chromium-browser/chromium-browser"
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
TAG = os.environ.get("DIAG_TAG", "before")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    page = browser.new_context(viewport={"width": 1280, "height": 800}).new_page()

    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill("#email", "student1@example.com")
    page.fill("#password", "password")
    page.click("button[type=submit]")
    page.wait_for_url(lambda u: "/login" not in u, timeout=10000)

    page.goto(BASE + "/messages", wait_until="networkidle")
    page.wait_for_selector(".list-group-item", timeout=10000)
    page.locator(".list-group-item").first.click()
    page.wait_for_selector(".chat-thread", timeout=10000)
    page.wait_for_timeout(1200)

    metrics = page.evaluate(
        """() => {
        const t = document.querySelector('.chat-thread');
        const cs = getComputedStyle(t);
        const lastBubble = [...t.querySelectorAll('.chat-bubble')].pop();
        const br = lastBubble.getBoundingClientRect();
        const tr = t.getBoundingClientRect();
        return {
            scrollTop_before: t.scrollTop,
            scrollHeight: t.scrollHeight,
            clientHeight: t.clientHeight,
            scrollbarWidth: t.offsetWidth - t.clientWidth,
            computedScrollbarWidth: cs.scrollbarWidth,
            computedScrollbarColor: cs.scrollbarColor,
            lastBubbleRightGapToThread: Math.round(tr.right - br.right),
            lastBubbleBottomGap: Math.round(tr.bottom - br.bottom),
        };
    }"""
    )
    print("== thread metrics ==")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    # Mo menu tren tin CUOI (gan day thread - truong hop user keu bi cat)
    last = page.locator(".chat-row").last
    last.locator(".chat-bubble").first.click()
    page.wait_for_selector(".chat-menu", timeout=5000)
    page.wait_for_timeout(400)

    menu_metrics = page.evaluate(
        """() => {
        const t = document.querySelector('.chat-thread');
        const m = document.querySelector('.chat-menu');
        const mr = m.getBoundingClientRect();
        const tr = t.getBoundingClientRect();
        return {
            scrollTop_after: t.scrollTop,
            menu_top: Math.round(mr.top),
            menu_bottom: Math.round(mr.bottom),
            thread_top: Math.round(tr.top),
            thread_bottom: Math.round(tr.bottom),
            menu_clipped_below: mr.bottom > tr.bottom,
            menu_visible_px_without_scroll: Math.round(Math.min(mr.bottom, tr.bottom) - mr.top),
            menu_height: Math.round(mr.height),
        };
    }"""
    )
    print("== menu metrics (mo tren tin cuoi cung) ==")
    for k, v in menu_metrics.items():
        print(f"  {k}: {v}")

    page.screenshot(path=os.path.join(SHOTS, f"chat-ui-{TAG}.png"), full_page=False)
    # Clip vung scrollbar (canh phai thread)
    clip = page.evaluate(
        """() => { const r = document.querySelector('.chat-thread').getBoundingClientRect();
        return { x: r.right - 40, y: r.top, width: 40, height: Math.min(r.height, 400) }; }"""
    )
    page.screenshot(path=os.path.join(SHOTS, f"scrollbar-{TAG}.png"), clip=clip)
    print(f"screenshots: shots/chat-ui-{TAG}.png, shots/scrollbar-{TAG}.png")

    browser.close()
