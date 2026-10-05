/**
 * GSD-X Model Routing & Task Classification Tests
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyTaskCategory,
  analyzeComplexity,
  ModelRouter,
} = require('../sdk/dist/routing/index.js');

describe('GSD-X Model Routing & Task Classification', () => {
  test('classifies simple questions and status checks as trivial', () => {
    const category = classifyTaskCategory('what is the current status?');
    assert.strictEqual(category, 'trivial');
  });

  test('classifies bug fixes and debugging tasks accurately', () => {
    const category = classifyTaskCategory('Fix the null pointer exception error in trade execution');
    assert.strictEqual(category, 'debugging');
  });

  test('classifies architectural refactors as architecture', () => {
    const category = classifyTaskCategory('Architectural refactor of the memory and context pipeline');
    assert.strictEqual(category, 'architecture');
  });

  test('classifies security and vulnerability analysis as security', () => {
    const category = classifyTaskCategory('Audit for prompt injection and secret leakage vulnerabilities');
    assert.strictEqual(category, 'security');
  });

  test('classifies based on agent role shortcuts', () => {
    assert.strictEqual(classifyTaskCategory('random query', 'gsd-verifier'), 'verification');
    assert.strictEqual(classifyTaskCategory('random query', 'gsd-executor'), 'coding');
    assert.strictEqual(classifyTaskCategory('random query', 'gsd-debugger'), 'debugging');
    assert.strictEqual(classifyTaskCategory('random query', 'gsd-researcher'), 'research');
  });

  test('analyzes complexity scores from task description and category', () => {
    const simple = analyzeComplexity('check status', 'trivial');
    assert.strictEqual(simple.score, 2);
    assert.strictEqual(simple.expectedCodeSurface, 'none');
    assert.strictEqual(simple.recommendedTimeoutSeconds, 60);

    const complex = analyzeComplexity(
      'Complete overhaul and migration of legacy database schema with concurrency locks and high throughput transactions',
      'architecture'
    );
    assert.strictEqual(complex.score, 9);
    assert.strictEqual(complex.expectedCodeSurface, 'cross-cutting');
    assert.strictEqual(complex.recommendedTimeoutSeconds, 900);
  });

  test('returns default model when routing is disabled', () => {
    const disabledRouter = new ModelRouter({ enabled: false, defaultModel: 'gemini-2.5-flash' });
    const rec = disabledRouter.route('Critical high-level security refactor');

    assert.strictEqual(rec.recommendedModel, 'gemini-2.5-flash');
    assert.strictEqual(rec.reason.includes('disabled'), true);
  });

  test('routes tasks to appropriate model configuration when enabled', () => {
    const router = new ModelRouter({
      enabled: true,
      defaultModel: 'gemini-2.5-flash',
      tiers: {
        cheapModel: 'gemini-2.5-flash-lite',
        fastModel: 'gemini-2.5-flash',
        strongCodingModel: 'gemini-2.5-pro',
        reasoningModel: 'gemini-2.5-ultra-think',
        auditModel: 'gemini-2.5-pro',
      },
    });

    const trivialRec = router.route('show project status');
    assert.strictEqual(trivialRec.category, 'trivial');
    assert.strictEqual(trivialRec.recommendedModel, 'gemini-2.5-flash-lite');

    const codingRec = router.route('implement position caching helper');
    assert.strictEqual(codingRec.category, 'coding');
    assert.strictEqual(codingRec.recommendedModel, 'gemini-2.5-pro');

    const archRec = router.route('design distributed state consensus protocol');
    assert.strictEqual(archRec.category, 'architecture');
    assert.strictEqual(archRec.recommendedModel, 'gemini-2.5-ultra-think');
  });

  test('respects explicit task category overrides', () => {
    const router = new ModelRouter({
      enabled: true,
      defaultModel: 'default-model',
      overrides: {
        security: 'custom-security-auditor-model',
      },
    });

    const secRec = router.route('check for secret leaks');
    assert.strictEqual(secRec.category, 'security');
    assert.strictEqual(secRec.recommendedModel, 'custom-security-auditor-model');
  });
});
