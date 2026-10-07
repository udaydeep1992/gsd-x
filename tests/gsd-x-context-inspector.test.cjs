/**
 * GSD-X Context Inspector Integration Test Suite
 *
 * Validates:
 * 1. CompilationTelemetryRecorder lifecycle (latest.json, history.jsonl, rotation, retrieval)
 * 2. Visual Context Inspector HTML generation (KPIs, pipeline stages, why-selected, diff, XSS safety)
 * 3. ContextInspectorServer HTTP endpoints (/, /api/latest, /api/history, /api/compilation/:id, /health)
 * 4. ContextCompiler and ContextQueryHandler end-to-end integration
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

let sdk;
try {
  sdk = require('../sdk/dist/index.js');
} catch (e) {
  console.error('Failed to load SDK. Did you run npm run build:sdk?');
  process.exit(1);
}

const {
  CompilationTelemetryRecorder,
  generateInspectorHtml,
  ContextInspectorServer,
  ContextCompiler,
  ContextQueryHandler,
} = sdk;

const TEST_DIR = path.resolve(__dirname, 'fixtures-inspector-test');

function setupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, '.planning'), { recursive: true });
  fs.writeFileSync(
    path.join(TEST_DIR, '.planning', 'PROJECT.md'),
    '# Test Project\n\nBuilding high-performance system in Rust.\n'
  );
  fs.writeFileSync(
    path.join(TEST_DIR, '.planning', 'STATE.md'),
    '# State\nCurrent Phase: 01-core\nStatus: active\n'
  );
}

function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function makeMockRecord(id = 'test-rec-1', task = 'Implement authentication middleware') {
  return {
    requestId: id,
    id: id,
    timestamp: new Date().toISOString(),
    task,
    model: 'gsd-executor',
    contextBudget: 8000,
    originalTokens: 1000,
    finalTokens: 320,
    tokensSaved: 680,
    reductionPercent: 68.0,
    retrievalLatencyMs: 25,
    compilationLatencyMs: 17,
    totalLatencyMs: 42,
    stages: [
      {
        stageName: 'raw_candidates',
        displayName: 'Raw Candidate Context',
        inputTokens: 1000,
        outputTokens: 1000,
        removedTokens: 0,
        reductionPercent: 0,
        durationMs: 5,
      },
      {
        stageName: 'ast_filtering',
        displayName: 'AST Symbol Filtering',
        inputTokens: 1000,
        outputTokens: 600,
        removedTokens: 400,
        reductionPercent: 40.0,
        durationMs: 15,
      },
      {
        stageName: 'semantic_ranking',
        displayName: 'Task-Aware Selection',
        inputTokens: 600,
        outputTokens: 450,
        removedTokens: 150,
        reductionPercent: 25.0,
        durationMs: 10,
      },
      {
        stageName: 'memory_selection',
        displayName: 'Semantic Memory Substitution',
        inputTokens: 450,
        outputTokens: 350,
        removedTokens: 100,
        reductionPercent: 22.2,
        durationMs: 8,
      },
      {
        stageName: 'context_compilation',
        displayName: 'Final Brief Compilation',
        inputTokens: 350,
        outputTokens: 320,
        removedTokens: 30,
        reductionPercent: 8.6,
        durationMs: 4,
      },
    ],
    selectedArtifacts: [
      {
        sourceType: 'code',
        sourceId: 'src/auth/jwt.rs',
        filePath: 'src/auth/jwt.rs',
        symbolName: 'authenticate_token',
        relevanceScore: 0.95,
        reasons: ['Direct AST function match for authentication task', 'calls: verify_jwt, find_user'],
        originalTokens: 250,
        selectedTokens: 110,
        tokensSaved: 140,
        originalSnippet: '// full jwt.rs file with 500 lines',
        selectedSnippet: 'pub fn authenticate_token(token: &str) -> Result<User, AuthError> { ... }',
      },
      {
        sourceType: 'memory',
        sourceId: 'mem-rule-auth',
        filePath: '.planning/decisions/auth.md',
        symbolName: 'Authentication Architecture Decision',
        relevanceScore: 0.88,
        reasons: ['Active project ADR on token authentication format'],
        originalTokens: 180,
        selectedTokens: 80,
        tokensSaved: 100,
        selectedSnippet: 'ADR-004: Standardized on JWT with RS256 signatures.',
      },
    ],
    rejectedArtifacts: [
      {
        sourceType: 'code',
        sourcePath: 'src/legacy/cookie.rs',
        symbolName: 'legacy_cookie_parser',
        rejectionReason: 'Below relevance cutoff (0.22 < 0.40)',
        estimatedTokens: 150,
        score: 0.22,
      },
      {
        sourceType: 'planning',
        sourcePath: '.planning/phases/00-spec.md',
        rejectionReason: 'Duplicate content hash already included',
        estimatedTokens: 180,
        score: 0.50,
      },
    ],
    sourceBreakdown: {
      codeTokens: 180,
      codePercentage: 56.25,
      memoryTokens: 80,
      memoryPercentage: 25.0,
      astTokens: 60,
      astPercentage: 18.75,
      planningTokens: 0,
      planningPercentage: 0,
      heuristicTokens: 0,
      heuristicPercentage: 0,
    },
    compilerDecisions: [
      'AST structural lookup prioritized over raw file dumps.',
      'Token budget cap at 8,000; utilized 320 tokens.',
    ],
  };
}

async function fetchHttp(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- Running GSD-X Visual Context Inspector Tests ---\n');
  setupTestDir();

  try {
    // Test 1: Telemetry Recorder
    console.log('[Test 1] CompilationTelemetryRecorder lifecycle');
    const recorder = new CompilationTelemetryRecorder(TEST_DIR);
    const rec1 = makeMockRecord('rec-001', 'Task 1: Tree-sitter parse');
    await recorder.record(rec1);

    const latest = await recorder.getLatest();
    assert.ok(latest, 'Latest record must not be null');
    assert.strictEqual(latest.requestId, 'rec-001');
    assert.strictEqual(latest.task, 'Task 1: Tree-sitter parse');
    assert.strictEqual(latest.reductionPercent, 68.0);

    const history1 = await recorder.getHistory();
    assert.strictEqual(history1.length, 1);
    assert.strictEqual(history1[0].requestId, 'rec-001');

    const byId = await recorder.getById('rec-001');
    assert.ok(byId, 'getById should find rec-001');
    assert.strictEqual(byId.requestId, 'rec-001');

    // Test history append and rotation
    const rec2 = makeMockRecord('rec-002', 'Task 2: Heuristic retrieval');
    await recorder.record(rec2);
    const latest2 = await recorder.getLatest();
    assert.strictEqual(latest2.requestId, 'rec-002');

    const history2 = await recorder.getHistory();
    assert.strictEqual(history2.length, 2);
    assert.strictEqual(history2[0].requestId, 'rec-002', 'History should be sorted newest first');
    fs.appendFileSync(path.join(TEST_DIR, '.gsd', 'inspector', 'history.jsonl'), '{truncated record\n');
    await recorder.record(makeMockRecord('rec-003', 'Task 3: Corrupted history recovery'));
    const recoveredHistory = await recorder.getHistory();
    assert.deepStrictEqual(recoveredHistory.map((record) => record.requestId), ['rec-003', 'rec-002', 'rec-001']);
    console.log('✓ Telemetry recorder properly saves, rotates, and indexes records.');

    // Test 2: HTML Generator
    console.log('\n[Test 2] Visual Context Inspector HTML Generator');
    const html = generateInspectorHtml(rec1);
    assert.ok(html.includes('<!DOCTYPE html>'), 'HTML must have DOCTYPE');
    assert.ok(html.includes('Visual Context Inspector'), 'HTML must have title');
    assert.ok(html.includes('1,000'), 'Must format raw input tokens');
    assert.ok(html.includes('320'), 'Must format final tokens');
    assert.ok(html.includes('68.0%'), 'Must display savings percentage');
    assert.ok(html.includes('authenticate_token'), 'Must list retrieved artifact name');
    assert.ok(html.includes('Direct AST function match for authentication task'), 'Must show Why Selected reason');
    assert.ok(html.includes('legacy_cookie_parser'), 'Must list rejected artifact');
    assert.ok(html.includes('Below relevance cutoff'), 'Must list rejection reason');
    assert.ok(html.includes('calls: verify_jwt'), 'Must show structural AST context');

    // Test XSS safety
    const xssRecord = makeMockRecord('rec-xss', '<script>alert("xss")</script>');
    const xssHtml = generateInspectorHtml(xssRecord);
    assert.ok(!xssHtml.includes('<script>alert("xss")</script>'), 'Dangerous script tag must be sanitized');
    assert.ok(xssHtml.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), 'XSS characters must be escaped');
    console.log('✓ HTML Generator renders full UI with luxury dark palette, metrics, diff, and XSS escaping.');

    // Test 3: HTTP Server
    console.log('\n[Test 3] ContextInspectorServer HTTP Endpoints');
    const server = new ContextInspectorServer(TEST_DIR);
    const testPort = 9876;
    const { port, url, close } = await server.start(testPort);
    assert.strictEqual(port, testPort);
    assert.ok(url.includes(`:${testPort}`));

    // Test root /
    const rootRes = await fetchHttp(`${url}/`);
    assert.strictEqual(rootRes.statusCode, 200);
    assert.ok(rootRes.headers['content-type'].includes('text/html'));
    assert.ok(rootRes.body.includes('Visual Context Inspector'));

    // Test /health
    const healthRes = await fetchHttp(`${url}/health`);
    assert.strictEqual(healthRes.statusCode, 200);
    assert.strictEqual(healthRes.headers['access-control-allow-origin'], undefined, 'Inspector must not grant cross-origin reads');
    const healthJson = JSON.parse(healthRes.body);
    assert.strictEqual(healthJson.status, 'ok');
    assert.strictEqual(healthJson.service, 'gsd-x-context-inspector');

    const hostileHostRes = await fetchHttp(`${url}/health`, { host: 'attacker.example:9876' });
    assert.strictEqual(hostileHostRes.statusCode, 403, 'Inspector must reject a non-loopback Host header');

    // Test /api/latest
    const latestRes = await fetchHttp(`${url}/api/latest`);
    assert.strictEqual(latestRes.statusCode, 200);
    const latestJson = JSON.parse(latestRes.body);
    assert.strictEqual(latestJson.requestId, 'rec-003');

    // Test /api/history
    const histRes = await fetchHttp(`${url}/api/history`);
    assert.strictEqual(histRes.statusCode, 200);
    const histJson = JSON.parse(histRes.body);
    const historyCount = Array.isArray(histJson) ? histJson.length : (histJson.compilations ? histJson.compilations.length : histJson.total);
    assert.strictEqual(historyCount, 3);

    // Test /api/compilation/rec-001
    const byIdRes = await fetchHttp(`${url}/api/compilation/rec-001`);
    assert.strictEqual(byIdRes.statusCode, 200);
    const byIdJson = JSON.parse(byIdRes.body);
    assert.strictEqual(byIdJson.requestId, 'rec-001');

    // Test 404
    const notFoundRes = await fetchHttp(`${url}/nonexistent`);
    assert.strictEqual(notFoundRes.statusCode, 404);

    await close();
    console.log('✓ ContextInspectorServer handles all REST endpoints and shuts down gracefully.');

    // Test 4: End-to-end ContextCompiler Telemetry Attachment
    console.log('\n[Test 4] ContextCompiler & ContextQueryHandler integration');
    const compiler = new ContextCompiler(TEST_DIR);
    const result = await compiler.compile({
      task: 'Build AST query interface',
      projectDir: TEST_DIR,
    });

    assert.ok(result.record, 'ContextCompiler must attach compilation record');
    assert.ok(result.record.requestId.startsWith('req-'), 'Record ID must follow convention');
    assert.ok(result.record.stages.length >= 4, 'Must record compiler stages');
    assert.ok(result.record.totalLatencyMs >= 0, 'Must record total latency');

    const handler = new ContextQueryHandler(TEST_DIR);
    const inspectResult = await handler.inspect('Build AST query interface');
    assert.ok(inspectResult.record, 'handler.inspect must return record');
    assert.ok(inspectResult.html.includes('Visual Context Inspector'), 'handler.inspect must return rendered HTML');
    console.log('✓ End-to-end ContextCompiler creates records and handler.inspect exposes visual inspector.');

    console.log('\nALL CONTEXT INSPECTOR TESTS PASSED!');
  } finally {
    cleanupTestDir();
  }
}

runTests().catch((err) => {
  console.error('\nFAILED with error:', err);
  process.exit(1);
});
