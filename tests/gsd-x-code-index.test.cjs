/**
 * GSD-X Incremental Code Indexer Tests
 */

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { CodebaseIndex } = require('../sdk/dist/context/index.js');

describe('GSD-X Code Intelligence & Indexer', () => {
  const testTmpDir = path.join(os.tmpdir(), `gsd-x-index-test-${Date.now()}`);

  before(() => {
    fs.mkdirSync(path.join(testTmpDir, 'src'), { recursive: true });

    // File 1: ts file with class and methods
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'position-manager.ts'),
      `export class PositionManager {
  public async syncPositions(): Promise<void> {}
  public getOpenPositions(): number { return 0; }
}
export function calculatePnL(): number { return 100; }
`
    );

    // File 2: connector
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'mt5-connector.ts'),
      `export class MT5Connector {
  public async connect(): Promise<boolean> { return true; }
}
export interface MT5Config {
  server: string;
}
`
    );
  });

  after(() => {
    try {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch {}
  });

  test('indexes source files and extracts symbols', async () => {
    const indexer = new CodebaseIndex(testTmpDir);
    const result = await indexer.updateIndex();

    assert.strictEqual(result.added, 2, 'Should index 2 initial files');
    assert.strictEqual(result.updated, 0);
    assert.strictEqual(result.removed, 0);

    const stats = indexer.getStats();
    assert.strictEqual(stats.totalFiles, 2);
    assert.ok(stats.totalSymbols >= 4, `Expected >= 4 symbols, got ${stats.totalSymbols}`);
    assert.strictEqual(stats.languages.typescript, 2);
  });

  test('performs incremental updates without re-indexing untouched files', async () => {
    const indexer = new CodebaseIndex(testTmpDir);
    await indexer.initialize();

    // No files modified
    const noopResult = await indexer.updateIndex();
    assert.strictEqual(noopResult.added, 0);
    assert.strictEqual(noopResult.updated, 0);
    assert.strictEqual(noopResult.removed, 0);

    // Add a new file
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'utils.ts'),
      `export function formatCurrency(amount: number): string { return '$' + amount; }\n`
    );

    const addResult = await indexer.updateIndex();
    assert.strictEqual(addResult.added, 1);
  });

  test('cleans up removed files from index', async () => {
    const indexer = new CodebaseIndex(testTmpDir);
    await indexer.initialize();

    // Delete utils.ts
    fs.unlinkSync(path.join(testTmpDir, 'src', 'utils.ts'));

    const removeResult = await indexer.updateIndex();
    assert.strictEqual(removeResult.removed, 1);
  });

  test('searches symbols by exact and partial names with relevance ranking', async () => {
    const indexer = new CodebaseIndex(testTmpDir);
    await indexer.initialize();

    const matches = indexer.searchSymbols('syncPositions');
    assert.ok(matches.length >= 1);
    assert.strictEqual(matches[0].name, 'syncPositions');
    assert.strictEqual(matches[0].filePath, 'src/position-manager.ts');

    const classMatches = indexer.searchSymbols('PositionManager');
    assert.ok(classMatches.length >= 1);
    assert.strictEqual(classMatches[0].name, 'PositionManager');
    assert.strictEqual(classMatches[0].kind, 'class');
  });

  test('finds relevant files for keywords', async () => {
    const indexer = new CodebaseIndex(testTmpDir);
    await indexer.initialize();

    const files = indexer.findRelevantFiles(['mt5', 'connector']);
    assert.ok(files.length >= 1);
    assert.strictEqual(files[0], 'src/mt5-connector.ts');
  });
});
