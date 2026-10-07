# GSD-X Production Readiness & Architecture Audit

**Audit date:** 2026-10-07  
**Audited tree:** `main`, working tree including pre-existing uncommitted changes  
**Scope:** static repository trace, command/workflow/SDK integration, package dry run, focused SDK tests, and benchmark verification. No production source was changed for this audit.

> **Reproducibility note:** The checkout was already dirty when the audit began. The findings describe that working tree, not a clean commit. Existing changes were preserved. This audit was not an exhaustive line-by-line formal verification of all ~240 source modules and ~1,056 test files; it focuses on shipped surfaces, user workflows, changed GSD-X subsystems, and release-critical seams. Unverified items are called out explicitly.

==================================================
GSD-X PRODUCTION READINESS AUDIT
==================================================

**Overall Status:** NOT READY  
**Overall Risk:** HIGH  
**Release Recommendation:** FIX THEN SHIP

## 1. Executive Summary

GSD-X is built on a substantial, mature GSD Core rather than being only a collection of prompt files. The core has a generated command router, explicit state/workflow ownership, capability descriptors, extensive tests, multi-runtime installation, CI policy gates, and release automation. The current repository also has a separate GSD-X TypeScript SDK for memory, context compilation, AST indexing, engineering heuristics, and an inspector.

The main production-readiness gap is at the seam between those systems. The SDK can be loaded by manual `gsd-tools context` and AST commands, and its artifacts are included in the npm package. However, GSD lifecycle workflows do not invoke the compiler before planning or agent dispatch, contrary to the architecture documentation. The code index is not refreshed by compilation, so first-run and changed-source retrieval can be empty or stale. The inspector exposes stored prompts, memories, and source snippets through wildcard CORS. The compiler's advertised strict budget and the inspector's stage-level measurements are not faithful to actual execution.

The benchmark figures are arithmetically consistent and reproducible, but the harness constructs a synthetic optimized context and reuses fixed output-token counts; it does not execute GSD-X or an AI model. The README's “Measured” language therefore overstates what the data measures.

### Readiness score

**5/10 for the whole repository; 3/10 for the new GSD-X intelligence layer.** The score reflects mature core/release infrastructure offset by confirmed security, workflow-wiring, budget, observability, and evidence gaps. It is a qualitative audit score, not a test-derived metric.

### Major strengths

- Explicit GSD workflow contracts and artifact-driven phase lifecycle.
- A dedicated command-routing hub and generated registry rather than ad hoc command dispatch.
- Meaningful state locking, validation, platform conformance, install-tree, regression, and security test infrastructure.
- Build-at-publish design and a successful `npm pack --dry-run`; the package includes `sdk/dist` and runtime assets.
- SDK unit coverage exercises JSON memory, Rust/Go/C++ AST parsing, code indexing, routing, heuristics privacy isolation, and basic compiler output.
- Benchmark verifier detects arithmetic/document drift, even though it does not validate real model outcomes.

### Release blockers

1. Remove cross-origin read access to sensitive context-inspector records.
2. Make compiler budgeting cover every rendered section or stop promising a strict cap.
3. Either wire the SDK into the actual GSD lifecycle as documented or correct the architecture/product claims and define the supported manual workflow.
4. Ensure context compilation refreshes or validates the code index before retrieval.
5. Re-label benchmark data as synthetic/illustrative or replace the harness with a controlled live pipeline comparison.
6. Validate untrusted persisted index paths before reading files from them.

## 2. Architecture Review

### Actual repository map

```text
GSD-X repository
├── GSD Core runtime
│   ├── gsd-core/workflows, references, templates, contexts
│   ├── gsd-core/bin/gsd-tools.cjs + generated CommonJS runtime modules
│   └── src/*.cts ──build──> gsd-core/bin/lib/*.cjs
├── Host projections
│   ├── commands/gsd (72 command definitions)
│   ├── skills (72 skill directories)
│   ├── agents (64 markdown files, including compact variants)
│   ├── capabilities (host/runtime/workflow extensions)
│   ├── .claude-plugin, .opencode, .kilo, pi, vscode, GEMINI.md
│   └── hooks, bin, assets
├── GSD-X SDK (separate TypeScript package surface)
│   ├── sdk/src/memory (JSONL, embeddings, scoring, optional Lance adapter)
│   ├── sdk/src/context (selection, compiler, code index, manifest)
│   ├── sdk/src/context/ast (Tree-sitter WASM + fallback parsers)
│   ├── sdk/src/context/inspector (telemetry, HTML, local HTTP server)
│   ├── sdk/src/heuristics (privacy filtering, aggregation, retrieval)
│   └── sdk/src/query + sdk/src/routing
├── Delivery and validation
│   ├── scripts (build, generated registries, lint, test harness, release)
│   ├── tests (unit, integration, install, security, QA, fixtures)
│   ├── benchmarks (harness, fixtures, results, pricing)
│   ├── .github/workflows (CI, install smoke, security, release)
│   └── docs, ADRs, examples, changelog, version policy
└── Current local additions (uncommitted)
    ├── context compiler/inspector/indexing/heuristics SDK changes
    ├── gsd-tools route changes and package metadata/dependency changes
    └── documentation and new GSD-X tests
```

