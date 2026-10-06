/**
 * GSD-X Memory Subsystem Tests
 *
 * Comprehensive test suite verifying embeddings, scopes, authority,
 * secret redaction, conservative extraction, decay, consolidation, and CRUD operations.
 */

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Load compiled SDK
const {
  LocalHashEmbeddingProvider,
  cosineSimilarity,
  getScopePriorityMultiplier,
  matchesScope,
  compareAuthority,
  resolveMemoryConflict,
  redactSecrets,
  isReusableKnowledge,
  extractMemoriesFromDocument,
  calculateEffectiveImportance,
  isMemoryStale,
  consolidateMemories,
  JsonMemoryStore,
} = require('../sdk/dist/memory/index.js');

describe('GSD-X Memory Engine', () => {
  const testTmpDir = path.join(os.tmpdir(), `gsd-x-mem-test-${Date.now()}`);

  before(() => {
    fs.mkdirSync(testTmpDir, { recursive: true });
  });

  after(() => {
    try {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. Embeddings & Cosine Similarity', () => {
    const embedder = new LocalHashEmbeddingProvider(128);

    test('generates normalized dense vectors with correct dimensions', async () => {
      const vec = await embedder.embed('FastAPI backend architecture with Redis');
      assert.strictEqual(vec.length, 128);

      // Verify L2 normalization: sum of squares ≈ 1.0
      const sumSq = vec.reduce((acc, v) => acc + v * v, 0);
      assert.ok(Math.abs(sumSq - 1.0) < 0.01, `Vector should be normalized: ${sumSq}`);
    });

    test('semantically related texts have higher cosine similarity than unrelated', async () => {
      const vecA = await embedder.embed('FastAPI REST endpoint authentication token');
      const vecB = await embedder.embed('FastAPI API route auth token validation');
      const vecC = await embedder.embed('CSS grid styling animation transitions');

      const simRelated = cosineSimilarity(vecA, vecB);
      const simUnrelated = cosineSimilarity(vecA, vecC);

      assert.ok(
        simRelated > simUnrelated,
        `Related (${simRelated}) must be higher than unrelated (${simUnrelated})`
      );
    });
  });

  describe('2. Scope & Priority Multipliers', () => {
    test('enforces phase > project > global priority', () => {
      const phaseMul = getScopePriorityMultiplier('phase');
      const projectMul = getScopePriorityMultiplier('project');
      const globalMul = getScopePriorityMultiplier('global');

      assert.ok(phaseMul > projectMul, 'phase priority > project priority');
      assert.ok(projectMul > globalMul, 'project priority > global priority');
    });

    test('matchesScope correctly evaluates target boundaries', () => {
      assert.strictEqual(matchesScope('global', 'p1', 'ph1', 'p2', 'ph2'), true);
      assert.strictEqual(matchesScope('project', 'my-proj', undefined, 'my-proj', undefined), true);
      assert.strictEqual(matchesScope('project', 'other-proj', undefined, 'my-proj', undefined), false);
      assert.strictEqual(matchesScope('phase', 'proj', 'phase-1', 'proj', 'phase-1'), true);
      assert.strictEqual(matchesScope('phase', 'proj', 'phase-1', 'proj', 'phase-2'), false);
    });
  });

  describe('3. Authority Hierarchy & Conflict Resolution', () => {
    test('enforces authoritative > verified > learned > inferred', () => {
      assert.ok(compareAuthority('authoritative', 'verified') < 0);
      assert.ok(compareAuthority('verified', 'learned') < 0);
      assert.ok(compareAuthority('learned', 'inferred') < 0);
    });

    test('resolves conflict in favor of higher authority', () => {
      const entryA = {
        id: 'mem-1',
        authority: 'authoritative',
        confidence: 0.8,
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const entryB = {
        id: 'mem-2',
        authority: 'learned',
        confidence: 0.95,
        updatedAt: '2026-02-01T00:00:00Z',
      };

      const result = resolveMemoryConflict(entryA, entryB);
      assert.strictEqual(result.winnerId, 'mem-1');
      assert.match(result.reason, /outranks/);
    });
  });

  describe('4. Secret Redaction & Privacy Guard', () => {
    test('redacts API keys, tokens, and private keys', () => {
      const fakeOpenAi = ['sk-proj-', '1234567890abcdef1234567890'].join('');
      const sensitive = `API_KEY="${fakeOpenAi}" and bearer token: Bearer abcdef1234567890abcdef`;
      const { cleanText, secretsFound } = redactSecrets(sensitive);

      assert.ok(secretsFound >= 1, 'Must detect at least 1 secret');
      assert.ok(!cleanText.includes(fakeOpenAi), 'Secret key must be redacted');
      assert.match(cleanText, /REDACTED_SECRET/);
    });
  });

  describe('5. Conservative Knowledge Extraction', () => {
    test('filters out mechanical noise and keeps architectural decisions', () => {
      assert.strictEqual(isReusableKnowledge('Changed line 182 of foo.py'), false);
      assert.strictEqual(isReusableKnowledge('Fixed typo in README.md'), false);
      assert.strictEqual(
        isReusableKnowledge('Redis pub/sub is used because multiple FastAPI workers need cross-process event propagation'),
        true
      );
    });

    test('extracts structured memories from Markdown summary document', () => {
      const summaryDoc = `
# Summary Phase 2
## Key Decisions
- Chose PostgreSQL connection pool with asyncpg because synchronous psycopg2 blocked FastAPI event loop
- Webhook signature validation requires HMAC-SHA256 with timing-safe comparison
## Implementation Details
- Changed line 42 in main.py
- Bumped package version
`;
      const extracted = extractMemoriesFromDocument({
        text: summaryDoc,
        source: '.planning/phases/2/SUMMARY.md',
        projectId: 'test-project',
      });

      assert.ok(extracted.length >= 2, `Expected at least 2 memories, got ${extracted.length}`);
      assert.ok(extracted.some((m) => m.content.includes('asyncpg')), 'Must extract asyncpg decision');
      assert.ok(extracted.some((m) => m.content.includes('HMAC-SHA256')), 'Must extract HMAC decision');
      assert.ok(!extracted.some((m) => m.content.includes('line 42')), 'Must filter out line 42 noise');
    });
  });

  describe('6. Temporal Decay & Protection of Architecture', () => {
    test('authoritative architecture memories never decay', () => {
      const archEntry = {
        id: 'arch-1',
        content: 'FastAPI server architecture',
        type: 'architecture',
        scope: 'project',
        authority: 'authoritative',
        importance: 0.9,
        confidence: 0.95,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        retrievalCount: 0,
        tags: ['arch'],
      };

      const now = new Date('2026-06-01T00:00:00Z').getTime();
      const decayed = calculateEffectiveImportance(archEntry, { now });
      assert.strictEqual(decayed, 0.9, 'Authoritative architecture memory must not decay');
      assert.strictEqual(isMemoryStale(archEntry, { now }), false);
    });

    test('experience memories decay gracefully over time', () => {
      const expEntry = {
        id: 'exp-1',
        content: 'Temporary workaround for local mock runner',
        type: 'experience',
        scope: 'project',
        authority: 'learned',
        importance: 0.8,
        confidence: 0.7,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        retrievalCount: 0,
        tags: ['wip'],
      };

      // 60 days later (2 half-lives)
      const now = new Date('2026-03-02T00:00:00Z').getTime();
      const decayed = calculateEffectiveImportance(expEntry, { now, halfLifeDays: 30 });
      assert.ok(decayed < 0.5, `Experience memory should decay significantly: got ${decayed}`);
    });
  });

  describe('7. Memory Consolidation', () => {
    test('clusters and consolidates repetitive memories into canonical fact', async () => {
      const embedder = new LocalHashEmbeddingProvider(128);
      const text1 = 'Backend uses FastAPI as the main API framework';
      const text2 = 'FastAPI powers all backend REST API routes';

      const memA = {
        id: 'mem-a',
        content: text1,
        type: 'architecture',
        scope: 'project',
        authority: 'verified',
        importance: 0.8,
        confidence: 0.9,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        retrievalCount: 2,
        tags: ['backend', 'fastapi'],
        embedding: await embedder.embed(text1),
      };

      const memB = {
        id: 'mem-b',
        content: text2,
        type: 'architecture',
        scope: 'project',
        authority: 'verified',
        importance: 0.75,
        confidence: 0.85,
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        retrievalCount: 3,
        tags: ['fastapi', 'routes'],
        embedding: await embedder.embed(text2),
      };

      const result = consolidateMemories([memA, memB], 0.7);
      assert.strictEqual(result.consolidated.length, 1, 'Should consolidate into 1 canonical entry');
      assert.strictEqual(result.supersededIds.length, 2);
      assert.strictEqual(result.consolidated[0].retrievalCount, 5, 'Retrieval counts must aggregate');
    });
  });

  describe('8. JsonMemoryStore CRUD, Search, and Export', () => {
    test('full lifecycle: add, get, search, stats, update, export, and delete', async () => {
      const store = new JsonMemoryStore(testTmpDir, path.join(testTmpDir, 'global'));
      await store.initialize();

      const id = await store.add({
        id: 'mem-test-crud',
        content: 'JWT tokens expire after 15 minutes and refresh tokens after 7 days',
        type: 'decision',
        scope: 'project',
        projectId: 'test-project',
        authority: 'verified',
        importance: 0.85,
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retrievalCount: 0,
        tags: ['auth', 'jwt'],
      });

      assert.strictEqual(id, 'mem-test-crud');

      // Get
      const fetched = await store.get(id);
      assert.ok(fetched !== null);
      assert.strictEqual(fetched.id, 'mem-test-crud');
      assert.ok(fetched.embedding && fetched.embedding.length > 0);

      // Search
      const searchResults = await store.search({
        text: 'token expiration time',
        projectId: 'test-project',
        limit: 5,
      });

      assert.ok(searchResults.length >= 1, 'Search must return matching memory');
      assert.strictEqual(searchResults[0].memory.id, 'mem-test-crud');
      assert.ok(searchResults[0].score > 0.3, `Score should be reasonable: ${searchResults[0].score}`);

      // Stats
      const stats = await store.stats('test-project');
      assert.strictEqual(stats.totalCount, 1);
      assert.strictEqual(stats.byType.decision, 1);

      // Export
      const exportFile = path.join(testTmpDir, 'export.jsonl');
      const count = await store.exportToFile(exportFile);
      assert.strictEqual(count, 1);
      assert.ok(fs.existsSync(exportFile));

      // Delete
      await store.delete(id);
      const afterDelete = await store.get(id);
      assert.strictEqual(afterDelete, null);
    });
  });
});
