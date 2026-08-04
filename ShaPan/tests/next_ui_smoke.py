import json
from pathlib import Path

from playwright.sync_api import sync_playwright


CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://127.0.0.1:4190"
OUTPUT_DIR = Path(r"C:\Users\4770_2070super\.codex\visualizations\2026\07\31\019fb8f3-55a0-7830-908d-337bf520d31b")


def layout(page):
    return page.evaluate(
        """() => ({
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            title: document.title,
            h1: document.querySelector('h1')?.textContent?.trim()
        })"""
    )


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    errors = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=CHROME, headless=True)
        desktop = browser.new_page(viewport={"width": 1440, "height": 900})
        desktop.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        desktop.goto(BASE_URL, wait_until="networkidle")

        assert desktop.locator("h1").inner_text() == "选择一场战役，接管一段不完整的战场态势。"
        assert desktop.get_by_text("台儿庄战役").is_visible()
        assert desktop.get_by_text("阿纳姆战役").is_visible()

        desktop.get_by_role("button", name="进入战局").first.click()
        desktop.get_by_text("战前待命 · 点击“开始战役”后接收第一批情报").wait_for(timeout=5000)
        assert desktop.get_by_text("战役尚未开始，收件台保持静默。").is_visible()
        desktop.get_by_role("button", name="开始战役").click()
        desktop.get_by_text("战役已开始 · 等待各部队回传情报").wait_for(timeout=5000)
        desktop.locator("textarea").fill("致第31师：固守东门，确认城墙缺口后立即回报。")
        desktop.get_by_role("button", name="发令").click()
        desktop.get_by_text("命令已进入通信队列").wait_for(timeout=5000)
        desktop.screenshot(path=OUTPUT_DIR / "shapan-next-desktop.png", full_page=True)
        desktop_layout = layout(desktop)

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        mobile.goto(BASE_URL, wait_until="networkidle")
        mobile.screenshot(path=OUTPUT_DIR / "shapan-next-mobile.png", full_page=True)
        mobile_layout = layout(mobile)
        browser.close()

    assert desktop_layout["scrollWidth"] == desktop_layout["innerWidth"]
    assert mobile_layout["scrollWidth"] == mobile_layout["innerWidth"]
    assert not errors, errors
    print(json.dumps({"desktop": desktop_layout, "mobile": mobile_layout, "consoleErrors": errors}, ensure_ascii=False))


if __name__ == "__main__":
    main()