This is a two-layer architecture: GSD Core owns the real planning/execution state machine; the GSD-X SDK owns a separate intelligence layer. `gsd-tools` has manual routes into some SDK capabilities, but GSD workflow files remain the actual lifecycle orchestrators. The two layers are not yet coherently integrated end to end.

The TypeScript `src/` and `sdk/src/` trees are both source-of-truth families with different build targets. GSD Core modules compile from `src/*.cts` into runtime CJS; SDK code compiles into `sdk/dist`. This is a defensible boundary, but generated files, package projection, command registry, and documentation make source-of-truth drift a recurring release risk.

## 3. Feature / Function Review

| Feature | Exists | Implemented | Registered / callable | Connected to normal workflow | Tested | Documented | Readiness |
|---|---|---|---|---|---|---|---|
| GSD phase planning/execution | Yes | Yes | Yes | Yes, via workflow artifacts | Broad core coverage | Yes | Strong core foundation |
| GSD command router/state | Yes | Yes | Yes | Yes | Broad core coverage | Yes/ADRs | Strong, but command prerequisites are hard to infer |
| SDK JSONL memory | Yes | Yes | SDK + manual CLI | Partial; not auto-injected into phase agents | CRUD/scoring tests | Yes | Usable as SDK/manual feature |
| LanceDB memory backend | Yes | Partial | SDK export | No effective vector search; optional package absent | Limited | Claims as primary backend | Misrepresented / fallback-only in package |
| Context compiler | Yes | Yes | SDK + `gsd-tools context` | **No automatic lifecycle integration found** | Basic compiler tests | Yes | Manual only; budget/telemetry defects |
| Code index | Yes | Yes | AST CLI + SDK | Compilation reads index but does not update it | Index tests | Yes | Stale/empty on ordinary compile |
| Tree-sitter AST | Yes | Rust/Go/C/C++ wrappers | AST CLI + SDK | Manual retrieval only | 16 AST tests passed | Yes | Real AST for four language families |
| JS/TS/Python structural parse | Fallback only | Regex parsing | Same query API | Manual | Detection/fallback tests | Docs imply broader coverage | Misaligned language labeling |
| Context inspector | Yes | HTML + HTTP server | Manual context CLI | Not auto-opened by lifecycle | HTTP test blocked by sandbox | Yes | Security blocker: wildcard CORS |
| Engineering heuristics | Yes | Yes | SDK + manual CLI | Compiler retrieves them | Isolation suite passed | Partial | Useful, separate heuristic store needs lifecycle policy |
| Model/task routing | Yes | Yes | SDK | Not shown as GSD executor dispatch integration | Routing tests passed | Yes | Separate from core role/model routing |
| Benchmark figures | Yes | Fixture math | Script/verifier | No live compiler/model connection | Math verifier passed | Strong “measured” claims | Evidence does not support wording |
| Multi-runtime installation | Yes | Yes | npm installer/runtime projections | Yes | Extensive install tests/CI | Yes | Package dry run passes; clean install not executed |
| Release and CI | Yes | Yes | GitHub Actions | Yes | Many checks configured | Yes | Strong infrastructure; current tree is uncommitted |

## 4. Agent ↔ Skill ↔ Command Integration

Repository inventory found 72 command definitions, 72 skill directories, and 64 agent markdown files (full and compact forms). Capability descriptors add another routing layer for host adapters and workflow hooks. This inventory is too large for a flat “remember every command” model; the built-in discovery and routing components are important.

The normal GSD path is command → workflow markdown → `gsd-tools` state/query interfaces → agent prompt/dispatch → artifacts in `.planning/` → later workflow reads those artifacts. The new GSD-X path is different: `gsd-tools context` / AST / heuristic manual routes → SDK query/compiler → `.gsd` local data and prompt output. I found no `gsd-core/workflows` references that call `context compile`, `ContextQueryHandler`, or otherwise consume the formatted brief before agent dispatch. `docs/GSD-X-ARCHITECTURE.md:198` says workflows automatically invoke the SDK; that claim is not supported by the workflow files inspected.

