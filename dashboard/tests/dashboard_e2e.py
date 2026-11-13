"""Browser regression checks. Start Vite on port 5177 before running this script."""
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("DASHBOARD_TEST_URL", "http://127.0.0.1:5177")
ARTIFACTS = Path(__file__).resolve().parents[2] / "test-results"


def attack(identifier=1, **overrides):
    return {
        "id": identifier,
        "timestamp": "2026-11-13 00:00:00",
        "ip": f"192.0.2.{identifier}",
        "country": "DE",
        "method": "GET",
        "path": "/admin/config",
        "reason": "Probed restricted path",
        "decoy_served": '{"records": [{"name": "Example record"}]}',
        **overrides,
    }


def run():
    ARTIFACTS.mkdir(exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        errors = []

        def new_page(payload=None, clock=False, width=1440):
            context = browser.new_context(viewport={"width": width, "height": 1000}, reduced_motion="reduce")
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            # Tests must not depend on the public font service.
            page.route("https://fonts.googleapis.com/**", lambda route: route.abort())
            if payload is not None:
                page.route("**/_aegis/stats", lambda route: route.fulfill(json=payload))
            if clock:
                page.clock.install()
            return context, page

        # Exercise the real local Worker route and its honest disconnected state.
        context, page = new_page()
        assert page.request.get(BASE_URL + "/_aegis/stats").status == 503
        page.goto(BASE_URL)
        expect(page.get_by_role("heading", name="Honeypot security overview.")).to_be_visible()
        expect(page.get_by_role("alert")).to_contain_text("HTTP 503")
        expect(page.get_by_test_id("attack-total")).to_have_text("—")
        expect(page.locator("tbody tr")).to_have_count(0)
        assert page.locator("body").evaluate("element => getComputedStyle(element).backgroundColor") in ("rgba(0, 0, 0, 0)", "rgb(8, 12, 20)")
        assert page.locator("#overview > div").first.evaluate("element => getComputedStyle(element).borderRadius") == "16px"
        page.get_by_role("button", name="View demo").click()
        expect(page.get_by_test_id("attack-total")).to_have_text("12,482")
        expect(page.locator("tbody tr")).to_have_count(6)
        expect(page.get_by_text("Demo mode.", exact=False)).to_be_visible()
        page.screenshot(path=str(ARTIFACTS / "dashboard-demo-desktop.png"), full_page=True)
        page.get_by_role("button", name="Use live API").click()
        expect(page.get_by_role("alert")).to_be_visible()
        expect(page.get_by_test_id("attack-total")).to_have_text("—")
        context.close()
        print("PASS: real Worker 503, no fabricated live metrics, explicit demo and return to live")

        context, page = new_page([attack(), attack(2, country="US", path="/.env")])
        page.goto(BASE_URL)
        expect(page.get_by_role("heading", name="Honeypot security overview.")).to_be_visible()
        expect(page.get_by_test_id("attack-total")).to_have_text("2")
        expect(page.get_by_text("Recent feed count.", exact=False)).to_be_visible()
        expect(page.locator("tbody")).to_contain_text("192.0.2.1")
        expect(page.locator("tbody")).to_contain_text("DE")
        expect(page.locator("tbody")).to_contain_text("/.env")
        expect(page.locator("tbody")).to_contain_text("Probed restricted path")
        page.screenshot(path=str(ARTIFACTS / "dashboard-live-desktop.png"), full_page=True)
        context.close()
        print("PASS: raw API array renders source, country, path, reason and accurate feed count")

        context, page = new_page(clock=True)
        current = {"payload": {"intercepted": [attack()], "total": 200}, "fail": False}
        requests = []

        def stats_route(route):
            requests.append(route.request.url)
            route.fulfill(status=503, json={"error": "Offline"}) if current["fail"] else route.fulfill(json=current["payload"])

        page.route("**/_aegis/stats", stats_route)
        page.goto(BASE_URL)
        expect(page.get_by_test_id("attack-total")).to_have_text("200")
        initial_requests = len(requests)
        current["payload"] = {"intercepted": [attack(), attack(2)], "total": 201}
        page.clock.run_for(2999)
        assert len(requests) == initial_requests, "poll fired before 3 seconds"
        expect(page.get_by_test_id("attack-total")).to_have_text("200")
        page.clock.run_for(1)
        expect(page.get_by_test_id("attack-total")).to_have_text("201")
        expect(page.locator("tbody tr")).to_have_count(2)
        current["fail"] = True
        page.clock.run_for(3000)
        expect(page.get_by_role("alert")).to_contain_text("last successful response")
        expect(page.get_by_test_id("attack-total")).to_have_text("201")
        current["fail"] = False
        current["payload"] = {"intercepted": [], "total": 202}
        page.clock.run_for(3000)
        expect(page.get_by_test_id("attack-total")).to_have_text("202")
        expect(page.get_by_role("alert")).to_have_count(0)
        expect(page.get_by_text("No intercepted requests in this feed yet.")).to_be_visible()
        page.get_by_role("button", name="View demo").click()
        before_demo = len(requests)
        page.clock.run_for(12000)
        assert len(requests) == before_demo, "live polling continued in demo mode"
        context.close()
        print("PASS: exact 3-second polling, all-time total, stale-data retention, recovery, polling cleanup in demo")

        for payload in ({}, {"intercepted": "invalid"}, [attack(reason=None)], [attack(), attack()], {"intercepted": [attack()], "total": -1}):
            context, page = new_page(payload)
            page.goto(BASE_URL)
            expect(page.get_by_role("alert")).to_be_visible()
            expect(page.get_by_test_id("attack-total")).to_have_text("—")
            expect(page.locator("tbody tr")).to_have_count(0)
            context.close()
        print("PASS: malformed JSON shapes, missing fields, duplicate IDs and invalid totals fail safely")

        unsafe_text = '<script>window.__attackExecuted = true</script>'
        context, page = new_page([attack(reason=unsafe_text, decoy_served=unsafe_text)], width=390)
        page.goto(BASE_URL)
        expect(page.get_by_role("heading", name="Honeypot security overview.")).to_be_visible()
        expect(page.locator("tbody")).to_contain_text(unsafe_text)
        page.get_by_role("button", name="Inspect decoy for 192.0.2.1").click()
        expect(page.get_by_role("dialog")).to_be_visible()
        expect(page.get_by_role("dialog")).to_contain_text(unsafe_text)
        assert page.evaluate("window.__attackExecuted") is None
        page.keyboard.press("Escape")
        expect(page.get_by_role("dialog")).to_have_count(0)
        expect(page.get_by_role("button", name="Inspect decoy for 192.0.2.1")).to_be_focused()
        # Only the table region should scroll horizontally on a phone.
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert page.get_by_role("region", name="Recent attacks table").evaluate("element => element.scrollWidth > element.clientWidth")
        page.screenshot(path=str(ARTIFACTS / "dashboard-mobile.png"), full_page=True)
        context.close()
        print("PASS: mobile layout, scrollable table, decoy inspection, Escape/focus restore, safe text rendering")

        context, page = new_page([])
        page.goto(BASE_URL)
        expect(page.get_by_test_id("attack-total")).to_have_text("0")
        expect(page.get_by_text("No intercepted requests in this feed yet.")).to_be_visible()
        page.get_by_role("button", name="Refresh attack data").click()
        expect(page.get_by_test_id("attack-total")).to_have_text("0")
        context.close()
        print("PASS: empty feed and manual refresh")

        browser.close()
        assert not errors, f"Browser JavaScript errors: {errors}"
        print("PASS: no browser JavaScript errors in any scenario")


if __name__ == "__main__":
    run()
