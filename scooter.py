"""
Scooter-buying strategy optimizer.

A strategy is a subset of the available prices. We evaluate it by considering
every price as a possible "target" (the cheapest acceptable scooter). For each
target T we simulate buying strategy scooters in ascending order until we reach
one whose price >= T; the total spent is the cost. Waste is measured as either
  difference: cost - T
  ratio:      cost / T
The strategy's score is the worst-case (max) waste across all targets. We want
the strategy with the lowest score.

The strategy must include the most expensive price, otherwise targets at or
above it can never be satisfied (infinite cost).
"""

from itertools import combinations


def strategy_cost(sorted_strategy, target):
    """Total money spent buying from sorted_strategy until reaching target."""
    total = 0
    for price in sorted_strategy:
        total += price
        if price >= target:
            return total
    return float('inf')  # target unreachable


def evaluate_strategy(prices, strategy, metric):
    """Max waste over all target prices."""
    ss = sorted(strategy)
    worst = 0.0
    for target in prices:
        cost = strategy_cost(ss, target)
        if cost == float('inf'):
            return float('inf')
        waste = (cost / target) if metric == 'ratio' else (cost - target)
        if waste > worst:
            worst = waste
    return worst


def best_strategy(prices, metric='ratio'):
    """
    Exhaustive search over all subsets of prices.

    Returns (best_subset, best_score).  O(2^n * n), practical for n <= ~22.

    Parameters
    ----------
    prices : list of numbers   – available scooter prices (need not be sorted)
    metric : 'ratio' or 'difference'
    """
    prices = sorted(set(prices))
    n = len(prices)
    if n == 0:
        return [], 0.0

    top = prices[-1]          # must be in every valid strategy
    rest = prices[:-1]        # remaining prices to include or skip

    best_subset = None
    best_score = float('inf')

    for r in range(len(rest) + 1):
        for combo in combinations(rest, r):
            strategy = list(combo) + [top]
            score = evaluate_strategy(prices, strategy, metric)
            if score < best_score:
                best_score = score
                best_subset = strategy

    return sorted(best_subset), best_score


def show(prices, metric='ratio'):
    subset, score = best_strategy(prices, metric)
    print(f"Prices   : {prices}")
    print(f"Metric   : {metric}")
    print(f"Strategy : {subset}")
    if metric == 'ratio':
        print(f"Worst ratio  : {score:.4f}  (spent {score:.2f}x the target price)")
    else:
        print(f"Worst overspend: ${score:.2f}")
    print()
    # Per-target breakdown
    ss = sorted(subset)
    print(f"  {'Target':>8}  {'Cost':>8}  {'Waste':>10}")
    print(f"  {'-'*8}  {'-'*8}  {'-'*10}")
    for t in sorted(set(prices)):
        cost = strategy_cost(ss, t)
        waste = (cost / t) if metric == 'ratio' else (cost - t)
        print(f"  {t:>8}  {cost:>8}  {waste:>10.4f}")
    print()


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        # Usage: python scooter.py 10 20 30 50 100 [ratio|difference]
        args = sys.argv[1:]
        metric = 'ratio'
        if args[-1] in ('ratio', 'difference'):
            metric = args[-1]
            args = args[:-1]
        prices = [float(x) for x in args]
        show(prices, metric)
    else:
        # Built-in demo
        demo_prices = [10, 20, 30, 50, 100]
        show(demo_prices, 'ratio')
        show(demo_prices, 'difference')