| Command / path | Handler / workflow | State consumed / produced | Typical next step | Auto-detect / merge assessment |
|---|---|---|---|---|
| `/gsd:next` | `smart-entry` workflow → one selected command | Detects project and workflow situation; no lifecycle artifact itself | Selected command or `/gsd:progress --next` | Best broad front door; distinct from the automatic advancement engine |
| `/gsd:progress` | `progress` workflow and next router | Reads STATE, ROADMAP, phase artifacts; reports or advances | Plan, execute, verify, close, recover | Keep as status + canonical automatic advancement per ADR-1787 |
| `/gsd:discuss-phase` | `discuss-phase` workflow | Reads project/phase context; writes CONTEXT and discussion log | Plan | Optional when imported PRD/ADR or configured skip path supplies context |
| `/gsd:plan-phase` | plan orchestrator/research/checker | Reads scope/context/research; writes PLAN | Execute | Can select next unplanned phase; should distinguish explicit/automatic phase selection |
| `/gsd:execute-phase` | wave-based executor workflow | Reads PLAN/state; writes code, commits, SUMMARY | Verify/UAT | Must remain explicit work owner; no reason to merge with planning |
| `/gsd:verify-work` | verifier/UAT workflow | Reads phase output; writes verification/UAT/gap plans | Fix, close, or continue | Distinct human acceptance and remediation responsibility |
| `/gsd:phase` | roadmap CRUD router | Adds/inserts/removes/edits phase definitions | Plan phase | Name can be confused with the lifecycle “phase” parent command |
| `gsd-tools context ...` | Core CLI route → SDK ContextQueryHandler | Reads project docs/index/memory; writes inspector telemetry/output | Use brief, inspect, or run an explicit AST update | Callable, but separate from normal workflow and currently not indexed on compile |
| `gsd-tools ast ...` / aliases | Core CLI route → SDK AstCodebaseIndex | Reads source; writes `.gsd/ast-index.json` | Query symbols / compile | Manual index update exists and is tested |
| Heuristic CLI commands | Core CLI route → SDK heuristics | Reads/writes local heuristic store | Retrieve/feedback | Separate lifecycle and user config surface |

**Main wiring concern:** The repository documents compiler-injected agent prompts, but the current prompt-generation/dispatch chain does not consume them. Manual compilation returns text; no verified producer → dispatch consumer path exists in phase workflows. Thus the compiler is a tool a user can call, not the context engine of the GSD lifecycle.

## 5. GSD Command UX Review

### Current primary command complexity

There are **72** primary command files under `commands/gsd`. The core phase lifecycle has six major actions but many advanced operations, audits, setup, recovery, and project-management commands. Those advanced operations are not necessarily redundant; the UX problem is their equal visibility and overlaps between routers.

| Command | Purpose | Required input / prerequisite | Typical next command | Auto-detect? | Merge / tier |
|---|---|---|---|---|---|
| `next` | State-aware action menu | Repository/project context | One selected command | Yes | Tier 1 front door |
| `progress` | Status, `--next`, `--do`, forensic report | Active project/phase depending mode | Phase action or completion | Yes | Tier 1 engine/status; keep distinct from menu |
| `new-project` | Initialize project setup | User's project intent | Requirements/roadmap flow | Some | Tier 1 onboarding |
| `discuss-phase` | Gather phase decisions | Phase identifier/context | `plan-phase` | Partial | Tier 2; preserve explicit action |
| `plan-phase` | Research/check/build plans | Phase or auto-selected target | `execute-phase` | Yes | Tier 1 lifecycle |
| `execute-phase` | Execute plan waves | Existing plan | `verify-work` | Yes within selected phase | Tier 1 lifecycle |
| `verify-work` | UAT and result verification | Executed phase/output | Close/fix/continue | Yes for active verification | Tier 1 lifecycle |
| `phase` | Edit roadmap phase set | CRUD action and phase | `plan-phase` | No | Tier 2 management; rename/qualify in help |
| `help`, `stats`, `health` | Discover/report/diagnose | Usually none | Recommended action | Yes | Tier 1 support surface |
| `capture`, `quick`, `fast` | Small tasks/ideas outside full loop | Intent/task description | Status or phase planning | Some | Tier 2 task entry |
| `pause-work`, `resume-work`, `debug`, `undo` | Recovery/control | Existing state or failure | Resume/progress | Partial | Tier 2 recovery |
| `ship`, `complete-milestone`, `new-milestone` | Release/milestone management | Completed milestone or new goal | New project/milestone loop | Partial | Tier 2 release lifecycle |
| Review, security, UI, eval, docs, AI integration, test, validation, audit commands | Specialized quality workflows | Feature/domain-specific artifacts | Remediate/ship | Usually no | Tier 3 advanced; keep discoverable |
| `ns-*` commands | Grouped context/ideation/workflow/review/manage entrypoints | Their namespace context | Specific command/skill | Yes, intent level | Tier 2/3 navigation shortcuts |

The detailed names can be regenerated from `commands/gsd/*.md`; the actual files should remain discoverable as a complete inventory in help. Do not delete or merge all specialist commands: verification, security, code review, state repair, and planning have distinct artifacts and gates.

**CLI error UX:** Core routing often has structured errors and unknown-command hints. The SDK-side routes generally wrap errors as a generic `context error: ...` or catch-and-fallback silently (index, memory, heuristics). That can hide whether retrieval was skipped and why. Surface a degraded status in the result/manifest when an optional subsystem fails.

## 6. GSD-DISCUSS-PHASE Review

