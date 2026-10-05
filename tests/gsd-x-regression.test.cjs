/**
 * GSD-X Regression & Backwards Compatibility Tests
 *
 * Verifies that with GSD-X toggles off or in legacy mode,
 * upstream GSD behavior and artifacts remain 100% intact.
 */

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  ContextCompiler,
  SourceArtifactLoader,
} = require('../sdk/dist/context/index.js');
const {
  ModelRouter,
} = require('../sdk/dist/routing/index.js');

describe('GSD-X Regression & Backwards Compatibility', () => {
  const testDir = path.join(os.tmpdir(), `gsd-x-regression-${Date.now()}`);
  const planningDir = path.join(testDir, '.planning');
  const phaseDir = path.join(planningDir, 'phases', '01-auth');

  const sampleProjectMd = '# Project Titan\nLegacy architecture and roadmap.\n';
  const sampleRoadmapMd = '# Roadmap\n- [ ] Phase 1: Auth\n- [ ] Phase 2: Billing\n';
  const sampleStateMd = '# State\nCurrent Phase: 01-auth\nStatus: Planning\n';
  const samplePlanMd = '# Plan 01-auth\nTasks:\n1. Create auth router\n2. Add JWT\n';

  before(() => {
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), sampleProjectMd);
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), sampleRoadmapMd);
    fs.writeFileSync(path.join(planningDir, 'STATE.md'), sampleStateMd);
    fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), samplePlanMd);
  });

  after(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  test('does not alter or corrupt original .planning files on disk', () => {
    const loader = new SourceArtifactLoader(testDir);
    const artifacts = loader.loadProjectArtifacts();

    assert.ok(artifacts.length >= 3);

    // Verify files on disk match original content byte-for-byte
    assert.strictEqual(
      fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf-8'),
      sampleProjectMd
    );
    assert.strictEqual(
      fs.readFileSync(path.join(planningDir, 'ROADMAP.md'), 'utf-8'),
      sampleRoadmapMd
    );
    assert.strictEqual(
      fs.readFileSync(path.join(planningDir, 'STATE.md'), 'utf-8'),
      sampleStateMd
    );
    assert.strictEqual(
      fs.readFileSync(path.join(phaseDir, '01-01-PLAN.md'), 'utf-8'),
      samplePlanMd
    );
  });

  test('compiles clean standard context when memory and code index are disabled', async () => {
    const compiler = new ContextCompiler(testDir);

    const compiled = await compiler.compile({
      task: 'Review auth roadmap and plan',
      projectDir: testDir,
      phaseId: '01-auth',
      includeMemory: false,
      includeCodeIndex: false,
    });

    // No memories or code should be injected
    assert.strictEqual(compiled.memories.length, 0);
    assert.strictEqual(compiled.codeContext.length, 0);

    // Standard artifacts should still be loaded
    assert.ok(compiled.requiredArtifacts.length >= 1);
    assert.ok(compiled.formattedBrief.includes('Selected Project Specifications'));
    assert.strictEqual(compiled.formattedBrief.includes('<retrieved-memory>'), false);
    assert.strictEqual(compiled.formattedBrief.includes('Relevant Code Symbols'), false);
  });

  test('model router defaults to inherit/specified profile when routing disabled', () => {
    const router = new ModelRouter({ enabled: false, defaultModel: 'claude-3-5-sonnet' });
    const rec = router.route('Complex multi-tiered database refactor', 'gsd-executor');

    assert.strictEqual(rec.recommendedModel, 'claude-3-5-sonnet');
    assert.strictEqual(rec.reason.includes('disabled'), true);
  });
});
