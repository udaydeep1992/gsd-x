<div align="center">

# GSD-X

**GSD, with a smarter memory and context engine.**

**English** · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja-JP.md) · [한국어](README.ko-KR.md)

GSD, redesigned for spec-driven AI coding workflows with local JSONL memory, optional semantic context compilation, and incremental code indexing. Includes deterministic fixture benchmarks for reproducible comparison.

[![Maintained by: Codee Studio](https://img.shields.io/badge/Maintained%20by-Codee%20Studio-007acc.svg)](https://www.fiverr.com/codee_studio)
[![Hire on Fiverr](https://img.shields.io/badge/Fiverr-Hire%20Codee%20Studio-1dbf73?logo=fiverr&logoColor=white)](https://www.fiverr.com/codee_studio)
[![Telegram](https://img.shields.io/badge/Telegram-@kblautosignals-2CA5E0?logo=telegram&logoColor=white)](https://t.me/kblautosignals)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%7C%206.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-55%20Passing-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](tests/)
[![Fixture Estimate](https://img.shields.io/badge/Fixture%20Estimate-67.5%25%20Tokens-blueviolet?style=for-the-badge)](docs/BENCHMARKS.md)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

> [!NOTE]
> **Fork & Lineage Notice**: GSD-X is an independent fork and architectural evolution of [Open GSD Core](https://github.com/udaydeep1992/gsd-x). It is not officially affiliated with or endorsed by the original GSD / Open GSD maintainers. GSD-X preserves full backward compatibility with upstream `.planning/` workflows while introducing a local-first memory and context intelligence layer.

---

## The Core Problem: Context Bloat & Amnesia

Naïve AI coding agents suffer from the **Additive Context Fallacy**:
$$\text{Naive Context} = \text{System Prompt} + \text{Chat History} + \text{All Planning Docs} + \text{Retrieved Memories} + \text{All Code Files}$$

This approach leads to:
1. **Token Inefficiency**: Large inputs consume more of the model's context window.
2. **Context Degradation & Amnesia**: LLM attention degrades when saturated with thousands of lines of irrelevant specs.
3. **Instruction Drift**: Stale planning notes conflict with active implementation details.

### The GSD-X Design Principle

> **MEMORY MUST REPLACE REDUNDANT CONTEXT, NOT SIMPLY ADD MORE CONTEXT.**

Instead of blindly injecting everything, GSD-X runs a deterministic context compilation pipeline:
```
TASK INTENT
    │
    ▼
[Task Classifier] ───► Classifies task complexity & allocates adaptive token budget
    │
    ▼
[Omission Filter] ───► Filters out 70-90% of unrelated project documents
    │
    ▼
[Symbol Indexer]  ───► Extracts 10-line signatures & docstrings instead of 500-line files
    │
    ▼
[Memory Engine]   ───► Injects 25-token distilled decisions to replace bulky docs
    │
    ▼
[Deduplicator]    ───► Collapses identical constraints repeated across files
    │
    ▼
COMPILED CONTEXT (Minimal tokens, maximal signal)
```

---

## Architecture

```mermaid
flowchart TD
    User([User / Autonomous Agent]) --> Runtime[Antigravity / Claude Code / Codex]
    Runtime --> Commands[GSD-X Workflow / Slash Command]
    Commands --> SDK[GSD-X Intelligence SDK]

    subgraph IntelligenceLayer ["GSD-X Intelligence Layer"]
        Classifier[Task Classifier & Complexity Analyzer]
        Budget[Adaptive Token Budget]
        Selector[Task-Aware Artifact Selector]
        CodeIdx[Incremental CodebaseIndex]
        MemRetriever[Multi-Factor Memory Search]
        Dedupe[Cross-Document Semantic Deduplicator]
        Defenses[Prompt Injection Delimiter Guard]
        Compiler[Context Compiler]
        Router[Model-Aware Router]

        Classifier --> Budget
        Budget --> Selector
        Selector --> CodeIdx
        CodeIdx --> MemRetriever
        MemRetriever --> Dedupe
        Dedupe --> Defenses
        Defenses --> Compiler
        Compiler --> Router
    end

    SDK --> IntelligenceLayer
    Router --> CompiledContext[Compiled Context Brief]
    CompiledContext --> Agent[Specialized GSD Agent]
    Agent --> Exec[Execute / Test / Verify]
    Exec --> Summary[SUMMARY.md & Verification]
    Summary --> Extraction[Conservative Memory Extraction]
    Extraction --> Consolidation[Topic Consolidation & Decay]
    Consolidation --> LocalStore[(Local Memory Store: LanceDB / JSONL)]
    LocalStore -.-> MemRetriever
```

---

## Deterministic Fixture Estimates

> **Fixture-model estimate: 67.5% fewer estimated tokens across eight deterministic scenarios. This is not a live-agent performance measurement; cost estimates use the configured pricing assumptions.**

The harness (`benchmarks/run-benchmark.cjs`) constructs synthetic baseline and GSD-X-style prompts across 8 scenarios. It does not run upstream GSD, the SDK context compiler, or an AI model. The counts and costs below are reproducible fixture estimates, not measurements of actual task execution.

### Benchmark Scenario Breakdown

| Scenario | Upstream Baseline | GSD-X Tokens | Token Savings | Baseline Cost | GSD-X Cost | Cost Savings |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Simple Task** | 2,253 | 382 | **83.0%** | $0.0325 | $0.0138 | **57.5%** |
| **2. Small Bug** | 2,977 | 592 | **80.1%** | $0.0466 | $0.0227 | **51.2%** |
| **3. Feature** | 3,655 | 1,302 | **64.4%** | $0.0806 | $0.0570 | **29.2%** |
| **4. Complex Feature** | 4,954 | 2,146 | **56.7%** | $0.1235 | $0.0955 | **22.7%** |
| **5. Brownfield Feature** | 3,409 | 1,056 | **69.0%** | $0.0681 | $0.0446 | **34.6%** |
| **6. Repeated Knowledge** | 3,211 | 920 | **71.3%** | $0.0581 | $0.0352 | **39.4%** |
| **7. Long-running Project** | 2,665 | 1,341 | **49.7%** | $0.0747 | $0.0614 | **17.7%** |
| **8. Memory Recall** | 2,358 | 549 | **76.7%** | $0.0376 | $0.0195 | **48.1%** |
| **AGGREGATE TOTAL** | **25,482** | **8,288** | **67.5%** | **$0.5216** | **$0.3497** | **33.0%** |

*Pricing Model: Fable 5 ($10.00 / 1M input tokens, $50.00 / 1M output tokens). All calculations are traceable to unrounded benchmark data. Unrounded baseline total cost is $0.52162 (displaying as $0.5216); unrounded GSD-X total cost is $0.34968 (displaying as $0.3497). The sum of 4-decimal rounded scenario costs is $0.5217 baseline and $0.3497 GSD-X due to rounding accumulation (+0.00008 across 8 scenarios).*

### How We Calculate Savings

```text
TOKEN REDUCTION
Baseline Tokens: 25,482 (18,812 input + 6,670 output)
GSD-X Tokens:     8,288 (1,618 input + 6,670 output)
Tokens Saved:    17,194
Aggregate Token Savings = (25,482 − 8,288) ÷ 25,482 × 100 = 67.475% ≈ 67.5%
(Individual scenario reductions range from 49.7% to 83.0%)

MONETARY COST REDUCTION
Cost Formula = (Input Tokens × $10.00 ÷ 1,000,000) + (Output Tokens × $50.00 ÷ 1,000,000)
Baseline Cost: (18,812 × $10 ÷ 1M) + (6,670 × $50 ÷ 1M) = $0.18812 + $0.33350 = $0.52162
GSD-X Cost:    (1,618 × $10 ÷ 1M) + (6,670 × $50 ÷ 1M)  = $0.01618 + $0.33350 = $0.34968
Net Cost Saved: $0.52162 − $0.34968 = $0.17194
Cost Savings = ($0.52162 − $0.34968) ÷ $0.52162 × 100 = 32.963% ≈ 33.0%

WHY TOKEN REDUCTION (67.5%) ≠ COST REDUCTION (33.0%)
Output tokens are priced 5× higher than input tokens ($50/M vs $10/M).
The fixture assigns identical output counts (6,670 tokens) to both scenarios
while reducing the synthetic input context. This is a modeling assumption.
Because constant output tokens represent 64% of baseline cost,
monetary savings is 33.0% even while total token volume drops 67.5%.
```

### Impact at Scale: Baseline vs. GSD-X Equivalent Workload

The projections below linearly scale fixture-derived values (preserving the synthetic corpus's 73.8% input / 26.2% output mix and fixed output assumptions); they are illustrations, not operational forecasts:

| Metric | Upstream Baseline Workload | GSD-X Equivalent Workload | Net Savings with GSD-X |
|:---|:---:|:---:|:---:|
| **1M Baseline Tokens** | 1,000,000 tokens | 325,249 tokens | **674,751 tokens saved (67.5% reduction)** |
| **Fable 5 Cost (1M)** | $20.47 | $13.72 | **$6.75 saved per 1M tokens (33.0% cost reduction)** |
| **At 10M Baseline Tokens** | 10,000,000 tokens ($204.70) | 3,252,492 tokens ($137.23) | **6,747,508 tokens eliminated \| $67.47 saved** |
| **At 100M Baseline Tokens**| 100,000,000 tokens ($2,046.99) | 32,524,920 tokens ($1,372.26) | **67,475,080 tokens eliminated \| $674.73 saved** |

*Note on scaling math: Scaling values use exact linear extrapolation from unrounded benchmark data ($20.4699 baseline and $13.7226 GSD-X per 1M baseline tokens). Multiplying the rounded display rate ($20.47, $13.72, $6.75) yields $204.70 / $137.20 / $67.50 at 10M and $2,047.00 / $1,372.00 / $675.00 at 100M.*

### Benchmark Methodology & Reproducibility

- **Fixture scenarios**: The runner constructs baseline and GSD-X sample prompts from a fixed synthetic corpus across 8 scenarios. It does not execute agents or the production context compiler.
- **Token accounting**: Context strings use `Math.ceil(text.length / 4)` and output tokens are fixed fixture values. Costs apply configured pricing assumptions.
- **Determinism**: The fixture runner is deterministic and intended to check arithmetic and demonstrate a model, not predict production results.
- **Pricing Configuration**: Model pricing is defined in [`benchmarks/pricing.json`](benchmarks/pricing.json) and can be configured for any provider.
- **Automated Verification**: Run `python scripts/verify_benchmarks.py` or `node scripts/verify-benchmarks.cjs` to verify all mathematical invariants and documentation consistency.

---

## Key Features

### 1. Local-First Semantic Memory
- **Local JSONL Memory**: The compiler and compatibility search pipeline use the zero-dependency `JsonMemoryStore`. `LanceMemoryStore` remains an optional adapter; its current read/search operations delegate to JSONL.
- **Deterministic 128-Dim Embeddings**: Lightweight, offline feature hashing (`LocalHashEmbeddingProvider`) eliminates external embedding API dependencies and guarantees complete privacy.
- **Multi-Factor Candidate Scoring**: Ranks memories by combining semantic similarity, project boundary matching, phase relevance, authority levels, recency decay, and access frequency.
- **Authority Hierarchy**: Enforces strict epistemological precedence (`authoritative > verified > high-confidence > learned > inferred > experimental`).
- **Temporal Decay & Protection**: General experience decays gracefully (30-day half-life), while authoritative architectural decisions **never decay**.

### 2. Intelligent Context Compiler
- **Adaptive Token Budgets**: Dynamically allocates budgets based on task complexity (3,500 tokens for trivial tasks to 32,000 for architectural overhauls).
- **Task-Aware Selection & Omission**: Scans `.planning/` and codebase maps, omitting irrelevant documents while recording omissions in an audit manifest.
- **Cross-Document Semantic Deduplication**: Detects and collapses redundant project rules and architectural constraints scattered across multiple markdown files.
- **Prompt Injection Defense**: All retrieved memories are encapsulated in `<retrieved-memory>` tags and bound by an explicit Operational Context Contract to neutralize malicious instructions.

### 3. Incremental Code Intelligence (`CodebaseIndex`)
- **Incremental Symbol Indexing**: Caches file modification times (`mtime`) and SHA-256 hashes to parse only modified files.
- **Signature & Docstring Extraction**: Injects concise 5-to-10 line method/class signatures instead of loading entire 500-line source files.
- **Language Support**: Tree-sitter extraction is implemented for Rust, Go, and C/C++; TypeScript, JavaScript, and Python use the regex fallback index.

### 4. Model-Aware Routing
- **Complexity-Based Routing**: Maps tasks to the optimal model tier (`cheapModel`, `fastModel`, `strongCodingModel`, `reasoningModel`, `auditModel`).
- **Graceful Fallback**: Automatically falls back to the runtime's default or inherited model profile when routing is disabled.

---

## Comparison: GSD-X vs. Alternatives

| Dimension | Naive RAG / Mem0 | RuFlo / Claude Flow | Open GSD Core | **GSD-X** |
|:---|:---:|:---:|:---:|:---:|
| **Paradigm** | Chat-first memory | Swarm orchestration | Spec-driven phases | **Spec-driven + Memory Intelligence** |
| **Context Strategy** | Additive (more tokens) | Cumulative swarm context | Manual file reads | **Subtractive (memory replaces context)** |
| **Token Optimization** | ❌ None | ❌ Heavy overhead | ⚠️ Fresh contexts only | ✅ **Adaptive budget + fixture-estimated 67.5% reduction** |
| **Deduplication** | ❌ None | ❌ None | ❌ None | ✅ **Cross-document semantic dedupe** |
| **Code Awareness** | ❌ Plain text chunks | ⚠️ File listing | ⚠️ Manual grep/map | ✅ **Incremental symbol indexer** |
| **Storage Architecture** | Remote SaaS / Redis | Distributed mesh | None (.planning/ files) | ✅ **Local-first JSONL (Default) + optional LanceDB** |
| **Security & Privacy** | Cloud exfiltration risk | Unvetted swarm data | Local files | ✅ **Delimiter tags + secret redaction** |
| **Backwards Compatibility**| N/A | N/A | Baseline | ✅ **100% compatible with .planning/** |

---

## Install

```bash
npm i @udaydeep1992/gsd-x
# or
npm i @udaydeep1992/gsd-x@latest
```

Global installation:
```bash
npm i -g @udaydeep1992/gsd-x
```

Run immediately via npx:
```bash
# Interactive installer (prompts for runtime and location)
npx @udaydeep1992/gsd-x
```

### Platform-Specific Installation

Install workflows, slash commands, and agent profiles directly for your preferred AI coding environment. Supports both **Global** (user-level config directory) and **Local** (current repository/workspace) scopes:

#### Quick Commands for Popular Platforms

```bash
# Google Antigravity
npx @udaydeep1992/gsd-x --antigravity --global   # Global installation
npx @udaydeep1992/gsd-x --antigravity --local    # Current project only

# Claude Code
npx @udaydeep1992/gsd-x --claude --global        # Global installation
npx @udaydeep1992/gsd-x --claude --local         # Current project only

# OpenAI Codex
npx @udaydeep1992/gsd-x --codex --global         # Global installation
npx @udaydeep1992/gsd-x --codex --local          # Current project only

# Cursor
npx @udaydeep1992/gsd-x --cursor --global        # Global installation
npx @udaydeep1992/gsd-x --cursor --local         # Current project only

# All Supported Runtimes
npx @udaydeep1992/gsd-x --all --global           # Install across all installed runtimes
```

#### Supported Runtimes Matrix

| Runtime / Editor | Global Installation (`--global`) | Project-Local Installation (`--local`) |
|:---|:---|:---|
| **Google Antigravity** | `npx @udaydeep1992/gsd-x --antigravity --global` | `npx @udaydeep1992/gsd-x --antigravity --local` |
| **Claude Code** | `npx @udaydeep1992/gsd-x --claude --global` | `npx @udaydeep1992/gsd-x --claude --local` |
| **OpenAI Codex** | `npx @udaydeep1992/gsd-x --codex --global` | `npx @udaydeep1992/gsd-x --codex --local` |
| **Cursor** | `npx @udaydeep1992/gsd-x --cursor --global` | `npx @udaydeep1992/gsd-x --cursor --local` |
| **Windsurf** | `npx @udaydeep1992/gsd-x --windsurf --global` | `npx @udaydeep1992/gsd-x --windsurf --local` |
| **GitHub Copilot** | `npx @udaydeep1992/gsd-x --copilot --global` | `npx @udaydeep1992/gsd-x --copilot --local` |
| **Cline** | `npx @udaydeep1992/gsd-x --cline --global` | `npx @udaydeep1992/gsd-x --cline --local` |
| **OpenCode** | `npx @udaydeep1992/gsd-x --opencode --global` | `npx @udaydeep1992/gsd-x --opencode --local` |
| **Kimi CLI** | `npx @udaydeep1992/gsd-x --kimi --global` | `npx @udaydeep1992/gsd-x --kimi --local` |
| **Kimi Code** | `npx @udaydeep1992/gsd-x --kimi-code --global` | `npx @udaydeep1992/gsd-x --kimi-code --local` |
| **Trae** | `npx @udaydeep1992/gsd-x --trae --global` | `npx @udaydeep1992/gsd-x --trae --local` |
| **Augment** | `npx @udaydeep1992/gsd-x --augment --global` | `npx @udaydeep1992/gsd-x --augment --local` |
| **Qwen Code** | `npx @udaydeep1992/gsd-x --qwen --global` | `npx @udaydeep1992/gsd-x --qwen --local` |
| **Hermes Agent** | `npx @udaydeep1992/gsd-x --hermes --global` | `npx @udaydeep1992/gsd-x --hermes --local` |
| **CodeBuddy** | `npx @udaydeep1992/gsd-x --codebuddy --global` | `npx @udaydeep1992/gsd-x --codebuddy --local` |
| **Kilo** | `npx @udaydeep1992/gsd-x --kilo --global` | `npx @udaydeep1992/gsd-x --kilo --local` |
| **Pi** | `npx @udaydeep1992/gsd-x --pi --global` | `npx @udaydeep1992/gsd-x --pi --local` |
| **ZCode** | `npx @udaydeep1992/gsd-x --zcode --global` | `npx @udaydeep1992/gsd-x --zcode --local` |
| **All Runtimes** | `npx @udaydeep1992/gsd-x --all --global` | — |

---

## Quickstart

### Choose the next action

Start with `$gsd` (or `/gsd` where the host supports an unprefixed slash entry; `/gsd-root` is the compatible command alias) and describe the outcome you want. With no intent, GSD shows current project state and recommends a next action. The compact categories are `/gsd-build`, `/gsd-plan`, `/gsd-review`, `/gsd-project`, `/gsd-context`, `/gsd-manage`, `/gsd-idea`, and `/gsd-run`. Autonomous execution remains opt-in. Use `/gsd-help advanced` for the full specialist reference; existing specialist commands remain available for direct use.

### Building from Source

```bash
# Clone the repository
git clone https://github.com/udaydeep1992/gsd-x.git
cd gsd-x
git checkout gsd-x

# Install dependencies and build SDK
npm install
npm run build:sdk
```

### Running Tests & Benchmarks

```bash
# Run the complete test suite (all tests passing across subsystems)
npm run test:sdk

# Execute the reproducible token & cost benchmark harness
npm run benchmark
```

### Visual Context Inspector (Loopback Server)

Start the zero-dependency local HTTP loopback server on `127.0.0.1:9876` to inspect context compilation records, token metrics, omission decisions, and semantic diffs in real time:

```bash
# Start loopback HTTP server on 127.0.0.1:9876
gsd-tools context inspect --serve --port 9876

# Start server and automatically launch dashboard in default browser
gsd-tools context inspect --serve --open --port 9876

# Run via npx without global install
npx @udaydeep1992/gsd-x gsd-tools context inspect --serve --port 9876

# From source repository
node gsd-core/bin/gsd-tools.cjs context inspect --serve --port 9876
```

Once running, the loopback server exposes:
- **Interactive Web Dashboard**: `http://127.0.0.1:9876/`
- **Latest Compilation Telemetry API**: `http://127.0.0.1:9876/api/latest`
- **Compilation History API**: `http://127.0.0.1:9876/api/history`
- **Health Check Endpoint**: `http://127.0.0.1:9876/health`

> [!NOTE]
> For security, the server binds strictly to the local loopback interface (`127.0.0.1`) and validates the Host header (`isLoopbackHost`) to prevent DNS rebinding attacks.

### CLI Command Reference

GSD-X integrates seamlessly with the `gsd-tools` CLI:

```bash
# Check memory health and audit for secret leaks
node gsd-core/bin/gsd-tools.cjs memory doctor

# Add an architectural decision to persistent memory
node gsd-core/bin/gsd-tools.cjs memory add "Use PostgreSQL 16 with UUIDv4 primary keys" --type decision --tags db,postgres

# Semantic vector search across project memory
node gsd-core/bin/gsd-tools.cjs memory search "database schema decisions" --limit 5

# View detailed memory entry
node gsd-core/bin/gsd-tools.cjs memory show <memory-id>

# Display memory storage statistics
node gsd-core/bin/gsd-tools.cjs memory stats

# Inspect compiler token budget, omissions, and deduplication savings
node gsd-core/bin/gsd-tools.cjs context stats --task "Refactor authentication middleware"

# Launch Visual Context Inspector web UI on 127.0.0.1:9876 in browser
node gsd-core/bin/gsd-tools.cjs context inspect --serve --open --port 9876

# Dedicated Tree-sitter AST structural code intelligence commands (Rust, Go, C++)
node gsd-core/bin/gsd-tools.cjs gsd-ast-index [--rebuild]
node gsd-core/bin/gsd-tools.cjs gsd-ast-stats
node gsd-core/bin/gsd-tools.cjs gsd-ast-query authenticate_user --lang rust
node gsd-core/bin/gsd-tools.cjs gsd-ast-relationships authenticate_user

# Query and feed back to cross-project engineering heuristics
node gsd-core/bin/gsd-tools.cjs heuristics query --task "Fix tokio async deadlock"
node gsd-core/bin/gsd-tools.cjs heuristics feedback --id "heur-rust-tokio-mutex" --success
```

---

## Documentation

- 🧠 **[Local-First Semantic Memory (MEMORY.md)](docs/MEMORY.md)**: Deep dive into LanceDB, embeddings hashing, multi-factor scoring, authority hierarchy, and temporal decay.
- ⚡ **[Context Compiler (CONTEXT-COMPILER.md)](docs/CONTEXT-COMPILER.md)**: Details on the 8-stage intelligence pipeline, deduplication, and budget enforcement.
- 📊 **[Token Optimization (TOKEN-OPTIMIZATION.md)](docs/TOKEN-OPTIMIZATION.md)**: The five levers of token reduction and quantitative impact analysis.
- 🪐 **[Google Antigravity Integration (ANTIGRAVITY.md)](docs/ANTIGRAVITY.md)**: Guide for running GSD-X inside Google Antigravity with slash commands and subagents.
- 📈 **[Benchmark Methodology & Data (BENCHMARKS.md)](docs/BENCHMARKS.md)**: Complete scenario definitions, raw numbers, and reproduction steps.
- 🛡️ **[Security & Privacy Architecture (SECURITY.md)](docs/SECURITY.md)**: Prompt injection protection, secret redaction, and local isolation.
- 🔄 **[Migration Guide (MIGRATION.md)](docs/MIGRATION.md)**: Seamless upgrade from Open GSD Core, GSD v1, and GSD v2 with zero breaking changes.

---

## Roadmap

- [x] Local-first semantic memory engine (Zero-dep JSONL default + optional LanceDB adapter)
- [x] Deterministic 128-dim offline vector embeddings
- [x] Multi-factor candidate scoring and authority precedence
- [x] Conservative extraction with automated secret redaction
- [x] Context Compiler with adaptive token budgeting
- [x] Cross-document semantic deduplication
- [x] Incremental code symbol indexer (`CodebaseIndex`)
- [x] Prompt injection defense delimiters (`<retrieved-memory>`)
- [x] Model-aware complexity router
- [x] Reproducible benchmark harness across 8 development scenarios
- [x] Antigravity slash commands and CLI integration
- [x] Tree-sitter AST structural code intelligence for Rust, Go, and C++
- [x] Visual Context Inspector web UI with real-time token telemetry & diffs
- [x] Multi-project cross-pollination of generalized engineering heuristics with strict privacy isolation

---

## Maintainer & Commercial Support

GSD-X is actively developed and maintained by **Codee Studio**.

[![Maintained by: Codee Studio](https://img.shields.io/badge/Maintained%20by-Codee%20Studio-007acc.svg?style=for-the-badge)](https://www.fiverr.com/codee_studio)
[![Hire on Fiverr](https://img.shields.io/badge/Fiverr-Hire%20Codee%20Studio-1dbf73?style=for-the-badge&logo=fiverr&logoColor=white)](https://www.fiverr.com/codee_studio)
[![Telegram](https://img.shields.io/badge/Telegram-@kblautosignals-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/kblautosignals)

Need custom AI agent architectures, fine-tuned developer workflows, enterprise memory integrations, or production automation setups?
- 💼 **Hire on Fiverr**: [fiverr.com/codee_studio](https://www.fiverr.com/codee_studio) — Custom agentic development, runtime integrations, and bespoke AI coding tooling.
- 💬 **Direct Telegram Support**: [@kblautosignals](https://t.me/kblautosignals) — Priority technical inquiries and direct engineering consultations.

---

## License

MIT © [OpenGSD](https://github.com/open-gsd) and GSD-X Contributors.