The requested user-local skill was read in full: `C:\Users\udayd\.agents\skills\gsd-discuss-phase\SKILL.md`. It is primarily a Codex adapter and workflow contract, not an architectural source of truth. It correctly emphasizes: load the active workflow before acting; preserve interactive question boundaries; do not write context artifacts before a user answer; use explicit noninteractive flags only when supported; map Task/Agent to collaboration tools only when authorized and available; and do not silently degrade typed-agent semantics.

The repository command `commands/gsd/discuss-phase.md` agrees with the skill's intent: it captures decisions into a phase CONTEXT artifact and routes to discuss/assumptions modes. It should remain a distinct action because its output is user decisions, while planning produces a plan. It is not always required: plan workflows accept PRD/ADR ingestion and have skip-discuss paths.

The command UX risk is its relationship to planning and `requires` metadata. `plan-phase` metadata lists `discuss-phase` as a requirement while its workflow includes valid paths that skip discussion. Other prerequisites also read counterintuitively (for example, execute metadata lists verify-work although execution precedes verification in the user lifecycle). Treat these `requires` relationships as a host surfacing/dependency contract only if that is their precise meaning; publish a separate, canonical state/artifact precondition model so users and tooling do not mistake them for lifecycle order.

### Discuss-phase contract assessment

- **Good:** explicit phase input; prior context/state loading; adaptive questions; explicit assumptions mode; downstream CONTEXT artifact; avoids silent defaults in interactive questioning.
- **Caution:** the specific skill discusses adapter behavior across GSD runtimes and Codex collaboration schema; those instructions should not be treated as a universal product architecture.
- **Gap:** no single authoritative artifact/state table clearly communicates that discussion is optional when upstream PRD/ADR or explicit automation mode supplies decisions.
- **Recommendation:** keep `/gsd:discuss-phase` as an explicit expert action and expose it through `/gsd`/`next` only when phase state indicates unresolved decisions. Do not make `/gsd phase` silently ask questions and then plan in one hidden step.

## 7. Auto-Subcommand / Auto-Routing Design

The repository already has two routing concepts: `/gsd:next` is a situation-aware menu, while `/gsd:progress --next` is the in-project advancement engine. ADR-1787 establishes this separation; preserve it rather than adding another independent state router.

### Recommended target

```text
/gsd                 Show state, recommended action, and concise command menu
/gsd next            Route to one best next action after state checks
/gsd next --auto     Continue safe lifecycle transitions until a decision/gate
/gsd status          Read-only status (alias/view of progress default)

/gsd project new     Explicit project initialization
/gsd phase discuss   Explicit user decision capture
/gsd phase plan      Explicit planning
/gsd phase execute   Explicit execution
/gsd phase verify    Explicit human UAT/verification
/gsd advanced        Discover specialist operations
```

This is a **future UX proposal**, not an implementation. On runtimes where a true nested slash-command parent is unsupported, retain existing files as compatibility aliases and make `/gsd:next` the equivalent front door. A router must inspect state but only automatically perform reversible, state-safe steps. Before executing code, accepting a design decision, closing a milestone, deleting state, creating a PR, or making an external action, it should hand control to the corresponding explicit workflow/gate.

### State model recommendation

Derive state from authoritative `.planning` artifacts rather than maintain a redundant state enum. Keep one shared resolver that reports predicates and evidence:

| Derived state | Evidence | Suggested action |
|---|---|---|
| Uninitialized | No project metadata/requirements baseline | `new-project` |
| Project initialized, no roadmap | Project context exists; roadmap absent | requirements/roadmap setup |
| Roadmap ready, no phase decision artifact | Active phase exists; no CONTEXT and no accepted input artifact | `discuss-phase` or skip if valid source/flag |
| Phase needs plan | Active phase has no incomplete PLAN | `plan-phase` |
| Plan has incomplete tasks | PLAN exists and work remains | `execute-phase` |
| Execution done, verification pending | summaries exist; verification/UAT incomplete | `verify-work` |
| Verification has gaps | verification reports unmet work or gap plan | `plan-phase --gaps` / execute |
| Phase complete | Canonical completion predicate satisfied | next phase or milestone action |
| Blocked/inconsistent | malformed/conflicting state evidence | health/recovery route; do not guess |

The same resolver should power `/gsd`, `/gsd:next`, and progress reporting; commands should remain directly invocable. Preserve old command paths as compatibility aliases across a documented release window.

## 8. Memory / Context Review

The SDK contains meaningful mechanics: local hashed embeddings, multi-factor ranking, authority, scope matching, JSONL persistence, and memory CRUD. The compiler requests up to six memories using project/phase filters and renders them in a retrieved-memory delimiter. Heuristics are separately retrieved and filtered for cross-project recommendations.

The core project also has `.planning` decisions/learnings and MemPalace-oriented flows. These are distinct persistence and retrieval systems with different ownership and provenance. Until a lifecycle integration is implemented, the SDK memory store does not replace core learned context; users should not assume one system sees the other's records. Define canonical ownership, project/global scope, provenance, expiration, and conflict precedence before automatic injection.

