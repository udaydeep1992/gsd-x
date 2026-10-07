/**
 * GSD-X Incremental Code Intelligence & Symbol Indexer
 *
 * Integrates Tree-sitter AST structural intelligence with incremental regex fallback,
 * tracking file hashes and mtimes for ultra-fast incremental re-indexing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AstCodebaseIndex } from './ast/ast-index';
import { writeFileAtomic } from './atomic-file';
import {
  SymbolNode,
  AstRelationship,
  SymbolTokenMetrics,
  SymbolQuery,
  RelationshipKind,
} from './ast/types';

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'method' | 'interface' | 'type' | 'export' | 'variable';
  filePath: string;
  startLine: number;
  endLine: number;
  signature: string;
  qualifiedName?: string;
  parentSymbol?: string;
}

export interface FileIndexEntry {
  filePath: string;
  mtime: number;
  hash: string;
  language: string;
  symbols: SymbolInfo[];
  exports: string[];
  imports: string[];
}

export interface CodeIndexStats {
  totalFiles: number;
  totalSymbols: number;
  totalRelationships?: number;
  languages: Record<string, number>;
  lastIndexedAt: string;
}

export class CodebaseIndex {
  private projectRoot: string;
  private indexPath: string;
  private entries: Map<string, FileIndexEntry> = new Map();
  private initialized = false;
  private astIndex: AstCodebaseIndex;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.indexPath = path.join(this.projectRoot, '.gsd', 'code-index.json');
    this.astIndex = new AstCodebaseIndex(this.projectRoot);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.astIndex.initialize();

    if (fs.existsSync(this.indexPath)) {
      try {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.entries)) {
          for (const entry of data.entries) {
            this.entries.set(entry.filePath, entry);
          }
        }
      } catch {
        // Fall back to clean index
      }
    }

    this.initialized = true;
  }

  public async save(): Promise<void> {
    fs.mkdirSync(path.dirname(this.indexPath), { recursive: true });
    const payload = {
      version: 1,
      projectRoot: this.projectRoot,
      savedAt: new Date().toISOString(),
      entries: Array.from(this.entries.values()),
    };
    writeFileAtomic(this.indexPath, JSON.stringify(payload, null, 2), 'utf8');
    await this.astIndex.save();
  }

  /**
   * Incrementally updates the index for the project directory.
   */
  public async updateIndex(forceRebuild = false): Promise<{ added: number; updated: number; removed: number }> {
    await this.initialize();

    if (forceRebuild) {
      this.entries.clear();
    }

    // 1. Update AST index
    const astResult = await this.astIndex.updateIndex(forceRebuild);

    // 2. Scan code files for fallback/unified representation
    const currentFiles = this.scanCodeFiles(this.projectRoot);
    const currentPaths = new Set(currentFiles);

    let added = 0;
    let updated = 0;
    let removed = 0;

    // Remove obsolete files
    for (const cachedPath of this.entries.keys()) {
      if (!currentPaths.has(cachedPath)) {
        this.entries.delete(cachedPath);
        removed++;
      }
    }

    // Index new and modified files
    for (const relPath of currentFiles) {
      const fullPath = path.join(this.projectRoot, relPath);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      const existing = this.entries.get(relPath);
      if (existing && !forceRebuild && existing.mtime === stat.mtimeMs) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      if (existing && existing.hash === hash) {
        existing.mtime = stat.mtimeMs;
        continue;
      }

      const entry = this.parseFile(relPath, content, stat.mtimeMs, hash);
      if (existing) {
        updated++;
      } else {
        added++;
      }
      this.entries.set(relPath, entry);
    }

    await this.save();
    return {
      added: Math.max(added, astResult.added),
      updated: Math.max(updated, astResult.updated),
      removed: Math.max(removed, astResult.removed),
    };
  }

  /**
   * Searches for symbols matching a keyword or phrase, combining AST and regex indices.
   */
  public searchSymbols(query: string, limit = 10): SymbolInfo[] {
    const q = query.toLowerCase();
    const results: Array<{ symbol: SymbolInfo; score: number }> = [];
    const seen = new Set<string>();

    // 1. AST Search results (prioritized)
    const astSyms = this.astIndex.findSymbol(query, limit);
    for (const s of astSyms) {
      const symInfo: SymbolInfo = {
        name: s.name,
        kind: this.mapAstKindToSymbolKind(s.kind),
        filePath: s.filePath,
        startLine: s.startLine,
        endLine: s.endLine,
        signature: s.signature,
        qualifiedName: s.qualifiedName,
        parentSymbol: s.parentSymbol,
      };
      const key = `${s.filePath}:${s.name}:${s.startLine}`;
      seen.add(key);

      let score = 10;
      if (s.name.toLowerCase() === q || s.qualifiedName.toLowerCase() === q) score = 15;
      else if (s.name.toLowerCase().startsWith(q)) score = 12;

      results.push({ symbol: symInfo, score });
    }

    // 2. Regex fallback entries
    for (const entry of this.entries.values()) {
      for (const sym of entry.symbols) {
        const key = `${sym.filePath}:${sym.name}:${sym.startLine}`;
        if (seen.has(key)) continue;

        const nameLower = sym.name.toLowerCase();
        let score = 0;

        if (nameLower === q) {
          score = 10;
        } else if (nameLower.startsWith(q)) {
          score = 8;
        } else if (nameLower.includes(q)) {
          score = 5;
        } else if (sym.signature.toLowerCase().includes(q)) {
          score = 3;
        }

        if (score > 0) {
          seen.add(key);
          results.push({ symbol: sym, score });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => r.symbol);
  }

  /**
   * Finds relevant source files matching keywords.
   */
  public findRelevantFiles(keywords: readonly string[], limit = 5): string[] {
    return this.astIndex.findFilesContaining(keywords, limit);
  }

  // Structural AST Query Methods
  public findSymbol(name: string, limit = 10): SymbolNode[] {
    return this.astIndex.findSymbol(name, limit);
  }

  public async findSymbols(query: SymbolQuery = {}): Promise<SymbolNode[]> {
    return this.astIndex.findSymbols(query);
  }

  public async findRelationships(symbolName: string): Promise<Array<{
    type: RelationshipKind;
    sourceSymbol: string;
    targetSymbol: string;
    filePath?: string;
  }>> {
    return this.astIndex.findRelationships(symbolName);
  }

  public findMethod(structOrClass: string, methodName: string): SymbolNode[] {
    return this.astIndex.findMethod(structOrClass, methodName);
  }

  public findImplementations(traitOrInterface: string): SymbolNode[] {
    return this.astIndex.findImplementations(traitOrInterface);
  }

  public findCallers(functionName: string): SymbolNode[] {
    return this.astIndex.findCallers(functionName);
  }

  public findCallees(functionName: string): string[] {
    return this.astIndex.findCallees(functionName);
  }

  public findDefinitions(symbolName: string): SymbolNode[] {
    return this.astIndex.findDefinitions(symbolName);
  }

  public findReferences(symbolName: string): SymbolNode[] {
    return this.astIndex.findReferences(symbolName);
  }

  public findRelatedSymbols(symbolName: string, maxDepth = 1): SymbolNode[] {
    return this.astIndex.findRelatedSymbols(symbolName, maxDepth);
  }

  public getRelationships(): AstRelationship[] {
    return this.astIndex.getAllRelationships();
  }

  public calculateSymbolSavings(filePath: string, symbol: SymbolNode): SymbolTokenMetrics {
    return this.astIndex.calculateSymbolSavings(filePath, symbol);
  }

  public getAstIndex(): AstCodebaseIndex {
    return this.astIndex;
  }

  public getStats(): CodeIndexStats {
    const astStats = this.astIndex.getStats();
    let totalSymbols = astStats.totalSymbols;
    const languages: Record<string, number> = { ...astStats.languages };

    for (const entry of this.entries.values()) {
      if (!languages[entry.language]) {
        totalSymbols += entry.symbols.length;
        languages[entry.language] = (languages[entry.language] || 0) + 1;
      }
    }

    return {
      totalFiles: Math.max(this.entries.size, astStats.totalFiles),
      totalSymbols,
      totalRelationships: astStats.totalRelationships,
      languages,
      lastIndexedAt: new Date().toISOString(),
    };
  }

  private mapAstKindToSymbolKind(kind: string): SymbolInfo['kind'] {
    switch (kind) {
      case 'function':
        return 'function';
      case 'method':
        return 'method';
      case 'class':
      case 'struct':
        return 'class';
      case 'interface':
      case 'trait':
        return 'interface';
      case 'type':
      case 'enum':
        return 'type';
      case 'variable':
      case 'constant':
        return 'variable';
      default:
        return 'function';
    }
  }

  private scanCodeFiles(dir: string, baseDir = dir): string[] {
    const results: string[] = [];
    const ignoreDirs = new Set(['node_modules', '.git', '.planning', 'dist', 'build', '.gsd', '.gemini', 'coverage']);
    const codeExts = new Set([
      '.ts', '.cts', '.mts', '.tsx',
      '.js', '.cjs', '.mjs', '.jsx',
      '.py',
      '.rs',
      '.go',
      '.cpp', '.cc', '.cxx', '.hpp', '.h', '.c',
      '.java',
    ]);

    const scan = (current: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.planning') continue;
        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name)) {
            scan(path.join(current, entry.name));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (codeExts.has(ext)) {
            results.push(path.relative(baseDir, path.join(current, entry.name)).replace(/\\/g, '/'));
          }
        }
      }
    };

    scan(dir);
    return results;
  }

  private parseFile(relPath: string, content: string, mtime: number, hash: string): FileIndexEntry {
    const ext = path.extname(relPath).toLowerCase();
    const language = this.detectLanguage(ext);
    const symbols: SymbolInfo[] = [];
    const exports: string[] = [];
    const imports: string[] = [];

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('import ') || (trimmed.startsWith('const ') && trimmed.includes('require('))) {
        imports.push(trimmed);
      }

      // 1. Function
      const fnMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          kind: 'function',
          filePath: relPath,
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
        });
        if (trimmed.startsWith('export')) exports.push(fnMatch[1]);
        continue;
      }

      // 2. Class
      const classMatch = trimmed.match(/(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          filePath: relPath,
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
        });
        if (trimmed.startsWith('export')) exports.push(classMatch[1]);
        continue;
      }

      // 3. Interface / Type
      const typeMatch = trimmed.match(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          kind: trimmed.includes('interface') ? 'interface' : 'type',
          filePath: relPath,
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
        });
        if (trimmed.startsWith('export')) exports.push(typeMatch[1]);
        continue;
      }

      // 4. Exported const / variable
      const constMatch = trimmed.match(/^export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/);
      if (constMatch) {
        symbols.push({
          name: constMatch[1],
          kind: 'variable',
          filePath: relPath,
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed.slice(0, 80),
        });
        exports.push(constMatch[1]);
        continue;
      }

      // 5. Class method
      const methodMatch = trimmed.match(/^(?:(?:public|private|protected|static|async)\s+)+([a-zA-Z0-9_$]+)\s*\(/);
      if (methodMatch && !['function', 'if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodMatch[1])) {
        symbols.push({
          name: methodMatch[1],
          kind: 'method',
          filePath: relPath,
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed.replace(/\{[\s\S]*$/, '').trim(),
        });
        continue;
      }

      // 6. Python def
      const pyDefMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_$]+)\s*\(/);
      if (pyDefMatch) {
        symbols.push({
          name: pyDefMatch[1],
          kind: 'function',
          filePath: relPath,
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed.replace(/:$/, '').trim(),
        });
        continue;
      }
    }

    return {
      filePath: relPath,
      mtime,
      hash,
      language,
      symbols,
      exports,
      imports,
    };
  }

  private detectLanguage(ext: string): string {
    switch (ext) {
      case '.ts':
      case '.cts':
      case '.mts':
        return 'typescript';
      case '.js':
      case '.cjs':
      case '.mjs':
        return 'javascript';
      case '.py':
        return 'python';
      case '.rs':
        return 'rust';
      case '.go':
        return 'go';
      case '.cpp':
      case '.c':
      case '.h':
        return 'cpp';
      default:
        return 'unknown';
    }
  }
}
