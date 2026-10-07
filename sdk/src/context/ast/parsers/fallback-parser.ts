/**
 * GSD-X Robust Fallback AST Parser
 *
 * Provides regex-based symbol and relationship extraction for languages
 * without active WASM grammars (JS/TS/Python) or as a resilient failover
 * when source code has severe syntax errors.
 */

import * as crypto from 'crypto';
import { LanguageParser } from '../parser-interface';
import { AstParseResult, AstRelationship, SymbolNode, AstLanguage } from '../types';

export class FallbackParser implements LanguageParser {
  public readonly language: AstLanguage;

  constructor(language: AstLanguage = 'unknown') {
    this.language = language;
  }

  public parse(source: string, filePath: string): AstParseResult {
    const symbols: SymbolNode[] = [];
    const relationships: AstRelationship[] = [];
    const imports: string[] = [];
    const references: string[] = [];
    const errors: string[] = [];

    const computeHash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');
    const lines = source.split('\n');

    let currentClass = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      // Imports
      if (
        trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') ||
        (trimmed.startsWith('const ') && trimmed.includes('require(')) ||
        trimmed.startsWith('#include') ||
        trimmed.startsWith('use ')
      ) {
        imports.push(trimmed);
        continue;
      }

      // Class / Struct
      const classMatch = trimmed.match(/(?:export\s+)?(?:abstract\s+)?(?:class|struct)\s+([a-zA-Z0-9_$]+)(?:\s+(?:extends|implements|:)\s+([a-zA-Z0-9_$,\s]+))?/);
      if (classMatch && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        const className = classMatch[1];
        currentClass = className;
        const inherits = classMatch[2];
        const id = `${filePath}:${className}:${lineNum}`;

        symbols.push({
          id,
          name: className,
          qualifiedName: className,
          kind: 'class',
          language: this.language,
          filePath,
          startLine: lineNum,
          endLine: lineNum,
          startByte: 0,
          endByte: line.length,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
          visibility: trimmed.startsWith('export') || trimmed.startsWith('pub') ? 'public' : 'private',
          imports: [],
          references: [],
          dependencies: [],
          hash: computeHash(line),
        });

        if (inherits) {
          const bases = inherits.split(',').map((b) => b.trim().split(/\s+/)[0]).filter(Boolean);
          for (const base of bases) {
            relationships.push({
              sourceId: className,
              targetId: base,
              kind: 'inherits',
            });
          }
        }
        continue;
      }

      // Function
      const fnMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?(?:function|def|fn)\s+([a-zA-Z0-9_$]+)\s*\(/);
      if (fnMatch && !trimmed.startsWith('//')) {
        const fnName = fnMatch[1];
        const id = `${filePath}:${fnName}:${lineNum}`;

        symbols.push({
          id,
          name: fnName,
          qualifiedName: fnName,
          kind: 'function',
          language: this.language,
          filePath,
          startLine: lineNum,
          endLine: lineNum,
          startByte: 0,
          endByte: line.length,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
          visibility: trimmed.startsWith('export') || trimmed.startsWith('pub') ? 'public' : 'private',
          imports: [],
          references: [],
          dependencies: [],
          hash: computeHash(line),
        });
        continue;
      }

      // Method inside class
      const methodMatch = trimmed.match(/^(?:(?:public|private|protected|static|async)\s+)+([a-zA-Z0-9_$]+)\s*\(/);
      if (methodMatch && currentClass && !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(methodMatch[1])) {
        const methodName = methodMatch[1];
        const qualifiedName = `${currentClass}.${methodName}`;
        const id = `${filePath}:${qualifiedName}:${lineNum}`;

        symbols.push({
          id,
          name: methodName,
          qualifiedName,
          kind: 'method',
          language: this.language,
          filePath,
          startLine: lineNum,
          endLine: lineNum,
          startByte: 0,
          endByte: line.length,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
          parentSymbol: currentClass,
          visibility: trimmed.includes('private') ? 'private' : trimmed.includes('protected') ? 'protected' : 'public',
          imports: [],
          references: [],
          dependencies: [currentClass],
          hash: computeHash(line),
        });

        relationships.push({
          sourceId: id,
          targetId: currentClass,
          kind: 'belongs_to',
        });
        continue;
      }

      // Simple call detection (e.g. someFunction(...))
      const callMatch = trimmed.match(/\b([a-zA-Z0-9_$]+)\s*\(/);
      if (callMatch && !['if', 'for', 'while', 'switch', 'catch', 'function', 'class', 'struct', 'def', 'fn', 'return'].includes(callMatch[1])) {
        references.push(callMatch[1]);
      }
    }

    return { symbols, relationships, imports, references, errors };
  }
}