| Memory/context link | Audit result |
|---|---|
| Store → embedding → search/rerank | Connected in SDK; local-hash semantics are deterministic lexical-feature hashing, not a hosted semantic model |
| Project isolation | Query includes project ID and phase; global records are intentionally loaded into each store. Confirm policy for similarly named projects and global advice |
| Memory → compiler | Connected for manual SDK/context compilation; broad exceptions silently degrade to no memories |
| Compiler → phase agent | Not connected in normal phase workflow inspected |
| Memory category/authority | Schema carries type, scope, authority, confidence, importance; tests cover basic ranking and conflict behavior |
| Global paths | Default global store is `~/.gsd-x/memory/store.jsonl`; initialization creates it and persistence rewrites both project/global files |
| Stale/duplicate/conflict policy | Decay/consolidation helpers exist; no verified automatic lifecycle maintenance path from ordinary GSD phases |
| LanceDB | Adapter exists but `@lancedb/lancedb` is not a dependency; reads/search delegate to JSONL fallback even when native is available |

**Misalignment:** docs present LanceDB as the primary vector store, but published dependencies do not include it and `LanceMemoryStore.search()` delegates to `JsonMemoryStore`. Rename it to experimental or implement dependency, vector search, and CRUD parity before claiming production vector DB support.

## 9. Code Indexing Review

The AST subsystem genuinely scans and incrementally updates files when `AstCodebaseIndex.updateIndex()` is called. It removes deleted paths, hashes content, and persists entries. The CLI index command reaches that method, and the 16-test AST suite passed, including the tested Rust, Go, C++ and command paths.

The context compiler only calls `codeIndex.initialize()` before `searchSymbols()`. `initialize()` loads a persisted snapshot but does not discover/index source files. Therefore a fresh project can yield no code context; an existing project's changed files remain stale until the user separately runs the index command. This is a confirmed integration defect, not an absence of parser functionality.

Tree-sitter wrappers and WASM resolution are wired for Rust, Go, C++, and C. TypeScript, JavaScript, and Python are detected but routed to regex fallback. Document that distinction in the supported-language matrix; do not imply grammar-accurate AST behavior for those languages.

The scan skips common generated directories (`node_modules`, `.git`, `dist`, `build`, `.gsd`, etc.) and hidden directories, but file-size/binary limits and symlink policy should be explicit. Index persistence uses direct writes, so interrupted writes can corrupt the JSON cache; current load failure degrades to empty state but does not report/rebuild automatically.

**Security:** cached AST entries are loaded from `.gsd/ast-index.json`. The compiler joins persisted `sym.filePath` values to `projectDir` and reads the resulting path without a containment check. A tampered index could direct the compiler outside the project root. Validate every deserialized path as normalized, relative, and contained before file access.

## 10. Security Review

### Confirmed findings

1. **P1 — Cross-origin disclosure from local inspector.** `ContextInspectorServer` binds to `127.0.0.1` but sets `Access-Control-Allow-Origin: *` and serves `/api/latest`, `/api/history`, and individual compilation records. Records include task prompts, selected memory content, and code snippets. Any website running in the user's browser can attempt to read localhost data with the wildcard CORS permission. Remove the wildcard header (the same-origin dashboard does not need it); add Origin/Host validation and a per-process capability token if cross-origin clients are required.
2. **P1 — Persisted path traversal in compiler index consumption.** `.gsd/ast-index.json` is project-controlled state. The compiler trusts its `filePath` on returned symbols and reads via `path.join(projectDir, sym.filePath)`. Add root-containment validation and reject absolute paths, `..`, drive prefixes, and symlink escapes before reading.
3. **P2 — Prompt injection boundaries are incomplete by design.** Memory is wrapped and labeled informational, and heuristics have a privacy/isolation suite. Source snippets and planning documents are still untrusted repository content; the compiled brief's operational contract should explicitly keep those inputs as data and retain trusted command/agent instructions above them. This is a design hardening recommendation, not a confirmed prompt-policy bypass in current core flows.

### Other security posture

- Local inspector binds loopback, which limits direct network exposure but does not make wildcard CORS safe.
- Secret redaction and heuristic project-isolation tests exist.
- Core repo contains dedicated injection scanners and untrusted-input isolation tests.
- No static scan indicated secrets in the audited changed paths, but the full repository secret scan was not rerun as part of this audit.
- `context inspect --open` uses a constructed shell command with `child_process.exec`; URL is generated from numeric port and loopback address, reducing injection surface. Prefer `execFile` with platform-specific arguments to avoid shell parsing.
- Persisted JSON state should be treated as untrusted and validated at every read boundary, not only written by the SDK itself.

## 11. Testing Review

The repository has around 1,056 `*.test.cjs` tests plus a categorized runner, test sharding, coverage floors, mutation testing, focused install/security/integration suites, and many anti-drift lints. The test architecture is a strength. Test count alone does not establish production integration coverage.

