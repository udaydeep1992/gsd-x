# GSD-X Local-First Semantic Memory Engine

> **GSD-X Memory Engine**: Persistent, local-first semantic memory designed to preserve important project knowledge across development sessions while preventing context bloat.

---

## 1. Core Principle

```
MEMORY MUST REPLACE REDUNDANT CONTEXT, NOT SIMPLY ADD MORE CONTEXT.
```

In standard AI development frameworks, memory often becomes an accumulative liability: every conversation or task is bloated with previous session transcripts, duplicate notes, and stale information.

**GSD-X flips this dynamic**:
1. Memory entries are compact, distilled facts (decisions, patterns, architectural constraints).
2. Retrieved memories substitute for bulky planning documents or repetitive file reads.
3. If a 25-token memory fact answers an architectural question, the 1,500-token `ARCHITECTURE.md` file is omitted from the prompt.

---

## 2. Storage Architecture

GSD-X implements a clean dual-backend storage interface via `MemoryStore`:

```
┌────────────────────────────────────────────────────────┐
│                     MemoryStore                        │
│                 (Abstract Interface)                   │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
  ┌───────────────────┐           ┌───────────────────┐
  │  LanceMemoryStore │           │  JsonMemoryStore  │
  │ (Vector Database) │           │ (Zero-Dep JSONL)  │
  └───────────────────┘           └───────────────────┘
```

