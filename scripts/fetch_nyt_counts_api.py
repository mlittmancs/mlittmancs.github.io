#!/usr/bin/env python3
"""
Fetches NYT article counts for "artificial intelligence" by year (1950-2026)
using the official NYT Article Search API.

Get a free API key at: https://developer.nytimes.com/get-started
Usage: python3 fetch_nyt_counts_api.py YOUR_API_KEY
"""

import json
import sys
import time
import urllib.request
import urllib.parse


def get_count_for_year(api_key, year):
    params = urllib.parse.urlencode({
        "q": '"artificial intelligence"',
        "begin_date": f"{year}0101",
        "end_date": f"{year}1231",
        "api-key": api_key,
        "page": 0,
    })
    url = f"https://api.nytimes.com/svc/search/v2/articlesearch.json?{params}"

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    return data["response"]["meta"]["hits"]


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fetch_nyt_counts_api.py YOUR_API_KEY")
        print("Get a free key at: https://developer.nytimes.com/get-started")
        sys.exit(1)

    api_key = sys.argv[1]
    results = {}

    for year in range(1950, 2027):
        try:
            count = get_count_for_year(api_key, year)
            results[year] = count
            print(f"{year}: {count}", flush=True)
        except Exception as e:
            print(f"{year}: ERROR - {e}", file=sys.stderr)
            results[year] = None

        # NYT API rate limit: 10 requests/minute for free tier
        time.sleep(6)

    with open("nyt_ai_counts.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\nSaved to nyt_ai_counts.json")
    print("\nJSON dump for copy-paste:")
    print(json.dumps(results))


if __name__ == "__main__":
    main()
