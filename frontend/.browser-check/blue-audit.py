# Find remaining blue-family colors on the live site: scans every element's
# computed color / background / border color, plus focus box-shadows that
# embed Bootstrap's default blue rgb values.
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("APP_URL", "http://localhost:5173")
CHROME = os.environ.get(
    "CHROME_PATH", "/usr/lib64/chromium-browser/chromium-browser"
)

SCAN_JS = r"""
(() => {
    const BLUE_TOKENS = ["13, 110, 253", "49, 132, 253", "0, 102, 255"];
    const seen = new Map();
    const add = (desc, val) => {
        const key = desc + " :: " + val;
        seen.set(key, (seen.get(key) || 0) + 1);
    };
    const isBlue = (r, g, b) => b > 130 && b - r > 45 && b - g > 25;
    const parse = (s) => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return [ +m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4] ];
    };
    for (const el of document.querySelectorAll("body *")) {
        if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
        const cs = getComputedStyle(el);
        const desc = el.tagName.toLowerCase() +
            (el.className && typeof el.className === "string"
                ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
                : "");
        for (const prop of ["color", "backgroundColor", "borderTopColor", "borderBottomColor"]) {
            const rgba = parse(cs[prop]);
            if (!rgba) continue;
            const [r, g, b, a] = rgba;
            if (a > 0 && isBlue(r, g, b)) add(`${desc} ${prop}`, cs[prop]);
        }
        const sh = cs.boxShadow || "";
        for (const t of BLUE_TOKENS) if (sh.includes(t)) add(`${desc} boxShadow`, t);
    }
    return [...seen.entries()].map(([k, n]) => `${k} x${n}`).join("\n") || "CLEAN";
})()
"""

PAGES = ["/", "/rooms", "/rooms/1", "/map", "/login", "/register"]

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=CHROME,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    for path in PAGES:
        page.goto(BASE + path, wait_until="networkidle")
        page.wait_for_timeout(800)
        result = page.evaluate(SCAN_JS)
        print(f"== {path}")
        print(result if result != "CLEAN" else "   CLEAN")
    browser.close()
