# GSD-X Migration & Compatibility Guide

> **Zero Breaking Changes**: How to upgrade from Open GSD Core, GSD v1, or GSD v2 to GSD-X seamlessly while preserving all existing project state.

---

## 1. Backwards Compatibility Commitment

GSD-X is an additive intelligence layer built on top of Open GSD Core. It strictly preserves:
- The entire `.planning/` directory structure
- `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, and `STATE.md`
- All phase directories (`phases/XX-name/`)
- Existing workflows: `/map`, `/plan`, `/execute`, `/verify`
- Existing specialized subagents (`gsd-planner`, `gsd-executor`, `gsd-verifier`, `gsd-debugger`)
- Existing model profiles and runtime abstractions

**Your existing `.planning/` documents are never altered, moved, or deleted by GSD-X.**

---

## 2. Upgrading Existing Projects

### Step 1: Switch to GSD-X
In your repository or global install:
```bash
git remote add gsd-x https://github.com/<your-fork>/gsd-x.git
git fetch gsd-x
git checkout gsd-x
```

### Step 2: Build the GSD-X SDK
Compile the TypeScript intelligence layer:
```bash
npm install
npm run build:sdk
```

### Step 3: Verify Existing Planning State
Run standard GSD state checks to verify that all existing state is intact:
```bash
node gsd-core/bin/gsd-tools.cjs state load
node gsd-core/bin/gsd-tools.cjs roadmap status
```

### Step 4: Initialize GSD-X Memory
Scan your existing summary documents and codebase to seed the local memory store:
```bash
node gsd-core/bin/gsd-tools.cjs memory rebuild
```

---

## 3. Configuration & Feature Toggles

GSD-X allows toggling each intelligence subsystem independently via `.planning/config.json`:

```json
{
  "gsd_x": {
    "enabled": true,
    "memory": {
      "enabled": true,
      "backend": "auto",
      "vector_dimensions": 128
    },
    "context_compiler": {
      "enabled": true,
      "adaptive_budget": true,
      "deduplication": true,
      "code_indexing": true
    },
    "model_router": {
      "enabled": false,
      "default_model": "inherit"
    }
  }
}
```

### Fallback to Upstream GSD Mode
If you set `"gsd_x": { "enabled": false }`, the system bypasses all memory and context compilation, operating in 100% upstream Open GSD mode.

---

## 4. Coexistence with GSD v2 (`.gsd/`)

If migrating a legacy GSD v2 workspace that used `.gsd/` for planning docs:
```bash
# Import GSD v2 artifacts into canonical GSD .planning/ format
node gsd-core/bin/gsd-tools.cjs from-gsd2 --path .
```
GSD-X will import the legacy files into `.planning/` while using `.gsd/memory/` strictly for vector and semantic storage.
