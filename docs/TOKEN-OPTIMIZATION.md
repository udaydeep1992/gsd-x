# GSD-X Token & Context Optimization Architecture

> **Maximum Useful Engineering Work Per Token**: How GSD-X achieves 67.5% aggregate token savings without sacrificing safety or completeness.

---

## 1. The Naive Context Trap

Most AI development frameworks suffer from the **Additive Context Fallacy**:

$$\text{Naive Context} = \text{System Prompt} + \text{Chat History} + \text{All Planning Docs} + \text{Retrieved Memories} + \text{All Code Files}$$

This approach has three devastating consequences:
1. **Exponential Token Growth**: Costs grow linearly or quadratically as the project matures.
2. **Signal Degradation**: Crucial instructions get buried under thousands of lines of boilerplate.
3. **Budget Exhaustion**: Models hit context limits during complex tasks, leading to abrupt truncation.

---

## 2. The GSD-X Optimization Principle

```
MEMORY MUST REPLACE REDUNDANT CONTEXT, NOT SIMPLY ADD MORE CONTEXT.
```

In GSD-X, context is not an accumulation of artifacts—it is a **compiled high-signal brief**:

```
TASK INTENT
    │
    ▼
[Task Classifier] ───► Determines required information & complexity budget
    │
    ▼
[Omission Filter] ───► Filters out 70-90% of unrelated project documents
    │
    ▼
[Symbol Indexer]  ───► Extracts 5-10 line code declarations instead of 500-line files
    │
    ▼
[Memory Engine]   ───► Injects 20-token distilled decisions to replace bulky docs
    │
    ▼
[Deduplicator]    ───► Collapses identical constraints repeated across files
    │
    ▼
COMPILED CONTEXT (Minimal tokens, maximal signal)
```

---

## 3. Five Levers of Token Efficiency

### Lever 1: Task-Aware Document Omission
- **Problem**: Naive GSD loads `PROJECT.md`, `ROADMAP.md`, `STATE.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, etc., regardless of the task.
- **Solution**: GSD-X classifies the task. A simple bug fix in the trading engine does not need `TESTING.md` or `ROADMAP.md`—it needs only `STATE.md` and the relevant execution plan.
- **Savings**: **45% to 65% reduction** in planning document token load.

### Lever 2: Symbol Extraction vs. Full File Reads
- **Problem**: Reading a 600-line TypeScript file consumes ~2,500 tokens just to see a method signature.
- **Solution**: The `CodebaseIndex` parses classes and functions, extracting only the relevant 10-line signature and docstring.
- **Savings**: **85% to 92% reduction** in code context token load.

### Lever 3: Cross-Document Semantic Deduplication
- **Problem**: The same conventions (e.g. "Use UTC timestamps", "UUIDv4 keys") appear repeatedly across architectural and planning markdown documents.
- **Solution**: GSD-X tokenizes sentences, detects semantic duplicates, and preserves only the authoritative occurrence.
- **Savings**: **15% to 30% reduction** across multi-document loads.

### Lever 4: Semantic Memory Substitution
- **Problem**: Re-running architectural research or querying why a previous decision was made consumes hundreds of tokens re-analyzing past commits.
- **Solution**: A 30-token distilled memory entry (`[DECISION | verified] Migrated from WebSocket to HTTP polling due to MT5 gateway firewall restrictions`) answers the question instantly.
- **Savings**: Replaces up to **1,200 tokens** of historical analysis per task.

### Lever 5: Adaptive Complexity Budgets
- **Problem**: Models generate verbose answers when unrestricted, consuming unnecessary output tokens.
- **Solution**: Strict per-task budgets enforce concise, focused engineering responses.

---

## 4. Empirical Benchmark Measurements

All figures below are from our automated, reproducible benchmark harness (`benchmarks/run-benchmark.cjs`) comparing upstream GSD baseline against GSD-X across 8 standardized software development scenarios:

| Scenario | Upstream Baseline (Tokens) | GSD-X (Tokens) | Token Savings (%) | Cost Baseline (USD) | GSD-X Cost (USD) | Cost Savings (%) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Simple Task** | 2,253 | 382 | **83.0%** | $0.0325 | $0.0138 | **57.5%** |
| **Small Bug** | 2,977 | 592 | **80.1%** | $0.0466 | $0.0227 | **51.2%** |
| **Feature** | 3,655 | 1,302 | **64.4%** | $0.0806 | $0.0570 | **29.2%** |
| **Complex Feature** | 4,954 | 2,146 | **56.7%** | $0.1235 | $0.0955 | **22.7%** |
| **Brownfield Feature** | 3,409 | 1,056 | **69.0%** | $0.0681 | $0.0446 | **34.6%** |
| **Repeated Knowledge** | 3,211 | 920 | **71.3%** | $0.0581 | $0.0352 | **39.4%** |
| **Long-Running Project** | 2,665 | 1,341 | **49.7%** | $0.0747 | $0.0614 | **17.7%** |
| **Memory Recall** | 2,358 | 549 | **76.7%** | $0.0376 | $0.0195 | **48.1%** |
| **TOTAL / AGGREGATE** | **25,482** | **8,288** | **67.5%** | **$0.5216** | **$0.3497** | **33.0%** |

*Pricing Model: Fable 5 ($10.00/1M input, $50.00/1M output). Benchmarked on commit `13d37238ba08377929e4850fd6ae4b8db49a22ca`.*

---

## 5. Running the Token Benchmark

You can reproduce these exact measurements on your own machine at any time:

```bash
# Run benchmark with default pricing
npm run benchmark

# Or run directly via node
node benchmarks/run-benchmark.cjs
```
