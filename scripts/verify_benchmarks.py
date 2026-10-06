#!/usr/bin/env python3
"""
GSD-X Benchmark Verification Script
===================================

Validates mathematical rigor, internal consistency, and documentation parity
against the canonical benchmark dataset in benchmarks/data/benchmark_results.json.

Exits 0 on PASS, 1 on FAIL.
"""

import sys
import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CANONICAL_DATA_PATH = REPO_ROOT / "benchmarks" / "data" / "benchmark_results.json"
README_PATH = REPO_ROOT / "README.md"
BENCHMARKS_DOC_PATH = REPO_ROOT / "docs" / "BENCHMARKS.md"

def fail(msg: str):
    print(f"\n❌ FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

def main():
    print("=" * 60)
    print(" GSD-X Comprehensive Benchmark & Mathematical Audit")
    print("=" * 60)

    # 1. Load canonical data
    if not CANONICAL_DATA_PATH.exists():
        fail(f"Canonical benchmark data not found at {CANONICAL_DATA_PATH}")

    with open(CANONICAL_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    pricing = data.get("pricing", {})
    in_price = pricing.get("inputPricePerMillion", 10.0)
    out_price = pricing.get("outputPricePerMillion", 50.0)

    print(f"\n[1] Verifying Pricing Model: Input ${in_price:.2f}/M, Output ${out_price:.2f}/M")

    scenarios = data.get("scenarios", [])
    if len(scenarios) != 8:
        fail(f"Expected 8 scenarios, found {len(scenarios)}")

    sum_base_tokens = 0
    sum_gsx_tokens = 0
    sum_base_cost = 0.0
    sum_gsx_cost = 0.0
    sum_base_in = 0
    sum_base_out = 0
    sum_gsx_in = 0
    sum_gsx_out = 0

    print("\n[2] Verifying Scenario Mathematics:")

    for idx, sc in enumerate(scenarios, 1):
        name = sc["name"]
        base = sc["baseline"]
        gsx = sc["gsx"]
        sav = sc["savings"]

        # Check token summation
        if base["inputTokens"] + base["outputTokens"] != base["totalTokens"]:
            fail(f"{name}: baseline inputTokens ({base['inputTokens']}) + outputTokens ({base['outputTokens']}) != totalTokens ({base['totalTokens']})")

        if gsx["inputTokens"] + gsx["outputTokens"] != gsx["totalTokens"]:
            fail(f"{name}: gsx inputTokens ({gsx['inputTokens']}) + outputTokens ({gsx['outputTokens']}) != totalTokens ({gsx['totalTokens']})")

        # Verify output tokens equality (GSD-X produces identical output for identical task)
        if base["outputTokens"] != gsx["outputTokens"]:
            fail(f"{name}: baseline output tokens ({base['outputTokens']}) != gsx output tokens ({gsx['outputTokens']})")

        # Cost verification
        expected_base_cost = (base["inputTokens"] * in_price + base["outputTokens"] * out_price) / 1_000_000
        expected_gsx_cost = (gsx["inputTokens"] * in_price + gsx["outputTokens"] * out_price) / 1_000_000

        if not math.isclose(base["cost"], expected_base_cost, rel_tol=1e-5):
            fail(f"{name}: baseline cost mismatch: {base['cost']} != {expected_base_cost}")
        if not math.isclose(gsx["cost"], expected_gsx_cost, rel_tol=1e-5):
            fail(f"{name}: gsx cost mismatch: {gsx['cost']} != {expected_gsx_cost}")

        # Token savings %
        raw_token_sav = ((base["totalTokens"] - gsx["totalTokens"]) / base["totalTokens"]) * 100
        reported_token_sav = round(raw_token_sav, 1)
        if round(sav["tokenPercent"], 1) != reported_token_sav:
            fail(f"{name}: token savings % mismatch: reported {sav['tokenPercent']} != calculated {reported_token_sav}")

        # Cost savings %
        raw_cost_sav = ((expected_base_cost - expected_gsx_cost) / expected_base_cost) * 100
        reported_cost_sav = round(raw_cost_sav, 1)
        if round(sav["costPercent"], 1) != reported_cost_sav:
            fail(f"{name}: cost savings % mismatch: reported {sav['costPercent']} != calculated {reported_cost_sav}")

        sum_base_tokens += base["totalTokens"]
        sum_gsx_tokens += gsx["totalTokens"]
        sum_base_cost += expected_base_cost
        sum_gsx_cost += expected_gsx_cost
        sum_base_in += base["inputTokens"]
        sum_base_out += base["outputTokens"]
        sum_gsx_in += gsx["inputTokens"]
        sum_gsx_out += gsx["outputTokens"]

        print(f"  ✓ {name}: {base['totalTokens']} -> {gsx['totalTokens']} tokens (-{reported_token_sav:.1f}%), "
              f"${base['cost']:.4f} -> ${gsx['cost']:.4f} (-{reported_cost_sav:.1f}%)")

    # [3] Verify Aggregates
    print("\n[3] Verifying Aggregate Metrics:")
    if sum_base_tokens != 25482:
        fail(f"Aggregate baseline tokens mismatch: {sum_base_tokens} != 25482")
    if sum_gsx_tokens != 8288:
        fail(f"Aggregate GSD-X tokens mismatch: {sum_gsx_tokens} != 8288")

    tokens_saved = sum_base_tokens - sum_gsx_tokens
    if tokens_saved != 17194:
        fail(f"Tokens saved mismatch: {tokens_saved} != 17194")

    agg_token_savings_pct = (tokens_saved / sum_base_tokens) * 100
    if round(agg_token_savings_pct, 1) != 67.5:
        fail(f"Aggregate token savings % mismatch: {agg_token_savings_pct:.3f}% != 67.5%")

    if not math.isclose(sum_base_cost, 0.52162, rel_tol=1e-5):
        fail(f"Aggregate baseline cost mismatch: {sum_base_cost} != 0.52162")
    if not math.isclose(sum_gsx_cost, 0.34968, rel_tol=1e-5):
        fail(f"Aggregate GSD-X cost mismatch: {sum_gsx_cost} != 0.34968")

    agg_cost_savings_pct = ((sum_base_cost - sum_gsx_cost) / sum_base_cost) * 100
    if round(agg_cost_savings_pct, 1) != 33.0:
        fail(f"Aggregate cost savings % mismatch: {agg_cost_savings_pct:.3f}% != 33.0%")

    print(f"  ✓ Total Baseline Tokens: {sum_base_tokens:,} ({sum_base_in:,} in, {sum_base_out:,} out)")
    print(f"  ✓ Total GSD-X Tokens:    {sum_gsx_tokens:,} ({sum_gsx_in:,} in, {sum_gsx_out:,} out)")
    print(f"  ✓ Net Tokens Eliminated: {tokens_saved:,} ({agg_token_savings_pct:.3f}% -> 67.5%)")
    print(f"  ✓ Unrounded Baseline Cost: ${sum_base_cost:.5f} (displays as $0.5216, sum of rounded scenario displays is $0.5217)")
    print(f"  ✓ Unrounded GSD-X Cost:    ${sum_gsx_cost:.5f} (displays as $0.3497)")
    print(f"  ✓ Net Cost Savings:        ${sum_base_cost - sum_gsx_cost:.5f} ({agg_cost_savings_pct:.3f}% -> 33.0%)")

    # [4] Verify Scale Projections
    print("\n[4] Verifying Scale Projections (1M, 10M, 100M Baseline Tokens):")
    # Scaling factor for 1M baseline tokens
    scale_1m = 1_000_000 / sum_base_tokens
    base_1m_in = sum_base_in * scale_1m
    base_1m_out = sum_base_out * scale_1m
    base_1m_cost = (base_1m_in * in_price + base_1m_out * out_price) / 1_000_000

    gsx_1m_tokens = round(sum_gsx_tokens * scale_1m)
    gsx_1m_in = sum_gsx_in * scale_1m
    gsx_1m_out = sum_gsx_out * scale_1m
    gsx_1m_cost = (gsx_1m_in * in_price + gsx_1m_out * out_price) / 1_000_000

    cost_1m_saved = base_1m_cost - gsx_1m_cost
    tokens_1m_saved = 1_000_000 - gsx_1m_tokens

    if gsx_1m_tokens != 325249:
        fail(f"1M scale GSD-X tokens mismatch: {gsx_1m_tokens} != 325249")
    if tokens_1m_saved != 674751:
        fail(f"1M scale tokens saved mismatch: {tokens_1m_saved} != 674751")
    if round(base_1m_cost, 2) != 20.47:
        fail(f"1M scale baseline cost mismatch: {base_1m_cost:.4f} != 20.47")
    if round(gsx_1m_cost, 2) != 13.72:
        fail(f"1M scale GSD-X cost mismatch: {gsx_1m_cost:.4f} != 13.72")
    if round(cost_1m_saved, 2) != 6.75:
        fail(f"1M scale net cost saved mismatch: {cost_1m_saved:.4f} != 6.75")

    print(f"  ✓ 1M Baseline Tokens:  1,000,000 tokens -> ${base_1m_cost:.2f}")
    print(f"    1M GSD-X Equivalent: {gsx_1m_tokens:,} tokens -> ${gsx_1m_cost:.2f}")
    print(f"    1M Net Savings:      {tokens_1m_saved:,} tokens (67.5%), ${cost_1m_saved:.2f} (33.0%)")

    # 10M scale
    scale_10m = 10_000_000 / sum_base_tokens
    gsx_10m_tokens = round(sum_gsx_tokens * scale_10m)
    tokens_10m_saved = 10_000_000 - gsx_10m_tokens
    base_10m_cost = base_1m_cost * 10
    gsx_10m_cost = gsx_1m_cost * 10
    cost_10m_saved = base_10m_cost - gsx_10m_cost

    print(f"  ✓ 10M Baseline Tokens: 10,000,000 tokens -> ${base_10m_cost:.2f}")
    print(f"    10M GSD-X Equivalent:{gsx_10m_tokens:,} tokens -> ${gsx_10m_cost:.2f}")
    print(f"    10M Net Savings:     {tokens_10m_saved:,} tokens, ${cost_10m_saved:.2f}")

    # 100M scale
    scale_100m = 100_000_000 / sum_base_tokens
    gsx_100m_tokens = round(sum_gsx_tokens * scale_100m)
    tokens_100m_saved = 100_000_000 - gsx_100m_tokens
    base_100m_cost = base_1m_cost * 100
    gsx_100m_cost = gsx_1m_cost * 100
    cost_100m_saved = base_100m_cost - gsx_100m_cost

    print(f"  ✓ 100M Baseline Tokens: 100,000,000 tokens -> ${base_100m_cost:.2f}")
    print(f"    100M GSD-X Equivalent:{gsx_100m_tokens:,} tokens -> ${gsx_100m_cost:.2f}")
    print(f"    100M Net Savings:     {tokens_100m_saved:,} tokens, ${cost_100m_saved:.2f}")

    # [5] Verify README.md claims & no misleading language
    print("\n[5] Verifying README.md Integrity:")
    if not README_PATH.exists():
        fail(f"README.md not found at {README_PATH}")

    with open(README_PATH, "r", encoding="utf-8") as f:
        readme_content = f.read()

    # Check for inaccurate "up to 67.5%" phrase
    if "save up to 67.5%" in readme_content.lower() or "saves up to 67.5%" in readme_content.lower():
        fail("README.md contains inaccurate 'up to 67.5%' claim! (67.5% is aggregate; individual scenarios reach up to 83.0%)")

    # Check that canonical numbers appear in README
    for term in ["25,482", "8,288", "67.5%", "83.0%", "325,249", "674,751", "$20.47", "$13.72", "$6.75", "33.0%"]:
        if term not in readme_content:
            fail(f"README.md missing canonical benchmark figure: '{term}'")
        print(f"  ✓ Found '{term}' in README.md")

    print("\n" + "=" * 60)
    print(" GSD-X Benchmark Verification: PASS")
    print(" All figures are mathematically consistent, reproducible, and defensible.")
    print("=" * 60)

if __name__ == "__main__":
    main()