### Checks run in this audit

| Check | Result | Interpretation |
|---|---|---|
| `npm run build:sdk` | PASS | SDK TypeScript compiled |
| `node --test` context compiler, code index, regression, routing suites | PASS, 25 tests | Unit-level SDK functionality works for tested fixtures |
| `node --test tests/gsd-x-ast-tree-sitter.test.cjs` | PASS, 16 tests | Rust/Go/C++ AST and manual CLI index/query paths pass |
| Heuristics isolation + memory suites | PASS, 14 tests | Tested privacy/scoring/JSON CRUD paths pass |
| `node --test tests/gsd-x-context-inspector.test.cjs` | BLOCKED, loopback `EACCES` | HTTP endpoint behavior not verified in this sandbox |
| `node --test tests/gsd-x-antigravity.test.cjs` | 2 pass / 1 blocked | Injection test writes to `C:\Users\udayd\.gsd-x\memory\store.jsonl`, outside writable workspace; it did not reach its assertions |
| `npm run benchmark:verify` | PASS | Confirms arithmetic and README string consistency only |
| `npm pack --dry-run --json` | PASS | `prepack`/`prepare` build succeeded; package contained 1,339 entries, ~19.0 MB unpacked, including SDK dist |
| `gsd-tools --help` | PASS | `context` and standard core verbs are registered; help does not list AST aliases in top-level command summary |

The full project test matrix and live npm install smoke workflow were not run. Local HTTP behavior could not be tested because the sandbox denied loopback connections. No claim is made that all 1,056 tests pass.

### Test-quality gaps

- The Antigravity prompt-isolation test uses default `globalDir` and consequently reads/writes the user's home global memory store. Tests should pass an isolated temporary global directory and clean it up.
- Compiler tests do not assert that fresh source is indexed during a normal compile, the token cap holds with required + code + memory + heuristics, or telemetry stages equal measured counters.
- The inspector HTTP test's failure in this environment is due to sandbox socket permissions, but its test harness has no skip/alternative server injection path for restricted environments.
- Benchmark verification tests the stored numbers and prose consistency, not the live compiler pipeline or an LLM call.
- Workflow scenarios requested in the audit brief (new project, resume, failed execution, multiple phases, cross-project memory reuse) were not executed end-to-end in a temporary installed runtime.

## 12. Performance Review

No reliable startup, indexing, retrieval, or memory benchmark was run. The inspected SDK uses synchronous filesystem reads/writes in async operations, recursively rescans source on explicit index updates, reads full files for symbol slices, and records telemetry synchronously. Those choices may be adequate for small projects, but require measurement at repository scale.

The inspector's stage times are hardcoded (for example 8/14/12/9/6 ms) and stage reductions are fixed ratios, not measured. Aggregate `totalLatencyMs` exists, but it does not validate the stage breakdown. The dashboard must not present fabricated stage values as runtime measurements.

## 13. Documentation Review

Documentation is broad, with English and translated guides, feature references, ADRs, testing standards, release guidance, and a dedicated GSD-X architecture/compiler/memory story. The key issue is accuracy rather than absence.

| Claim / doc | Evidence | Required correction |
|---|---|---|
| `docs/GSD-X-ARCHITECTURE.md:198`: workflows invoke SDK compiler before spawning agents | No such call found in phase workflow files; manual CLI route exists | Implement actual adapter/injection seam or state clearly that compilation is manual/experimental |
| README headline: “Measured” 67.5% / 83.0% token reductions | Benchmark harness constructs synthetic `gsxInput` and reuses `typicalOutputTokens` | Reword as fixture simulation, or build a live and independently measured benchmark |
| Docs call AST Tree-sitter for broad language set | Tree-sitter parser wrappers only Rust/Go/C/C++; TS/JS/Python use regex fallback | Publish an exact per-language parser table |
| Docs describe LanceDB as primary vector backend | Package lacks `@lancedb/lancedb`; search always uses JSON fallback | Mark optional/experimental or complete the implementation and packaging |
| Context docs promise strict budget / real stage metrics | Code omits heuristics from budget, does not trim code/memories, permits required overflow, uses synthetic stage metrics | Fix code and docs together |

The current `README.md` change is uncommitted, so these claims must be rechecked against the committed release candidate before publication.

## 14. Packaging / Release Review

`package.json` has public package metadata, Node `>=24`, npm `>=10`, bin entries, build/prepack/prepare scripts, and an explicit npm `files` allowlist. Git remotes identify `origin` as GSD-X and `upstream` as open-gsd/gsd-core. The npm dry run succeeded and included the compiled SDK plus commands, skills, agents, GSD Core, hooks, and runtime projections.

**Positive evidence:** local `npm pack --dry-run --json` ran `prepack` and `prepare` successfully and enumerated 1,339 files (~19.0 MB unpacked).

