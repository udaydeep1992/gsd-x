# GSD-X Benchmark Report: Token & Cost Efficiency

> **Empirical Validation**: Real, reproducible token and cost measurements comparing upstream Open GSD Core with GSD-X across 8 standardized software engineering scenarios on **Fable 5**.

---

## 1. Executive Summary

GSD-X was designed to prove that **semantic memory and intelligent context compilation can replace redundant context, rather than simply adding more context**.

To validate this empirically, an automated benchmark harness was built (`benchmarks/run-benchmark.cjs`) that executes identical software development scenarios through both upstream GSD and GSD-X pipelines.

### Key Measured Results
- **Benchmark Model**: **Fable 5** ($10.00 / 1M input tokens, $50.00 / 1M output tokens).
- **Aggregate Token Savings**: **67.5%** (25,482 baseline tokens reduced to 8,288 tokens).
- **Individual Scenario Savings**: **49.7% to 83.0%** across tasks.
- **Median Token Savings**: **71.3%**.
- **Cost Reduction**: **33.0%** net cost savings on Fable 5 pricing ($0.5216 down to $0.3497).
- **Authoritative Dataset**: Recorded in [`benchmarks/data/benchmark_results.json`](../benchmarks/data/benchmark_results.json) from commit `13d37238ba08377929e4850fd6ae4b8db49a22ca`.

---

## 2. Benchmark Scenarios

The suite evaluates 8 distinct, realistic development scenarios:

| # | Scenario ID | Description |
|:---:|:---|:---|
| 1 | `simple-task` | Status query, version check, or documentation typo fix. Minimal context required. |
| 2 | `small-bug` | Localized bug fix with stack trace. Requires error context and targeted symbol outline. |
| 3 | `feature` | Standard phase execution. Needs spec, requirements, and active phase plan. |
| 4 | `complex-feature` | Cross-cutting system implementation requiring multiple architecture documents and API contracts. |
| 5 | `brownfield-feature` | Feature implementation in an existing codebase with legacy code maps and conventions. |
| 6 | `repeated-knowledge` | Task referencing architectural decisions and database schema facts from prior sessions. |
| 7 | `long-running-project`| Simulated multi-session project with extensive historical planning docs and summaries. |
| 8 | `memory-recall` | Query regarding why a specific historical architectural decision was made. |

---

## 3. Detailed Measured Results

All costs calculated on **Fable 5** ($10.00/1M input, $50.00/1M output):

| Scenario | Upstream Baseline (Tokens) | GSD-X (Tokens) | Token Savings (%) | Baseline Cost (USD) | GSD-X Cost (USD) | Cost Savings (%) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Simple Task** | 2,253 | 382 | **83.0%** | $0.0325 | $0.0138 | **57.5%** |
| **2. Small Bug** | 2,977 | 592 | **80.1%** | $0.0466 | $0.0227 | **51.2%** |
| **3. Feature** | 3,655 | 1,302 | **64.4%** | $0.0806 | $0.0570 | **29.2%** |
| **4. Complex Feature** | 4,954 | 2,146 | **56.7%** | $0.1235 | $0.0955 | **22.7%** |
| **5. Brownfield Feature** | 3,409 | 1,056 | **69.0%** | $0.0681 | $0.0446 | **34.6%** |
| **6. Repeated Knowledge** | 3,211 | 920 | **71.3%** | $0.0581 | $0.0352 | **39.4%** |
| **7. Long-running Project** | 2,665 | 1,341 | **49.7%** | $0.0747 | $0.0614 | **17.7%** |
| **8. Memory Recall** | 2,358 | 549 | **76.7%** | $0.0376 | $0.0195 | **48.1%** |
| **OVERALL TOTAL** | **25,482** | **8,288** | **67.5%** | **$0.5216** | **$0.3497** | **33.0%** |

*Note on cost rounding: Baseline unrounded aggregate cost is $0.52162 (displaying as $0.5216); GSD-X unrounded aggregate cost is $0.34968 (displaying as $0.3497). Summing the 4-decimal rounded display values yields $0.5217 baseline and $0.3497 GSD-X due to rounding accumulation (+0.00008 across 8 scenarios).*

---

## 4. How We Calculate Savings

```text
TOKEN REDUCTION
Baseline Tokens: 25,482 (18,812 input + 6,670 output)
GSD-X Tokens:     8,288 (1,618 input + 6,670 output)
Tokens Saved:    17,194
Aggregate Token Savings = (25,482 − 8,288) ÷ 25,482 × 100 = 67.475% ≈ 67.5%
(Individual scenario reductions reach up to 83.0%)

COST REDUCTION (Fable 5: $10/M input, $50/M output)
Baseline Cost: (18,812 × $10 ÷ 1M) + (6,670 × $50 ÷ 1M) = $0.18812 + $0.33350 = $0.52162
GSD-X Cost:    (1,618 × $10 ÷ 1M) + (6,670 × $50 ÷ 1M)  = $0.01618 + $0.33350 = $0.34968
Net Cost Saved: $0.52162 − $0.34968 = $0.17194
Cost Savings = ($0.52162 − $0.34968) ÷ $0.52162 × 100 = 32.963% ≈ 33.0%

WHY TOKEN REDUCTION (67.5%) ≠ COST REDUCTION (33.0%)
Output tokens are priced 5× higher than input tokens ($50/M vs $10/M).
GSD-X achieves token reduction by eliminating redundant input context
(specs, maps, stale summaries) while producing identical, complete code output (6,670 tokens).
Because constant output tokens represent 64% of baseline cost,
monetary savings is 33.0% even while total token volume drops 67.5%.
```

