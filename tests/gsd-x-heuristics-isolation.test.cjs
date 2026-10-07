/**
 * GSD-X Persistent Engineering Intelligence & Privacy Isolation Test Suite
 *
 * Validates:
 * 1. HeuristicSanitizer scrubbing (secrets, paths, URLs, DB entities, project names)
 * 2. Cross-project boundary isolation (anonymous salted project hash, zero leakage)
 * 3. Multi-project corroboration & evidence accumulation
 * 4. Bayesian confidence scoring & feedback loop
 * 5. End-to-end ContextCompiler retrieval & prompt packaging
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let sdk;
try {
  sdk = require('../sdk/dist/index.js');
} catch (e) {
  console.error('Failed to load SDK. Did you run npm run build:sdk?');
  process.exit(1);
}

const {
  HeuristicSanitizer,
  HeuristicConfidenceModel,
  GlobalHeuristicsStore,
  HeuristicsGeneralizer,
  HeuristicsRetriever,
  HeuristicFeedbackRecorder,
  ContextCompiler,
} = sdk;

const TEST_DIR = path.resolve(__dirname, 'fixtures-heuristics-test');
const STORE_DIR = path.join(TEST_DIR, 'global-store');
const PROJ_A_DIR = path.join(TEST_DIR, 'project-alpha');
const PROJ_B_DIR = path.join(TEST_DIR, 'project-beta');

function setupTestDirs() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.mkdirSync(path.join(PROJ_A_DIR, '.planning'), { recursive: true });
  fs.mkdirSync(path.join(PROJ_B_DIR, '.planning'), { recursive: true });

  fs.writeFileSync(
    path.join(PROJ_A_DIR, '.planning', 'PROJECT.md'),
    '# Project Alpha\nSecret FinTech Trading engine in Rust.\n'
  );
  fs.writeFileSync(
    path.join(PROJ_B_DIR, '.planning', 'PROJECT.md'),
    '# Project Beta\nE-commerce order pipeline in Go.\n'
  );
}

function cleanupTestDirs() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('--- Running GSD-X Engineering Heuristics & Privacy Isolation Tests ---\n');
  setupTestDirs();

  try {
    // Test 1: Sanitizer Scrubber
    console.log('[Test 1] Privacy Guard & Sensitive Entity Sanitization');
    const sensitiveInput =
      'In Project Alpha, connect to https://internal-api.corp.net:8443 with api_key="sk_live_983748291048291048" ' +
      'and query from customers.credit_cards on C:\\Users\\Administrator\\Desktop\\alpha\\src\\worker.rs';

    const sanResult = HeuristicSanitizer.sanitize(sensitiveInput, ['Project Alpha', 'alpha']);
    assert.strictEqual(sanResult.isSafeForCrossProject, true);
    assert.ok(sanResult.redactedItemCount >= 4, 'Must redact at least 4 sensitive items');
    assert.ok(!sanResult.sanitizedText.includes('sk_live_983748291048291048'), 'Secret key must be scrubbed');
    assert.ok(!sanResult.sanitizedText.includes('internal-api.corp.net'), 'URL must be scrubbed');
    assert.ok(!sanResult.sanitizedText.includes('C:\\Users'), 'Windows path must be scrubbed');
    assert.ok(!sanResult.sanitizedText.includes('Project Alpha'), 'Project name must be scrubbed');
    assert.ok(sanResult.sanitizedText.includes('[REDACTED_SECRET]'), 'Must replace with secret placeholder');
    console.log('✓ Sanitizer thoroughly scrubs secrets, endpoints, filesystem paths, and project names.');

    // Test 2: Hard Rejection for Private Key Material
    console.log('\n[Test 2] Hard Rejection for Cryptographic Keys');
    const privateKeyInput = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----';
    const privResult = HeuristicSanitizer.sanitize(privateKeyInput);
    assert.strictEqual(privResult.isSafeForCrossProject, false, 'Must reject raw private key');
    assert.ok(privResult.rejectionReason.includes('private key'), 'Must state reason for rejection');
    console.log('✓ Hard rejection guard blocks cryptographic key material.');

    // Test 3: Markdown Extraction & Generalization
    console.log('\n[Test 3] Markdown Heuristic Generalization');
    const summaryDoc = `
# Phase 02 Learnings & Decisions
- Architecture Decision: Always buffer streaming websocket connections at ingest to prevent slow consumer disconnects.
- Gotcha: SQLite autocommit causes disk thrashing during bulk write loops.
- Performance: In Go, reuse time.NewTimer instead of time.After in tight loops.
`;
    const candidates = HeuristicsGeneralizer.extractFromText(summaryDoc, 'generic', ['Project Alpha']);
    assert.strictEqual(candidates.length, 3, 'Must extract 3 candidates');
    assert.strictEqual(candidates[0].category, 'architecture');
    assert.strictEqual(candidates[1].category, 'reliability');
    assert.strictEqual(candidates[2].category, 'performance');
    console.log('✓ Generalizer categorizes and extracts clean rules from phase summaries.');

    // Test 4: Multi-Project Evidence Accumulation & Boundary Isolation
    console.log('\n[Test 4] Multi-Project Corroboration & Isolation');
    const store = new GlobalHeuristicsStore(STORE_DIR);

    // Project A adds a heuristic
    const candA = {
      title: 'Batch Bulk Writes in SQLite Explicit Transactions',
      category: 'performance',
      language: 'generic',
      framework: 'sqlite',
      triggerCondition: 'Performing multiple insert or update operations on SQLite database',
      recommendation: 'Wrap write loops in explicit BEGIN TRANSACTION and COMMIT blocks with batch sizes between 500-2000 items.',
      rationale: 'Reduces disk sync fsync syscalls from N to N/batch_size.',
    };

    const resA = await store.addOrCorroborate(candA, PROJ_A_DIR, ['Project Alpha']);
    assert.strictEqual(resA.added, true, 'First observation should be added');
    assert.ok(resA.heuristic, 'Heuristic must be returned');
    assert.strictEqual(resA.heuristic.evidenceCount, 1);
    assert.strictEqual(resA.heuristic.sourceProjectsCount, 1);
    const initialConf = resA.heuristic.confidence;

    // Project B corroborates same heuristic
    const resB = await store.addOrCorroborate(candA, PROJ_B_DIR, ['Project Beta']);
    assert.strictEqual(resB.corroborated, true, 'Second project should corroborate');
    assert.strictEqual(resB.heuristic.evidenceCount, 2);
    assert.strictEqual(resB.heuristic.sourceProjectsCount, 2);
    assert.ok(resB.heuristic.confidence > initialConf, 'Confidence must increase with multi-project corroboration');

    // Verify privacy isolation: Project A and B dirs are not leaked
    const allStored = await store.getAll();
    const storedStr = JSON.stringify(allStored);
    assert.ok(!storedStr.includes(PROJ_A_DIR), 'Raw Project A path must NEVER appear in store');
    assert.ok(!storedStr.includes(PROJ_B_DIR), 'Raw Project B path must NEVER appear in store');
    assert.ok(!storedStr.includes('Project Alpha'), 'Project Alpha identifier must NEVER appear in store');
    console.log('✓ Multi-project corroboration increases confidence while preserving 100% privacy isolation.');

    // Test 5: Confidence Feedback Loop
    console.log('\n[Test 5] Bayesian Feedback Calibration');
    const feedbackRecorder = new HeuristicFeedbackRecorder(store);
    const hId = resB.heuristic.id;

    // Record success
    const fb1 = await feedbackRecorder.recordOutcome(hId, true);
    assert.strictEqual(fb1.updated, true);
    const afterSuccessConf = fb1.newConfidence;

    // Record failure
    const fb2 = await feedbackRecorder.recordOutcome(hId, false);
    assert.strictEqual(fb2.updated, true);
    assert.ok(fb2.newConfidence < afterSuccessConf, 'Failure must lower confidence score');
    console.log('✓ Feedback loop dynamically adjusts empirical confidence scores.');

    // Test 6: Targeted Retrieval & Token Budgeting
    console.log('\n[Test 6] Targeted Retrieval & Token Budgeting');
    const retriever = new HeuristicsRetriever(store);
    const queryResults = await retriever.retrieve({
      task: 'Optimize slow sqlite batch insert throughput',
      maxTokens: 300,
      limit: 2,
    });

    assert.ok(queryResults.length >= 1, 'Should retrieve SQLite heuristic');
    assert.ok(queryResults.some((r) => r.heuristic.id === hId || r.heuristic.id === 'heur-sqlite-batch-transaction'));
    assert.ok(queryResults[0].relevanceScore > 0.2);

    const promptBlock = retriever.formatForPrompt(queryResults);
    assert.ok(promptBlock.includes('<cross-project-engineering-heuristics>'));
    assert.ok(promptBlock.includes('Batch Bulk Writes in SQLite Explicit Transactions'));
    assert.ok(promptBlock.includes('Wrap write loops in explicit BEGIN TRANSACTION'));
    console.log('✓ Retriever scores relevance and formats safe, non-executable prompt context.');

    // Test 7: End-to-End ContextCompiler Integration
    console.log('\n[Test 7] End-to-End ContextCompiler Integration');
    const compiler = new ContextCompiler(PROJ_B_DIR);
    const compilation = await compiler.compile({
      task: 'Optimize slow sqlite batch insert throughput',
      projectDir: PROJ_B_DIR,
    });

    assert.ok(compilation.record, 'Must attach compilation record');
    assert.ok(compilation.formattedBrief.includes('Verified Engineering Heuristics'));
    assert.ok(compilation.record.sourceBreakdown.heuristicTokens >= 0);
    console.log('✓ ContextCompiler seamlessly integrates cross-project engineering heuristics.');

    // Test 8: Dedicated CLI Commands Integration
    console.log('\n[Test 8] Dedicated CLI Commands (stats, list, query, add, extract, feedback)');
    const { execSync } = require('child_process');
    const rootDir = path.resolve(__dirname, '..');
    const toolsBin = path.join(rootDir, 'gsd-core', 'bin', 'gsd-tools.cjs');

    // 8a. stats
    const statsOut = execSync(`node "${toolsBin}" gsd-heuristics-stats`, { cwd: PROJ_A_DIR, encoding: 'utf-8' });
    assert.ok(statsOut.includes('GSD-X Global Engineering Heuristics Stats'));
    assert.ok(statsOut.includes('Total Heuristics:'));

    // 8b. list
    const listOut = execSync(`node "${toolsBin}" gsd-heuristics-list`, { cwd: PROJ_A_DIR, encoding: 'utf-8' });
    assert.ok(listOut.includes('[heur-'));

    // 8c. query
    const queryOut = execSync(`node "${toolsBin}" gsd-heuristics-query --task "sqlite transaction batch"`, { cwd: PROJ_A_DIR, encoding: 'utf-8' });
    assert.ok(queryOut.includes('SQLite') || queryOut.includes('sqlite') || queryOut.includes('pts'));

    // 8d. extract from markdown
    const sampleSummary = path.join(TEST_DIR, 'SAMPLE-SUMMARY.md');
    fs.writeFileSync(
      sampleSummary,
      '# Sample Phase Summary\n\n## Decisions & Learnings\n- Architecture Decision: Decouple business logic into pure functions without network side-effects.\n'
    );
    const extractOut = execSync(`node "${toolsBin}" gsd-heuristics-extract --file "${sampleSummary}"`, { cwd: PROJ_A_DIR, encoding: 'utf-8' });
    assert.ok(extractOut.includes('Extracted Engineering Heuristics'));

    // 8e. feedback
    const feedbackOut = execSync(`node "${toolsBin}" gsd-heuristics-feedback --id heur-rust-tokio-mutex --success`, { cwd: PROJ_A_DIR, encoding: 'utf-8' });
    assert.ok(feedbackOut.includes('Recorded success for heur-rust-tokio-mutex'));

    console.log('✓ Dedicated CLI commands execute cleanly across stats, list, query, extract, and feedback.');

    console.log('\nALL ENGINEERING HEURISTICS TESTS PASSED!');
  } finally {
    cleanupTestDirs();
  }
}

runTests().catch((err) => {
  console.error('\nFAILED with error:', err);
  process.exit(1);
});