**Still unverified:** actual clean `npm pack` + isolated `npm install` + command smoke test; release workflow; all host projections after install; macOS/Linux behavior for changed SDK paths; full CI matrix; actual published-state benchmark. The current worktree is dirty, so this is not a releasable commit as-is.

No publication should occur until the existing uncommitted user changes are intentionally reviewed, tests run in a suitable environment, and the release candidate is verified from a clean checkout/tarball.

## 15. Dead Code / Orphaned Code

| Component | Classification | Evidence / consequence |
|---|---|---|
| SDK compiler → GSD phase agent dispatch | Partially integrated / disconnected from default lifecycle | CLI route and SDK query exist; no workflow call into compile output found, despite architecture doc claim |
| Context code index update → compiler | Incorrectly disconnected | Explicit index command updates; compiler only loads cached index |
| Tree-sitter parser dispatch for JS/TS/Python | Misaligned | Language detection exists, but parser manager returns regex fallback |
| LanceDB search backend | Incomplete/partially orphaned | Optional require never packaged; search/read operations delegate to JSONL |
| Inspector telemetry stage metrics | Misleading placeholder data | Fixed ratios and constants replace measured stage data |
| Core learnings/MemPalace vs SDK memory/heuristics | Competing memory abstractions | Separate schemas, persistence, and retrieval ownership; no unified lifecycle/provenance contract |
| `commands/gsd/ns-*` and corresponding skill entries | Intentional navigation surface | Grouped domain entrypoints; possible discoverability duplication, not dead code |
| Compact agent prompts | Intentional host/token variants | Should be validated against canonical agent through existing parity checks |

No deletion is recommended before owners and compatibility contracts are confirmed.

## 16. Prioritized Bug List

Severity uses P0 release blocker, P1 critical, P2 important, P3 improvement. Confidence is shown per finding.

### P0

None confirmed in this audit.

### P1

- **[Security, Confirmed] Inspector API allows wildcard cross-origin reads of sensitive task/memory/source records.** `sdk/src/context/inspector/server.ts:28, 46-65`. Remove wildcard CORS and validate host/origin; add capability token if cross-origin access is required.
- **[Security, Confirmed] Untrusted AST cache path can escape the project root.** Cache deserialization in `sdk/src/context/ast/ast-index.ts:39-51`; compiler file read path at `sdk/src/context/compiler.ts:95-103`. Validate containment and symlink resolution before reading.
- **[Correctness, Confirmed] Compiler's “strict” token budget is not strict.** `sdk/src/context/compiler.ts:251-279`: heuristics aren't counted, and over-budget handling only removes optional planning docs; code and memory remain, required docs can overflow. Recompute from the actual rendered brief and apply an explicit critical-context overflow policy.
- **[Documentation/Release, Confirmed] README calls synthetic fixture calculations measured benchmark results.** `benchmarks/run-benchmark.cjs:86, 124-126` fixes output token counts and estimates a hand-constructed input. Change claims to illustrative/simulation or run live, reproducible comparisons with raw prompt/output evidence and independent baselines.

### P2

- **[Integration, Confirmed] GSD-X compiler is not invoked by normal GSD planning/execution workflows despite documentation claiming it is.** Manual `gsd-tools context` route exists (`gsd-core/bin/gsd-tools.cjs:4848+`); no lifecycle workflow consumer found; architecture claim at `docs/GSD-X-ARCHITECTURE.md:198`.
- **[Correctness, Confirmed] Compiler never refreshes code index.** It calls `initialize()` at `sdk/src/context/compiler.ts:92`; only `updateIndex()` scans files in `sdk/src/context/code-index.ts:99+` / `sdk/src/context/ast/ast-index.ts:74+`.
- **[Observability, Confirmed] Context inspector stages use fabricated reductions and timings.** `sdk/src/context/compiler.ts:324-365`. Instrument each stage or label clearly as estimated and stop presenting as observed.
- **[Integration, Confirmed] Tree-sitter coverage is Rust/Go/C/C++; JS/TS/Python are fallback regex.** `sdk/src/context/ast/parser-manager.ts`; correct docs and avoid AST guarantees for fallback languages.
- **[Memory, Confirmed] LanceDB is not a functional primary backend in the published package.** Dependency absent from `package.json`; native module is optional require; `LanceMemoryStore.search()` delegates to JSON store at `sdk/src/memory/lancedb-store.ts:131`. Either make it a real optional dependency with vector-backed reads or remove primary-backend claims.
- **[Testing, Confirmed] Antigravity test writes through a global memory path.** `tests/gsd-x-antigravity.test.cjs:77-78`, `sdk/src/memory/store.ts:53-58, 96-115`. Inject an isolated global directory; protect user state and concurrent invocations.
- **[State/Recovery, Likely] Index and telemetry persistence use direct writes/appends, not atomic replacement.** Interrupted writes can leave invalid caches or partial history. Use atomic temp+rename for snapshots and tolerate/repair malformed lines with surfaced diagnostics.
- **[Architecture, Likely] Parallel memory concepts lack a single authority/provenance contract.** `.planning` learnings, MemPalace, SDK JSONL memory, and global heuristics can disagree; define precedence and lifecycle before auto-injection.
- **[UX, Confirmed] The 72-command flat inventory is hard to discover, and `next` vs `progress --next` is easy to conflate.** Keep the deliberate menu/engine distinction from ADR-1787, but provide one short front door and canonical state explanation.

