#!/usr/bin/env python3
"""
Fetches NYT article counts for "artificial intelligence" by year (1950-2026).
Requires: pip install playwright && playwright install chromium
"""

import asyncio
import json
import re
import sys

async def get_count_for_year(page, year):
    url = (
        f"https://www.nytimes.com/search"
        f"?startDate={year}-01-01&endDate={year}-12-31"
        f"&lang=en&query=%22artificial%20intelligence%22&sort=best"
    )
    try:
        await page.goto(url, timeout=30000)
        # Wait for the results count element to appear
        await page.wait_for_timeout(4000)

        # Try several selector patterns NYT uses for result counts
        selectors = [
            'p[data-testid="SearchForm-status"]',
            '[class*="search-results"] [class*="status"]',
            '[class*="SearchResults"] p',
            'p:has-text("result")',
            'p:has-text("match")',
        ]

        for selector in selectors:
            try:
                el = page.locator(selector).first
                text = await el.text_content(timeout=2000)
                if text:
                    # Extract number from text like "Showing 1-10 of 1,234 results"
                    nums = re.findall(r'[\d,]+', text)
                    if nums:
                        # Take the largest number found (the total)
                        count = max(int(n.replace(',', '')) for n in nums)
                        return count
            except Exception:
                continue

        # Fallback: search page source for count patterns
        content = await page.content()
        for pattern in [
            r'"numResults"\s*:\s*(\d+)',
            r'"hits"\s*:\s*(\d+)',
            r'(\d[\d,]*)\s+results?',
            r'(\d[\d,]*)\s+matches?',
        ]:
            m = re.search(pattern, content, re.IGNORECASE)
            if m:
                return int(m.group(1).replace(',', ''))

        return None

    except Exception as e:
        print(f"  Error for {year}: {e}", file=sys.stderr)
        return None


async def main():
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("Playwright not installed. Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    results = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()

        for year in range(1950, 2027):
            count = await get_count_for_year(page, year)
            results[year] = count
            print(f"{year}: {count}", flush=True)

        await browser.close()

    # Write JSON output
    with open("nyt_ai_counts.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\nSaved to nyt_ai_counts.json")
    print("\nJSON dump for copy-paste:")
    print(json.dumps(results))


if __name__ == "__main__":
    asyncio.run(main())
