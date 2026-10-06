# GSD-X Token & Cost Benchmark Report

**Date:** 2026-10-06
**Model:** `fable-5` ($10.00/M in, $50.00/M out)
**Aggregate Savings:** **67.5%** fewer tokens | **33.0%** lower cost
**Range:** Best: 83.0% | Median: 71.3% | Worst: 49.7%

## Detailed Scenario Breakdown

| Scenario | Category | Upstream Baseline | GSD-X | Tokens Saved | Token Savings % | Baseline Cost | GSD-X Cost | Est. Cost Savings | Cost Savings % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Scenario 1: Simple Task | `trivial` | 2,253 | 382 | 1,871 | **83.0%** | $0.0325 | $0.0138 | $0.0187 | **57.5%** |
| Scenario 2: Small Bug | `small` | 2,977 | 592 | 2,385 | **80.1%** | $0.0466 | $0.0227 | $0.0238 | **51.2%** |
| Scenario 3: Feature | `medium` | 3,655 | 1,302 | 2,353 | **64.4%** | $0.0805 | $0.0570 | $0.0235 | **29.2%** |
| Scenario 4: Complex Feature | `large` | 4,954 | 2,146 | 2,808 | **56.7%** | $0.1235 | $0.0955 | $0.0281 | **22.7%** |
| Scenario 5: Brownfield Feature | `medium` | 3,409 | 1,056 | 2,353 | **69.0%** | $0.0681 | $0.0446 | $0.0235 | **34.6%** |
| Scenario 6: Repeated Knowledge | `medium` | 3,211 | 920 | 2,291 | **71.3%** | $0.0581 | $0.0352 | $0.0229 | **39.4%** |
| Scenario 7: Long-running Project Simulation | `large` | 2,665 | 1,341 | 1,324 | **49.7%** | $0.0746 | $0.0614 | $0.0132 | **17.7%** |
| Scenario 8: Memory Recall | `small` | 2,358 | 549 | 1,809 | **76.7%** | $0.0376 | $0.0195 | $0.0181 | **48.1%** |
| **AGGREGATE TOTAL** | `portfolio` | **25,482** | **8,288** | **17,194** | **67.5%** | **$0.5216** | **$0.3497** | **$0.1719** | **33.0%** |

*Note: Costs calculated based on configurable `benchmarks/pricing.json`. Aggregate costs computed from unrounded sums ($0.52162 baseline displaying as $0.5216, $0.34968 GSD-X displaying as $0.3497).*
