/**
 * GSD-X Tree-sitter AST Structural Code Intelligence Tests
 *
 * Comprehensive test suite verifying AST symbol extraction, structural relationships
 * (calls, inherits, implements, belongs_to), incremental caching, malformed syntax resilience,
 * and token efficiency metrics for Rust, Go, and C++.
 */

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  AstCodebaseIndex,
  ParserManager,
  CodebaseIndex,
} = require('../sdk/dist/context/index.js');

describe('GSD-X Tree-sitter AST Structural Code Intelligence', () => {
  const testTmpDir = path.join(os.tmpdir(), `gsd-x-ast-test-${Date.now()}`);

  before(async () => {
    fs.mkdirSync(path.join(testTmpDir, 'src', 'rust'), { recursive: true });
    fs.mkdirSync(path.join(testTmpDir, 'src', 'go'), { recursive: true });
    fs.mkdirSync(path.join(testTmpDir, 'src', 'cpp'), { recursive: true });

    // 1. Rust Sample File
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'rust', 'auth.rs'),
      `use std::collections::HashMap;

/// Represents a registered system user
pub struct User {
    pub id: u64,
    pub username: String,
}

pub enum AuthStatus {
    Authenticated,
    Denied,
}

pub trait TokenVerifier {
    fn verify_token(&self, token: &str) -> bool;
}

pub struct JwtVerifier {
    pub secret: String,
}

impl TokenVerifier for JwtVerifier {
    fn verify_token(&self, token: &str) -> bool {
        !token.is_empty()
    }
}

pub fn validate_token(token: &str) -> bool {
    let verifier = JwtVerifier { secret: "sec".to_string() };
    verifier.verify_token(token)
}

pub fn authenticate_user(user: &User, token: &str) -> AuthStatus {
    if validate_token(token) {
        AuthStatus::Authenticated
    } else {
        AuthStatus::Denied
    }
}
`
    );

    // 2. Go Sample File
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'go', 'payment.go'),
      `package billing

import "fmt"

type PaymentGateway interface {
    ProcessPayment(amount float64) bool
}

type StripeService struct {
    ApiKey string
}

func (s *StripeService) ProcessPayment(amount float64) bool {
    return chargeCard(amount)
}

func chargeCard(amount float64) bool {
    return amount > 0
}

func ExecuteTransaction(gw PaymentGateway, amount float64) bool {
    return gw.ProcessPayment(amount)
}
`
    );

    // 3. C++ Sample File
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'cpp', 'engine.cpp'),
      `#include <iostream>
#include <string>

namespace core {

class BaseService {
public:
    virtual void start() {}
};

class OrderEngine : public BaseService {
public:
    int orderCount;
    void start() override {
        initializeStorage();
    }
    bool placeOrder(int orderId) {
        validateOrder(orderId);
        return true;
    }
private:
    void initializeStorage() {}
    void validateOrder(int id) {}
};

template <typename T>
class SafeQueue {
public:
    void push(T val) {}
};

}
`
    );

    // 4. Malformed Code File (Testing resilience to incomplete/invalid syntax)
    fs.writeFileSync(
      path.join(testTmpDir, 'src', 'rust', 'broken.rs'),
      `pub struct IncompleteUser {
    pub id: u64
    // missing closing brace and type annotations
pub fn broken_function(
`
    );
  });

  after(() => {
    try {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. ParserManager & Language Detection', () => {
    test('detects supported languages from file extensions', () => {
      assert.strictEqual(ParserManager.detectLanguage('src/auth.rs'), 'rust');
      assert.strictEqual(ParserManager.detectLanguage('src/payment.go'), 'go');
      assert.strictEqual(ParserManager.detectLanguage('src/engine.cpp'), 'cpp');
      assert.strictEqual(ParserManager.detectLanguage('src/header.hpp'), 'cpp');
      assert.strictEqual(ParserManager.detectLanguage('src/c_file.c'), 'c');
      assert.strictEqual(ParserManager.detectLanguage('src/app.ts'), 'typescript');
      assert.strictEqual(ParserManager.detectLanguage('src/app.py'), 'python');
    });

    test('parses without crashing on malformed / incomplete syntax', async () => {
      const brokenContent = `pub fn incomplete_function(`;
      const result = await ParserManager.parse(brokenContent, 'broken.rs');
      assert.ok(result);
      assert.ok(Array.isArray(result.symbols));
      assert.ok(Array.isArray(result.errors));
    });
  });

  describe('2. Rust AST Extraction & Structural Relationships', () => {
    test('extracts structs, enums, traits, impls, functions, and docstrings', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const userStruct = index.findSymbol('User');
      assert.ok(userStruct.length >= 1, 'Should find User struct');
      assert.strictEqual(userStruct[0].kind, 'struct');
      assert.strictEqual(userStruct[0].language, 'rust');
      assert.strictEqual(userStruct[0].visibility, 'public');
      assert.ok(userStruct[0].documentation?.includes('Represents a registered system user'));

      const authEnum = index.findSymbol('AuthStatus');
      assert.ok(authEnum.length >= 1, 'Should find AuthStatus enum');
      assert.strictEqual(authEnum[0].kind, 'enum');

      const tokenTrait = index.findSymbol('TokenVerifier');
      assert.ok(tokenTrait.length >= 1, 'Should find TokenVerifier trait');
      assert.strictEqual(tokenTrait[0].kind, 'trait');

      const authFn = index.findSymbol('authenticate_user');
      assert.ok(authFn.length >= 1, 'Should find authenticate_user function');
      assert.strictEqual(authFn[0].kind, 'function');
    });

    test('extracts trait implementations and method belongs_to relationships', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const verifyMethod = index.findMethod('JwtVerifier', 'verify_token');
      assert.ok(verifyMethod.length >= 1, 'Should find JwtVerifier::verify_token method');
      assert.strictEqual(verifyMethod[0].parentSymbol, 'JwtVerifier');

      const implementers = index.findImplementations('TokenVerifier');
      assert.ok(implementers.length >= 1, 'Should find JwtVerifier implementing TokenVerifier');
      assert.strictEqual(implementers[0].name, 'JwtVerifier');
    });

    test('extracts function call graph (authenticate_user -> validate_token)', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const callers = index.findCallers('validate_token');
      assert.ok(callers.length >= 1, 'authenticate_user should call validate_token');
      assert.ok(callers.some((c) => c.name === 'authenticate_user'));

      const callees = index.findCallees('validate_token');
      assert.ok(callees.some((c) => c.includes('verify_token')));
    });
  });

  describe('3. Go AST Extraction & Structural Relationships', () => {
    test('extracts packages, structs, interfaces, and methods with receivers', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const pkg = index.findSymbol('billing');
      assert.ok(pkg.length >= 1, 'Should find billing package');
      assert.strictEqual(pkg[0].kind, 'module');

      const iface = index.findSymbol('PaymentGateway');
      assert.ok(iface.length >= 1, 'Should find PaymentGateway interface');
      assert.strictEqual(iface[0].kind, 'interface');

      const stripeStruct = index.findSymbol('StripeService');
      assert.ok(stripeStruct.length >= 1, 'Should find StripeService struct');
      assert.strictEqual(stripeStruct[0].kind, 'struct');

      const method = index.findMethod('StripeService', 'ProcessPayment');
      assert.ok(method.length >= 1, 'Should find StripeService.ProcessPayment method with receiver');
      assert.strictEqual(method[0].parentSymbol, 'StripeService');
      assert.strictEqual(method[0].visibility, 'public');

      const unexported = index.findSymbol('chargeCard');
      assert.ok(unexported.length >= 1);
      assert.strictEqual(unexported[0].visibility, 'private');
    });

    test('extracts Go caller relationships', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const callers = index.findCallers('chargeCard');
      assert.ok(callers.length >= 1, 'ProcessPayment should call chargeCard');
      assert.strictEqual(callers[0].name, 'ProcessPayment');
    });
  });

  describe('4. C++ AST Extraction & Structural Relationships', () => {
    test('extracts namespaces, classes, inheritance, and methods', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const ns = index.findSymbol('core');
      assert.ok(ns.length >= 1, 'Should find core namespace');
      assert.strictEqual(ns[0].kind, 'namespace');

      const orderEngine = index.findSymbol('OrderEngine');
      assert.ok(orderEngine.length >= 1, 'Should find OrderEngine class');
      assert.strictEqual(orderEngine[0].kind, 'class');

      const rels = index.getAllRelationships();
      const inheritsRel = rels.find((r) => r.kind === 'inherits' && r.sourceId === 'OrderEngine' && r.targetId === 'BaseService');
      assert.ok(inheritsRel, 'OrderEngine should inherit from BaseService');

      const method = index.findMethod('OrderEngine', 'placeOrder');
      assert.ok(method.length >= 1, 'Should find placeOrder method');
      assert.strictEqual(method[0].parentSymbol, 'OrderEngine');
    });

    test('extracts C++ caller relationships', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const callers = index.findCallers('validateOrder');
      assert.ok(callers.length >= 1, 'placeOrder should call validateOrder');
      assert.strictEqual(callers[0].name, 'placeOrder');
    });
  });

  describe('5. Incremental Indexing & Cache Management', () => {
    test('preserves cached entries and updates modified files without reparsing untouched', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      const initial = await index.updateIndex(true);
      assert.ok(initial.added >= 4);

      // Unmodified update
      const noop = await index.updateIndex();
      assert.strictEqual(noop.added, 0);
      assert.strictEqual(noop.updated, 0);

      // Add new Go file
      fs.writeFileSync(
        path.join(testTmpDir, 'src', 'go', 'metrics.go'),
        `package billing\nfunc RecordMetric(name string) {}\n`
      );

      const addResult = await index.updateIndex();
      assert.strictEqual(addResult.added, 1);

      // Delete the added file
      fs.unlinkSync(path.join(testTmpDir, 'src', 'go', 'metrics.go'));
      const removeResult = await index.updateIndex();
      assert.strictEqual(removeResult.removed, 1);
    });
  });

  describe('6. Token Efficiency Metrics Instrumentation', () => {
    test('calculates tokens saved when retrieving symbol slice vs full file', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const syms = index.findSymbol('authenticate_user', 1);
      assert.ok(syms.length >= 1);

      const metrics = index.calculateSymbolSavings('src/rust/auth.rs', syms[0]);
      assert.strictEqual(metrics.filePath, 'src/rust/auth.rs');
      assert.strictEqual(metrics.symbolName, 'authenticate_user');
      assert.ok(metrics.fullFileTokens > metrics.symbolTokens, 'Full file must have more tokens than symbol slice');
      assert.ok(metrics.tokensSaved > 0, 'Tokens saved must be > 0');
      assert.ok(metrics.reductionPercent > 40, `Expected > 40% reduction, got ${metrics.reductionPercent}%`);
    });
  });

  describe('7. Unified CodebaseIndex Integration', () => {
    test('CodebaseIndex provides seamless access to AST queries and symbols', async () => {
      const codebaseIndex = new CodebaseIndex(testTmpDir);
      await codebaseIndex.updateIndex();

      const stats = codebaseIndex.getStats();
      assert.ok(stats.totalFiles >= 4);
      assert.ok(stats.totalSymbols >= 10);
      assert.ok(stats.languages.rust >= 1);
      assert.ok(stats.languages.go >= 1);
      assert.ok(stats.languages.cpp >= 1);

      const callers = codebaseIndex.findCallers('validate_token');
      assert.ok(callers.length >= 1);

      const searchResults = codebaseIndex.searchSymbols('User');
      assert.ok(searchResults.length >= 1);
      assert.ok(searchResults.some((s) => s.name === 'User'));
    });
  });

  describe('8. Dedicated Phase 1 AST Commands & Multi-attribute Queries', () => {
    const toolsPath = path.resolve(__dirname, '../gsd-core/bin/gsd-tools.cjs');

    test('findSymbols supports filtering by name, language, kind, and limit', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const rustSyms = await index.findSymbols({ name: 'authenticate_user', language: 'rust' });
      assert.ok(rustSyms.length >= 1);
      assert.strictEqual(rustSyms[0].language, 'rust');
      assert.strictEqual(rustSyms[0].kind, 'function');

      const traits = await index.findSymbols({ kind: 'trait' });
      assert.ok(traits.length >= 1);
      assert.strictEqual(traits[0].name, 'TokenVerifier');
    });

    test('findRelationships extracts structural links across callers, impls, and methods', async () => {
      const index = new AstCodebaseIndex(testTmpDir);
      await index.updateIndex();

      const rels = await index.findRelationships('validate_token');
      assert.ok(rels.length >= 1);
      assert.ok(rels.some((r) => r.type === 'calls' && r.targetSymbol === 'validate_token'));

      const implRels = await index.findRelationships('JwtVerifier');
      assert.ok(implRels.length >= 1);
      assert.ok(implRels.some((r) => r.type === 'implements' || r.type === 'belongs_to'));
    });

    test('CodebaseIndex provides findSymbols and findRelationships delegation', async () => {
      const codebaseIndex = new CodebaseIndex(testTmpDir);
      await codebaseIndex.updateIndex();

      const syms = await codebaseIndex.findSymbols({ name: 'PaymentGateway' });
      assert.ok(syms.length >= 1);

      const rels = await codebaseIndex.findRelationships('validate_token');
      assert.ok(rels.length >= 1);
    });

    test('executes dedicated CLI commands: gsd-ast-index, gsd-ast-stats, gsd-ast-query, gsd-ast-relationships', () => {
      const cp = require('node:child_process');

      // 1. gsd-ast-index
      const indexOut = cp.execFileSync(process.execPath, [toolsPath, 'gsd-ast-index', '--cwd', testTmpDir], { encoding: 'utf-8' });
      assert.ok(indexOut.includes('AST Index updated') || indexOut.includes('AST Index rebuilt'));

      // 2. gsd-ast-stats
      const statsOut = cp.execFileSync(process.execPath, [toolsPath, 'gsd-ast-stats', '--cwd', testTmpDir], { encoding: 'utf-8' });
      assert.ok(statsOut.includes('GSD-X AST Codebase Index Stats'));
      assert.ok(statsOut.includes('Supported Languages:'));

      // 3. gsd-ast-query (positional argument)
      const queryOut = cp.execFileSync(process.execPath, [toolsPath, 'gsd-ast-query', 'authenticate_user', '--cwd', testTmpDir], { encoding: 'utf-8' });
      assert.ok(queryOut.includes('authenticate_user'));
      assert.ok(queryOut.includes('auth.rs'));

      // 4. gsd-ast-relationships (positional argument)
      const relsOut = cp.execFileSync(process.execPath, [toolsPath, 'gsd-ast-relationships', 'authenticate_user', '--cwd', testTmpDir], { encoding: 'utf-8' });
      assert.ok(relsOut.includes('authenticate_user'));

      // 5. gsd-ast-graph alias
      const graphOut = cp.execFileSync(process.execPath, [toolsPath, 'gsd-ast-graph', 'JwtVerifier', '--cwd', testTmpDir], { encoding: 'utf-8' });
      assert.ok(graphOut.includes('JwtVerifier'));
    });
  });
});
