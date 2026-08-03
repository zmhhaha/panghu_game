import json

from playwright.sync_api import sync_playwright


CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto("http://127.0.0.1:4186", wait_until="networkidle")

        layout = page.evaluate(
            """() => ({
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                tabs: [...document.querySelectorAll('[data-view]')].map((element) => ({
                    text: element.textContent.trim(),
                    left: Math.round(element.getBoundingClientRect().left),
                    right: Math.round(element.getBoundingClientRect().right)
                }))
            })"""
        )

        grid_layer = page.locator("[data-layer-group='grid']")
        assert grid_layer.is_visible()
        page.click("[data-layer='grid']")
        assert not grid_layer.is_visible()
        page.click("[data-layer='grid']")
        assert grid_layer.is_visible()

        page.select_option("#scenarioSelect", "arnhem")
        assert page.locator("#battleName").inner_text() == "阿纳姆战役"
        assert page.locator("#mapHeading").inner_text() == "阿纳姆地区作战图"
        assert "arnhem-map" in page.locator("#mapCanvas .battle-map").get_attribute("class")
        assert page.locator("#recipient option").first.inner_text() == "第1伞兵旅"
        page.select_option("#scenarioSelect", "taierzhuang")
        assert page.locator("#battleName").inner_text() == "台儿庄战役"

        page.click("[data-view='orders']")
        page.fill(
            "#orderText",
            "致第31师：坚守台儿庄东门，确认城墙缺口后报告。",
        )
        queue_before = page.locator("#queueCount").inner_text()
        page.click("#sendOrder")
        queue_after = page.locator("#queueCount").inner_text()
        toast = page.locator("#toast").inner_text()

        page.click("#pauseButton")
        clock_before = page.locator("#battleClock").inner_text()
        page.wait_for_timeout(1200)
        clock_after = page.locator("#battleClock").inner_text()

        browser.close()

    result = {
        "layout": layout,
        "queueBefore": queue_before,
        "queueAfter": queue_after,
        "toast": toast,
        "pausedClockStable": clock_before == clock_after,
        "clock": clock_after,
    }
    print(json.dumps(result, ensure_ascii=False))

    assert layout["innerWidth"] == 390
    assert layout["scrollWidth"] == 390
    assert layout["tabs"][-1]["right"] == 390
    assert queue_before == "2 项"
    assert queue_after == "3 项"
    assert clock_before == clock_after


if __name__ == "__main__":
    main()