### P3

- **[CLI/Docs, Confirmed] Top-level `gsd-tools --help` omits explicit AST aliases even though they are registered.** Add generated help or direct users to `ast help`.
- **[Security/Portability, Likely] `context inspect --open` uses shell `exec` for a local URL.** Use `execFile` with fixed executable/argument boundaries.
- **[Performance, Needs verification] Recursive indexing and synchronous whole-file reads may be expensive for large monorepos.** Establish measured scale and limits before optimizing.
- **[Release, Needs verification] Clean install and all runtime-host packaging paths were not exercised in this audit.** Run release tarball smoke in an environment with network/install permissions.

## 17. Recommended Command Architecture

Adopt a small beginner surface without removing expert commands:

```text
/gsd                 status + recommended action + specialist command list
/gsd next            menu-based state-aware routing
/gsd next --auto     deterministic safe advancement until a decision/gate
/gsd project new     project setup
/gsd phase discuss|plan|execute|verify
/gsd advanced        expert command catalog
```

If hosts cannot support nested subcommands, implement the same model as `/gsd:next` plus existing commands. Keep `/gsd:progress` as the canonical read/report and `--next` advancement engine. Do not add an independent state machine to `smart-entry`; share one artifact-derived resolver across status and routing. Explicit commands remain supported as compatibility entrypoints. Every auto-route response should show detected evidence, chosen action, and a direct command to override it.

The target should not automatically collapse discussion into planning: user decision capture, plan creation, execution, and human acceptance have distinct outputs and risk boundaries.

## 18. Remediation Roadmap

### Phase A — Security and data integrity

1. Remove wildcard CORS; validate Host/Origin and restrict inspector endpoints.
2. Validate persisted index paths and symlink containment before reading files.
3. Make persistence atomic and report malformed state/cache recovery.
4. Make tests use isolated project and global roots.

### Phase B — Correct context compilation

1. Define budget accounting over the exact rendered brief, including wrappers, task text, heuristics, memory, code, and required artifacts.
2. Add explicit overflow behavior and report actual final count vs budget.
3. Update/validate index freshness during compilation, with a documented latency/freshness option.
4. Replace fabricated inspector stage metrics with measured counters/timers.

### Phase C — Architecture and feature truth

1. Decide whether compiler injection is a supported GSD lifecycle capability. If yes, add a single documented dispatcher seam and end-to-end tests. If no, revise architecture/docs to call it manual SDK tooling.
2. Unify or explicitly separate GSD Core learnings/MemPalace and GSD-X memories/heuristics with provenance, scope, precedence, expiration, and opt-out behavior.
3. Make LanceDB genuinely functional or mark/remove it as a supported backend.
4. Publish precise AST language support and add parser implementations only when needed.

### Phase D — Evidence, UX, and release

1. Correct benchmark language or build a real controlled comparison harness.
2. Add workflow tests for fresh project, resumed project, interrupted/failed execution, next phase, and cross-project memory isolation.
3. Add beginner front-door status/routing around the existing canonical router; preserve aliases.
4. Run full CI and clean install/tarball smoke from an isolated checkout on Windows, Linux, and macOS.
5. Re-audit a clean candidate commit and verify all generated/package artifacts.

## 19. Final Release Checklist

- [ ] Fix inspector CORS and validate loopback/Host/Origin behavior.
- [ ] Reject project-root path escapes from untrusted index/cache state.
- [ ] Enforce the real rendered context budget or remove “strict budget” claims.
- [ ] Refresh code index automatically or clearly require and surface explicit indexing.
- [ ] Replace or relabel synthetic stage telemetry.
- [ ] Correct benchmark “measured” statements, methodology, and README badges.
- [ ] Resolve SDK compiler ↔ GSD workflow integration and architecture-doc mismatch.
- [ ] Decide LanceDB support and reconcile dependency/backend behavior.
- [ ] Clarify AST parser support per language.
- [ ] Isolate test global storage and run complete SDK suite with networking enabled.
- [ ] Execute core integration/security/install suites and full platform CI.
- [ ] Run clean tarball install and user workflow smoke tests.
- [ ] Review the dirty user changes, generate a clean release candidate, and rerun release gates.

**Answer to “what will break if published today?”** The strongest risk is not a broken package build—the SDK compiles and npm pack dry run succeeds. It is that users will receive claims of automatic context injection, strict budgets, measured savings, and a safe local inspector that the current evidence/code does not fully support. Fresh/stale indexes can omit relevant code; local websites may read inspector records; and crafted persisted index state can point reads outside the project. These must be addressed or accurately scoped before a production release.
