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
import urllib.error


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

    # Debug: print structure if unexpected
    if "response" not in data or "meta" not in data.get("response", {}):
        print(f"  Unexpected response: {json.dumps(data)[:300]}", file=sys.stderr)
        return None

    return data["response"]["meta"]["hits"]


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fetch_nyt_counts_api.py YOUR_API_KEY")
        print("Get a free key at: https://developer.nytimes.com/get-started")
        sys.exit(1)

    api_key = sys.argv[1]
    results = {}

    # Load existing results so we can resume if interrupted
    try:
        with open("nyt_ai_counts.json") as f:
            results = {int(k): v for k, v in json.load(f).items()}
        print(f"Resuming from existing nyt_ai_counts.json ({len(results)} years already done)")
    except FileNotFoundError:
        pass

    for year in range(1950, 2027):
        if year in results and results[year] is not None:
            print(f"{year}: {results[year]} (cached)", flush=True)
            continue

        retries = 3
        for attempt in range(retries):
            try:
                count = get_count_for_year(api_key, year)
                results[year] = count
                print(f"{year}: {count}", flush=True)
                break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait = 30 * (attempt + 1)
                    print(f"{year}: rate limited, waiting {wait}s...", file=sys.stderr)
                    time.sleep(wait)
                else:
                    print(f"{year}: HTTP {e.code} - {e}", file=sys.stderr)
                    results[year] = None
                    break
            except Exception as e:
                print(f"{year}: ERROR - {e}", file=sys.stderr)
                results[year] = None
                break

        # Save after every year so progress isn't lost
        with open("nyt_ai_counts.json", "w") as f:
            json.dump(results, f, indent=2)

        # 13 seconds between requests = ~4.5 req/min, well under the 10/min limit
        time.sleep(13)

    print("\nAll done! Saved to nyt_ai_counts.json")
    print("\nJSON dump for copy-paste:")
    print(json.dumps({str(y): results.get(y) for y in range(1950, 2027)}))


if __name__ == "__main__":
    main()