- **Primary Backend (`LanceMemoryStore`)**: Uses [LanceDB](https://lancedb.github.io/lancedb/) for ultra-fast columnar vector search with zero external server dependencies.
- **Resilient Fallback (`JsonMemoryStore`)**: A zero-dependency pure TypeScript JSONL implementation that activates automatically if native C++ bindings for LanceDB are absent or uncompiled on the host OS.
- **Zero Lock-In**: Workflows and agents interact exclusively with the `MemoryStore` abstraction. Additional backends (SQLite, Qdrant) can be plugged in without touching orchestration code.

### Storage Locations

To maintain clean repository hygiene and prevent git pollution:
- **Project-Local Memory**: Stored in `.gsd/memory/` (not `.planning/`), keeping `.planning/` human-readable and version-controlled.
- **Global User Memory**: Stored in `~/.gsd-x/memory/` for cross-project preferences and universal architectural idioms.

---

## 3. Schema & Data Model

Every memory item conforms to the strict `MemoryEntry` interface:

```typescript
interface MemoryEntry {
  id: string;                    // Unique identifier (e.g., mem-u-abc123)
  content: string;               // Normalized, secret-redacted text fact
  type: MemoryType;              // 'decision' | 'pattern' | 'architecture' | 'bug' | ...
  scope: MemoryScope;            // 'phase' | 'project' | 'global'
  projectId?: string;            // Bound project identifier
  phaseId?: string;              // Bound phase identifier
  source?: string;               // Origin document or task (e.g. SUMMARY.md)
  authority: MemoryAuthority;    // 'authoritative' | 'verified' | 'learned' | ...
  importance: number;            // Normalized 0.0 to 1.0 scale
  confidence: number;            // Extraction confidence (0.0 to 1.0)
  createdAt: string;             // ISO-8601 timestamp
  updatedAt: string;             // ISO-8601 timestamp
  lastRetrievedAt?: string;      // Last access timestamp
  retrievalCount: number;        // Access frequency counter
  tags: string[];                // Search and category tags
  embedding?: number[];          // 128-dimensional L2-normalized vector
  supersedes?: string;           // Optional pointer to overridden memory ID
}
```

---

## 4. Vector Embeddings (`LocalHashEmbeddingProvider`)

To eliminate heavyweight external embedding servers or native Python runtimes:
- **Deterministic 128-dimensional Feature Hashing**: Uses MurmurHash3 / SHA-256 word n-grams mapped into a 128-dim dense vector.
- **L2-Normalized**: All embeddings are normalized to unit length (\(\|v\|_2 = 1.0\)), enabling instantaneous cosine similarity calculations via dot product.
- **Custom Extensibility**: The `CustomEmbeddingProvider` interface allows swapping in OpenAI `text-embedding-3-small`, Ollama `nomic-embed-text`, or local HuggingFace models via simple environment configuration.

---

## 5. Multi-Factor Scoring Formula

Retrieval is never simple vector distance. GSD-X evaluates candidates using a weighted multi-factor scoring function:

$$\text{CandidateScore} = \left(\sum_{i} w_i \cdot f_i\right) \times M_{\text{scope}}$$

Where:
- $f_{\text{sim}}$: Cosine semantic similarity of query vs. memory embedding ($w = 0.25$)
- $f_{\text{project}}$: Project boundary match ($w = 0.20$)
- $f_{\text{phase}}$: Phase context match ($w = 0.15$)
- $f_{\text{task}}$: Task keyword and tag relevance ($w = 0.10$)
- $f_{\text{importance}}$: Intrinsic importance rating ($w = 0.10$)
- $f_{\text{authority}}$: Authority hierarchy weight ($w = 0.10$)
- $f_{\text{recency}}$: Exponential time decay ($w = 0.05$, half-life $t_{1/2} = 30$ days)
- $f_{\text{confidence}}$: Extraction confidence ($w = 0.05$)
- $M_{\text{scope}}$: Scope priority multiplier ($\text{Phase} = 1.25\times$, $\text{Project} = 1.10\times$, $\text{Global} = 0.85\times$)

---

## 6. Authority Hierarchy & Conflict Resolution

GSD-X enforces strict epistemological precedence:

| Authority Level | Precedence | Description |
|:---|:---:|:---|
| `authoritative` | 6 | Explicit user directives, `PROJECT.md`, formal contracts |
| `verified` | 5 | Passed UAT verification reports, confirmed test outputs |
| `high-confidence` | 4 | Human-reviewed plan summaries |
| `learned` | 3 | Automated post-task summary extraction |
| `inferred` | 2 | Contextual deductions from codebase patterns |
| `experimental` | 1 | Unvalidated hypothesis or speculative fixes |

### Conflict Resolution Rule
When two memory records make conflicting claims:
1. Higher authority **always** wins.
2. If authority levels are equal, higher confidence wins.
3. If confidence is equal, the more recently updated entry wins.

---

## 7. Knowledge Lifecycle: Decay & Consolidation

### Temporal Decay
Memories naturally decay in retrieval priority based on age, preventing historical trivia from cluttering active tasks:
- **Exemption Rule**: Authoritative architecture decisions, invariant constraints, and core conventions **never decay** ($DecayRate = 0$).
- **Decay Curve**: General experience memories follow an exponential decay curve with a 30-day half-life.

### Memory Consolidation
As repeated tasks run, redundant observations are automatically merged:
- Semantic overlap clustering detects multiple records addressing the same subsystem.
- Provenance is preserved (`consolidatedFrom: ['mem-1', 'mem-2']`).
- Generates a concise canonical statement, saving up to 60% of memory token consumption.

---

## 8. CLI Command Reference

Access the memory engine directly from any terminal or agent session:

```bash
# Search project and global memories
node gsd-core/bin/gsd-tools.cjs memory search "database connection pooling" --limit 5

# View detailed memory entry with metadata
node gsd-core/bin/gsd-tools.cjs memory show mem-u-muvlvv9c

# Manually store an architectural decision
node gsd-core/bin/gsd-tools.cjs memory add "Use Prisma 6 for PostgreSQL migrations" --type decision --tags orm,db

# Run health diagnostics and secret leakage audit
node gsd-core/bin/gsd-tools.cjs memory doctor

# Display memory storage statistics
node gsd-core/bin/gsd-tools.cjs memory stats

# Forget or invalidate an obsolete memory entry
node gsd-core/bin/gsd-tools.cjs memory forget mem-u-muvlvv9c
```