---

## 5. Impact at Scale: Baseline vs. GSD-X Equivalent Workload

When projecting token and cost efficiency at scale, the empirical 67.5% token reduction and 33.0% cost reduction translate into significant operational savings:

| Metric | Upstream Baseline Workload | GSD-X Equivalent Workload | Net Savings with GSD-X |
|:---|:---:|:---:|:---:|
| **1M Baseline Tokens** | 1,000,000 tokens | 325,249 tokens | **674,751 tokens saved (67.5% reduction)** |
| **Fable 5 Cost (1M)** | $20.47 | $13.72 | **$6.75 saved per 1M tokens (33.0% cost reduction)** |
| **At 10M Baseline Tokens** | 10,000,000 tokens ($204.70) | 3,252,492 tokens ($137.23) | **6,747,508 tokens eliminated \| $67.47 saved** |
| **At 100M Baseline Tokens**| 100,000,000 tokens ($2,046.99) | 32,524,920 tokens ($1,372.26) | **67,475,080 tokens eliminated \| $674.73 saved** |

*Note on scaling math: Scaling values use exact linear extrapolation from unrounded benchmark data ($20.4699 baseline and $13.7226 GSD-X per 1M baseline tokens). Direct multiples of the rounded 1M rate ($20.47, $13.72, $6.75) yield $204.70 / $137.20 / $67.50 at 10M and $2,047.00 / $1,372.00 / $675.00 at 100M.*

> **Key Takeaway**: For every 1,000,000 tokens an autonomous agent workflow would consume using standard GSD, GSD-X compiles and delivers the required context in only **325,249 tokens**—saving **$6.75 per million tokens** under Fable 5 while preventing context window pollution and hallucination.

---

## 6. Cost Analysis Across Model Providers

Using the measured token consumption from our benchmark, we project costs across major AI providers (scaled to 1,000 benchmark suite runs, representing 8,000 standardized task executions):

| Model Provider | Upstream Baseline (1K runs) | GSD-X (1K runs) | Net Dollar Savings | Cost Savings % |
|:---|:---:|:---:|:---:|:---:|
| **Fable 5** ($10.00/1M in, $50.00/1M out) | $521.62 | $349.68 | **$171.94** | 33.0% |
| **Claude 3.7 Sonnet** ($3.00/1M in, $15.00/1M out) | $156.49 | $104.90 | **$51.58** | 33.0% |
| **GPT-4o** ($2.50/1M in, $10.00/1M out) | $113.73 | $70.75 | **$42.98** | 37.8% |
| **Claude 3.5 Haiku** ($0.80/1M in, $4.00/1M out) | $41.73 | $27.97 | **$13.76** | 33.0% |
| **Gemini 2.5 Pro** ($1.25/1M in, $5.00/1M out) | $56.87 | $35.37 | **$21.49** | 37.8% |
| **Gemini 2.5 Flash** ($0.075/1M in, $0.30/1M out) | $3.41 | $2.12 | **$1.29** | 37.8% |

---

## 7. How Savings Are Achieved

1. **Document Omission (45-65% impact)**: Naive GSD loads all 7 codebase maps (`ARCHITECTURE.md`, `STACK.md`, `CONVENTIONS.md`, etc.). GSD-X filters out unreferenced documents.
2. **Symbol Extraction (15-20% impact)**: `CodebaseIndex` injects concise function/class declarations instead of dumping entire source files.
3. **Semantic Deduplication (5-10% impact)**: Identical project constraints across files are collapsed into single canonical statements.
4. **Memory Substitution (10-15% impact)**: Compact 25-token memory facts substitute for repetitive historical re-analysis.

---

## 8. How to Reproduce & Verify

The benchmark harness is fully self-contained and reproducible:

```bash
# Clone the repository
git clone https://github.com/udaydeep1992/gsd-x.git
cd gsd-x

# Install dependencies and build SDK
npm install
npm run build:sdk

# Execute benchmark with Fable 5 pricing
npm run benchmark

# Verify mathematical integrity and documentation parity
python scripts/verify_benchmarks.py
# Or using Node.js:
node scripts/verify-benchmarks.cjs
```

Raw JSON output is automatically written to `benchmarks/data/benchmark_results.json` (canonical) and `benchmarks/results/latest.json`. Markdown summary is written to `benchmarks/results/latest.md`.
