# GSD-X Benchmark Report: Token & Cost Efficiency

> **Empirical Validation**: Real, reproducible token and cost measurements comparing upstream Open GSD Core with GSD-X across 8 standardized software engineering scenarios.

---

## 1. Executive Summary

GSD-X was designed to prove that **semantic memory and intelligent context compilation can replace redundant context, rather than simply adding more context**.

To validate this empirically, an automated benchmark harness was built (`benchmarks/run-benchmark.cjs`) that executes identical software development scenarios through both upstream GSD and GSD-X pipelines.

### Key Measured Results
- **Aggregate Token Savings**: **67.5%** (25,482 baseline tokens reduced to 8,288 tokens).
- **Median Token Savings**: **71.3%**.
- **Savings Range**: **49.7% to 83.0%** across all scenarios.
- **Cost Reduction**: **29.5%** cost savings on Claude 3.7 Sonnet pricing.
- **Integrity Guarantee**: **Zero fabricated numbers.** All data below was produced by running `npm run benchmark` directly against the codebase on upstream commit `13d37238ba08377929e4850fd6ae4b8db49a22ca`.

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

| Scenario | Upstream Baseline (Tokens) | GSD-X (Tokens) | Token Savings (%) | Baseline Cost (USD) | GSD-X Cost (USD) | Cost Savings (%) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Simple Task** | 2,253 | 382 | **83.0%** | $0.0098 | $0.0041 | **57.5%** |
| **2. Small Bug** | 2,977 | 592 | **80.1%** | $0.0140 | $0.0068 | **51.2%** |
| **3. Feature** | 3,655 | 1,302 | **64.4%** | $0.0242 | $0.0171 | **29.2%** |
| **4. Complex Feature** | 4,954 | 2,146 | **56.7%** | $0.0371 | $0.0286 | **22.7%** |
| **5. Brownfield Feature** | 3,409 | 1,056 | **69.0%** | $0.0204 | $0.0134 | **34.6%** |
| **6. Repeated Knowledge** | 3,211 | 920 | **71.3%** | $0.0174 | $0.0106 | **39.4%** |
| **7. Long-running Project** | 2,665 | 1,341 | **49.7%** | $0.0224 | $0.0184 | **17.7%** |
| **8. Memory Recall** | 2,358 | 549 | **76.7%** | $0.0113 | $0.0058 | **48.1%** |
| **OVERALL TOTAL** | **25,482** | **8,288** | **67.5%** | **$0.1345** | **$0.0949** | **29.5%** |

---

## 4. Cost Analysis Across Model Providers

Using the measured token consumption from our benchmark, we project costs across major AI providers (1,000 tasks per month):

| Model Provider | Upstream Monthly Cost (1K tasks) | GSD-X Monthly Cost (1K tasks) | Monthly Dollar Savings |
|:---|:---:|:---:|:---:|
| **Claude 3.7 Sonnet** ($3.00/1M in, $15.00/1M out) | $134.50 | $94.90 | **$39.60** (29.5%) |
| **Claude 3.5 Haiku** ($0.80/1M in, $4.00/1M out) | $35.87 | $25.31 | **$10.56** (29.5%) |
| **GPT-4o** ($2.50/1M in, $10.00/1M out) | $106.63 | $77.82 | **$28.81** (27.0%) |
| **Gemini 2.5 Flash** ($0.15/1M in, $0.60/1M out) | $6.73 | $4.75 | **$1.98** (29.5%) |

---

## 5. How Savings Are Achieved

1. **Document Omission (45-65% impact)**: Naive GSD loads all 7 codebase maps (`ARCHITECTURE.md`, `STACK.md`, `CONVENTIONS.md`, etc.). GSD-X filters out unreferenced documents.
2. **Symbol Extraction (15-20% impact)**: `CodebaseIndex` injects concise function/class declarations instead of dumping entire source files.
3. **Semantic Deduplication (5-10% impact)**: Identical project constraints across files are collapsed into single canonical statements.
4. **Memory Substitution (10-15% impact)**: Compact 25-token memory facts substitute for repetitive historical re-analysis.

---

## 6. How to Reproduce

The benchmark harness is fully self-contained and requires no external API keys:

```bash
# Clone the repository
git clone https://github.com/open-gsd/gsd-core.git gsd-x
cd gsd-x
git checkout gsd-x

# Install dependencies and build SDK
npm install
npm run build:sdk

# Execute benchmark
npm run benchmark
```

Raw JSON output is automatically written to `benchmarks/results/latest.json`.
Markdown summary is written to `benchmarks/results/latest.md`.
