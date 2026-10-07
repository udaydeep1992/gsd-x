/**
 * GSD-X Context Compiler Tests
 *
 * Tests adaptive budgeting, source selection, semantic deduplication,
 * context compression, and manifest generation.
 */

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { cleanup } = require('./helpers.cjs');

const {
  classifyTaskComplexity,
  calculateAdaptiveBudget,
  selectTaskContext,
  deduplicateContextItems,
  compressHistoricalSummary,
  compressCodeToOutline,
  ContextCompiler,
  formatContextStats,
} = require('../sdk/dist/context/index.js');

describe('GSD-X Context Compiler Engine', () => {
  const testTmpDir = path.join(os.tmpdir(), `gsd-x-compiler-test-${Date.now()}`);

  before(() => {
    fs.mkdirSync(testTmpDir, { recursive: true });
    // Create mock .planning/ directory
    const planningDir = path.join(testTmpDir, '.planning');
    fs.mkdirSync(path.join(planningDir, 'codebase'), { recursive: true });
    fs.mkdirSync(path.join(planningDir, 'phases', '1-auth'), { recursive: true });

    fs.writeFileSync(
      path.join(planningDir, 'PROJECT.md'),
      '# Project\nFastAPI backend with Redis pub/sub and PostgreSQL.\n'
    );
    fs.writeFileSync(
      path.join(planningDir, 'STATE.md'),
      '# State\nActive phase: 1\nCompleted: 0/2\n'
    );
    fs.writeFileSync(
      path.join(planningDir, 'codebase', 'ARCHITECTURE.md'),
      '# Architecture\nBackend uses FastAPI for REST endpoints.\nAuthentication is via JWT tokens.\n'
    );
    fs.writeFileSync(
      path.join(planningDir, 'codebase', 'CONVENTIONS.md'),
      '# Conventions\nExplicit type annotations are mandatory.\n'
    );
    fs.writeFileSync(
      path.join(planningDir, 'phases', '1-auth', '1.1-PLAN.md'),
      '# Plan 1.1\nObjective: Implement JWT auth route.\n'
    );
  });

  after(() => {
    cleanup(testTmpDir);
  });

  describe('1. Task Complexity & Adaptive Budgeting', () => {
    test('classifies tasks into appropriate complexity categories', () => {
      assert.strictEqual(classifyTaskComplexity('Check status and show current state'), 'trivial');
      assert.strictEqual(classifyTaskComplexity('Fix 422 error on endpoint'), 'small');
      assert.strictEqual(classifyTaskComplexity('Implement customer order API endpoints'), 'medium');
      assert.strictEqual(classifyTaskComplexity('Implement WebSocket reconnect and message sync refactor'), 'large');
      assert.strictEqual(classifyTaskComplexity('Design system architecture and database schema spec'), 'architectural');
    });

    test('allocates adaptive budgets with correct proportions', () => {
      const smallBudget = calculateAdaptiveBudget({ task: 'Fix null pointer crash in user login' });
      const archBudget = calculateAdaptiveBudget({ task: 'Design microservices architecture' });

      assert.ok(smallBudget.totalBudget <= 10000, `Small budget should be <= 10K, got ${smallBudget.totalBudget}`);
      assert.ok(archBudget.totalBudget >= 25000, `Arch budget should be >= 25K, got ${archBudget.totalBudget}`);

      // Verify sub-allocations
      assert.ok(smallBudget.planningBudget > 0);
      assert.ok(smallBudget.codeBudget > 0);
      assert.ok(smallBudget.memoryBudget > 0);
      assert.ok(smallBudget.instructionBudget > 0);
    });

    test('respects explicit requestedBudget override', () => {
      const budget = calculateAdaptiveBudget({
        task: 'Generic task',
        requestedBudget: 15000,
      });
      assert.strictEqual(budget.totalBudget, 15000);
    });
  });

  describe('2. Task-Aware Selection & Omission', () => {
    test('selects relevant artifacts and marks unrelated for omission', () => {
      const items = [
        {
          id: '1',
          sourcePath: '.planning/STATE.md',
          content: 'Phase 1 in progress',
          priority: 'required',
          category: 'planning',
          estimatedTokens: 20,
          reason: 'State',
        },
        {
          id: '2',
          sourcePath: '.planning/codebase/ARCHITECTURE.md',
          content: 'FastAPI auth with JWT tokens and bcrypt password hashing',
          priority: 'important',
          category: 'architecture',
          estimatedTokens: 50,
          reason: 'Auth arch',
        },
        {
          id: '3',
          sourcePath: '.planning/codebase/FRONTEND_STYLING.md',
          content: 'Tailwind CSS animations and micro-interactions',
          priority: 'important',
          category: 'architecture',
          estimatedTokens: 50,
          reason: 'Frontend styling',
        },
      ];

      const result = selectTaskContext(items, 'Implement JWT auth endpoint login');
      assert.strictEqual(result.selected.length, 2, 'Should select STATE.md and auth ARCHITECTURE.md');
      assert.strictEqual(result.omitted.length, 1, 'Should omit FRONTEND_STYLING.md');
      assert.strictEqual(result.omitted[0].source, '.planning/codebase/FRONTEND_STYLING.md');
    });
  });

  describe('3. Semantic Deduplication', () => {
    test('collapses repetitive facts across documents and tracks tokens saved', () => {
      const items = [
        {
          id: 'doc-1',
          sourcePath: 'PROJECT.md',
          content: '- Backend uses FastAPI for all REST API endpoints\n- Database is PostgreSQL\n',
          priority: 'required',
          category: 'planning',
          estimatedTokens: 30,
          reason: 'Project',
        },
        {
          id: 'doc-2',
          sourcePath: 'ARCHITECTURE.md',
          content: '- Backend uses FastAPI for all REST API endpoints\n- Auth uses JWT\n',
          priority: 'important',
          category: 'architecture',
          estimatedTokens: 30,
          reason: 'Arch',
        },
      ];

      const result = deduplicateContextItems(items);
      assert.ok(result.totalTokensSaved > 0, `Should report tokens saved: ${result.totalTokensSaved}`);
      assert.strictEqual(result.factsExtracted.length, 1, 'Should detect 1 duplicate fact');

      // Second document's redundant line should be collapsed
      const doc2Lines = result.deduplicatedItems[1].content.split('\n').filter(Boolean);
      assert.strictEqual(doc2Lines.length, 1, 'Doc 2 should only retain the unique JWT line');
    });
  });

  describe('4. Context Compression', () => {
    test('compresses historical summary into concise bullet points', () => {
      const fullSummary = `
One-line summary: Successfully implemented user registration and password hashing.
## Objective
Deliver secure registration endpoint.
## Key Decisions
- Decision: Used bcrypt with work factor 12
- Decision: Stored emails lowercased
## Implementation
Full lines of code changes...
`;
      const compressed = compressHistoricalSummary(fullSummary, 'Phase 1 - Registration');
      assert.ok(compressed.compressedTokens < compressed.originalTokens);
      assert.match(compressed.content, /Phase 1 - Registration/);
      assert.match(compressed.content, /bcrypt/);
    });

    test('compresses code into symbol outlines', () => {
      const code = `
export class UserService {
  constructor(private db: Database) {}

  public async getUserById(id: string): Promise<User> {
    const user = await this.db.users.find({ id });
    if (!user) throw new NotFoundError();
    return user;
  }
}
`;
      const outline = compressCodeToOutline('src/users.ts', code);
      assert.ok(outline.compressedTokens < outline.originalTokens);
      assert.match(outline.content, /class UserService/);
      assert.match(outline.content, /getUserById/);
      assert.ok(!outline.content.includes('const user = await'));
    });
  });

  describe('5. End-to-End Context Compiler Pipeline', () => {
    test('compiles targeted brief with prompt injection defense tags and audit manifest', async () => {
      const compiler = new ContextCompiler(testTmpDir);
      const result = await compiler.compile({
        task: 'Implement JWT auth login endpoint with refresh token',
        projectDir: testTmpDir,
        phaseId: '1-auth',
        agentRole: 'gsd-executor',
      });

      assert.ok(result.budget > 0);
      assert.ok(result.estimatedTokens > 0);
      assert.ok(result.estimatedTokens <= result.budget, 'Estimated tokens must fit within budget');
      assert.ok(result.requiredArtifacts.length >= 1);

      // Verify prompt injection defense delimiters
      assert.match(result.formattedBrief, /# Task Brief/);
      assert.match(result.formattedBrief, /Operational Context Contract/);

      // Verify manifest observability
      assert.ok(result.manifest.sources.length >= 1);
      const stats = formatContextStats(result.manifest);
      assert.match(stats, /CONTEXT COMPILER OBSERVABILITY/);
      assert.match(stats, /Context Budget:/);
      assert.match(stats, /Planning context:/);
    });

    test('does not read an indexed source path that escapes the project root', async () => {
      const outsideRoot = `${testTmpDir}-outside`;
      fs.mkdirSync(outsideRoot, { recursive: true });
      const secretPath = path.join(outsideRoot, 'secret.ts');
      const secret = 'PRIVATE_SENTINEL_OUTSIDE_PROJECT';
      fs.writeFileSync(secretPath, `export function authenticate() { return '${secret}'; }`);
      const escapePath = path.relative(testTmpDir, secretPath);
      const poisonedIndex = {
        initialize: async () => {},
        searchSymbols: () => [{
          name: 'authenticate', kind: 'function', filePath: escapePath,
          startLine: 1, endLine: 1, signature: 'function authenticate()',
        }],
        findCallers: () => [],
      };

      try {
        const compiler = new ContextCompiler(testTmpDir, undefined, poisonedIndex);
        const result = await compiler.compile({ task: 'authenticate', projectDir: testTmpDir });
        assert.ok(!result.formattedBrief.includes(secret));
        assert.strictEqual(result.codeContext.length, 0);
      } finally {
        cleanup(outsideRoot);
      }
    });

    test('refreshes the code index before symbol retrieval', async () => {
      const calls = [];
      const index = {
        updateIndex: async () => { calls.push('update'); },
        searchSymbols: () => [],
        findCallers: () => [],
      };
      const compiler = new ContextCompiler(testTmpDir, undefined, index);
      await compiler.compile({ task: 'refresh index', projectDir: testTmpDir });
      assert.deepStrictEqual(calls, ['update']);
    });

    test('reports the exact rendered brief token estimate and measured stage durations', async () => {
      const compiler = new ContextCompiler(testTmpDir);
      const result = await compiler.compile({ task: 'short task', projectDir: testTmpDir, requestedBudget: 120 });
      const { estimateTokenCount } = require('../sdk/dist/memory/rerank.js');
      assert.strictEqual(result.estimatedTokens, estimateTokenCount(result.formattedBrief));
      assert.ok(result.estimatedTokens <= result.budget || result.record.compilerDecisions.some((d) => d.includes('Required context')));
      assert.ok(result.record.stages.every((stage) => stage.durationMs >= 0));
      assert.notDeepStrictEqual(result.record.stages.map((stage) => stage.durationMs), [8, 14, 12, 9, 6]);
    });
  });
});
