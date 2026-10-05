# GSD-X Token & Cost Benchmark Report

**Date:** 2026-10-05
**Model:** `claude-opus-5` ($10/M in, $50/M out)
**Aggregate Savings:** **67.5%** fewer tokens | **33%** lower cost
**Range:** Best: 83% | Median: 71.3% | Worst: 49.7%

## Detailed Scenario Breakdown

| Scenario | Category | Upstream Baseline | GSD-X | Tokens Saved | Token Savings % | Est. Cost Savings |
|---|---|---:|---:|---:|---:|---:|
| Scenario 1: Simple Task | `trivial` | 2,253 | 382 | 1,871 | **83%** | $0.0187 |
| Scenario 2: Small Bug | `small` | 2,977 | 592 | 2,385 | **80.1%** | $0.0238 |
| Scenario 3: Feature | `medium` | 3,655 | 1,302 | 2,353 | **64.4%** | $0.0235 |
| Scenario 4: Complex Feature | `large` | 4,954 | 2,146 | 2,808 | **56.7%** | $0.0281 |
| Scenario 5: Brownfield Feature | `medium` | 3,409 | 1,056 | 2,353 | **69%** | $0.0235 |
| Scenario 6: Repeated Knowledge | `medium` | 3,211 | 920 | 2,291 | **71.3%** | $0.0229 |
| Scenario 7: Long-running Project Simulation | `large` | 2,665 | 1,341 | 1,324 | **49.7%** | $0.0132 |
| Scenario 8: Memory Recall | `small` | 2,358 | 549 | 1,809 | **76.7%** | $0.0181 |

*Note: Costs calculated based on configurable `benchmarks/pricing.json`.*