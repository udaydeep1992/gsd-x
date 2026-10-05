# GSD-X Token & Cost Benchmark Report

**Date:** 2026-10-05
**Model:** `claude-3-7-sonnet` ($3/M in, $15/M out)
**Aggregate Savings:** **67.5%** fewer tokens | **33%** lower cost
**Range:** Best: 83% | Median: 71.3% | Worst: 49.7%

## Detailed Scenario Breakdown

| Scenario | Category | Upstream Baseline | GSD-X | Tokens Saved | Token Savings % | Est. Cost Savings |
|---|---|---:|---:|---:|---:|---:|
| Scenario 1: Simple Task | `trivial` | 2,253 | 382 | 1,871 | **83%** | $0.0056 |
| Scenario 2: Small Bug | `small` | 2,977 | 592 | 2,385 | **80.1%** | $0.0072 |
| Scenario 3: Feature | `medium` | 3,655 | 1,302 | 2,353 | **64.4%** | $0.0071 |
| Scenario 4: Complex Feature | `large` | 4,954 | 2,146 | 2,808 | **56.7%** | $0.0084 |
| Scenario 5: Brownfield Feature | `medium` | 3,409 | 1,056 | 2,353 | **69%** | $0.0071 |
| Scenario 6: Repeated Knowledge | `medium` | 3,211 | 920 | 2,291 | **71.3%** | $0.0069 |
| Scenario 7: Long-running Project Simulation | `large` | 2,665 | 1,341 | 1,324 | **49.7%** | $0.0040 |
| Scenario 8: Memory Recall | `small` | 2,358 | 549 | 1,809 | **76.7%** | $0.0054 |

*Note: Costs calculated based on configurable `benchmarks/pricing.json`.*