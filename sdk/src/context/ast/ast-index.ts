/**
 * GSD-X Incremental Tree-sitter AST Codebase Index
 *
 * Maintains an incremental symbol index and structural relationship graph
 * (calls, inheritance, implementation, containment) with SHA-256 and mtime caching.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  AstFileIndexEntry,
  AstIndexStats,
  AstRelationship,
  RelationshipKind,
  SymbolNode,
  SymbolQuery,
  SymbolTokenMetrics,
} from './types';
import { ParserManager } from './parser-manager';
import { writeFileAtomic } from '../atomic-file';

export class AstCodebaseIndex {
  private projectRoot: string;
  private indexPath: string;
  private entries: Map<string, AstFileIndexEntry> = new Map();
  private symbolMap: Map<string, SymbolNode> = new Map();
  private nameIndex: Map<string, SymbolNode[]> = new Map();
  private callersGraph: Map<string, Set<string>> = new Map();
  private calleesGraph: Map<string, Set<string>> = new Map();
  private implementationGraph: Map<string, Set<string>> = new Map();
  private inheritanceGraph: Map<string, Set<string>> = new Map();
  private initialized = false;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.indexPath = path.join(this.projectRoot, '.gsd', 'ast-index.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (fs.existsSync(this.indexPath)) {
      try {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.entries)) {
          for (const entry of data.entries) {
            this.entries.set(entry.filePath, entry);
          }
          this.rebuildInternalGraphs();
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
  }

  /**
   * Incrementally updates the index for the project directory.
   */
  public async updateIndex(forceRebuild = false): Promise<{ added: number; updated: number; removed: number }> {
    await this.initialize();

    if (forceRebuild) {
      this.entries.clear();
      this.clearGraphs();
    }

    const currentFiles = this.scanCodeFiles(this.projectRoot);
    const currentPaths = new Set(currentFiles);

    let added = 0;
    let updated = 0;
    let removed = 0;

    // 1. Remove files that no longer exist
    for (const cachedPath of this.entries.keys()) {
      if (!currentPaths.has(cachedPath)) {
        this.entries.delete(cachedPath);
        removed++;
      }
    }

    // 2. Index new and modified files
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

      const lang = ParserManager.detectLanguage(relPath);
      const parseResult = await ParserManager.parse(content, relPath);

      const entry: AstFileIndexEntry = {
        filePath: relPath,
        mtime: stat.mtimeMs,
        hash,
        language: lang,
        symbols: parseResult.symbols,
        relationships: parseResult.relationships,
        imports: parseResult.imports,
        exports: parseResult.symbols.filter((s) => s.visibility === 'public').map((s) => s.name),
      };

      if (existing) {
        updated++;
      } else {
        added++;
      }

      this.entries.set(relPath, entry);
    }

    this.rebuildInternalGraphs();
    await this.save();
    return { added, updated, removed };
  }

  /**
   * Finds symbols matching query criteria.
   */
  public findSymbol(name: string, limit = 10): SymbolNode[] {
    const q = name.toLowerCase();
    const results: Array<{ symbol: SymbolNode; score: number }> = [];

    for (const sym of this.symbolMap.values()) {
      const symLower = sym.name.toLowerCase();
      const qualLower = sym.qualifiedName.toLowerCase();
      let score = 0;

      if (symLower === q || qualLower === q) {
        score = 10;
      } else if (symLower.startsWith(q) || qualLower.startsWith(q)) {
        score = 8;
      } else if (symLower.includes(q) || qualLower.includes(q)) {
        score = 5;
      } else if (sym.signature.toLowerCase().includes(q)) {
        score = 3;
      }

      if (score > 0) {
        results.push({ symbol: sym, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => r.symbol);
  }

  /**
   * Queries symbols with multi-attribute filtering (name, kind, language, path, limit).
   */
  public async findSymbols(query: SymbolQuery = {}): Promise<SymbolNode[]> {
    await this.initialize();
    const qName = (query.name || query.qualifiedName || '').toLowerCase().trim();
    const qKind = query.kind ? (Array.isArray(query.kind) ? query.kind : [query.kind]) : undefined;
    const qLang = query.language?.toLowerCase();
    const qPath = query.filePath?.toLowerCase();
    const limit = query.limit || 50;

    const results: Array<{ symbol: SymbolNode; score: number }> = [];

    for (const sym of this.symbolMap.values()) {
      if (qLang && sym.language.toLowerCase() !== qLang) continue;
      if (qKind && !qKind.includes(sym.kind)) continue;
      if (qPath && !sym.filePath.toLowerCase().includes(qPath)) continue;

      if (!qName) {
        results.push({ symbol: sym, score: 1 });
        continue;
      }

      const symName = sym.name.toLowerCase();
      const qualName = sym.qualifiedName.toLowerCase();
      let score = 0;

      if (symName === qName || qualName === qName) {
        score = 10;
      } else if (symName.startsWith(qName) || qualName.startsWith(qName)) {
        score = 8;
      } else if (symName.includes(qName) || qualName.includes(qName)) {
        score = 5;
      } else if (sym.signature.toLowerCase().includes(qName)) {
        score = 3;
      }

      if (score > 0) {
        results.push({ symbol: sym, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => r.symbol);
  }

  /**
   * Finds structural relationships for a given symbol (calls, callees, implements, belongs_to, inherits).
   */
  public async findRelationships(symbolName: string): Promise<Array<{
    type: RelationshipKind;
    sourceSymbol: string;
    targetSymbol: string;
    filePath?: string;
  }>> {
    await this.initialize();
    const q = symbolName.toLowerCase().trim();
    const results: Array<{
      type: RelationshipKind;
      sourceSymbol: string;
      targetSymbol: string;
      filePath?: string;
    }> = [];

    const resolveSymbolName = (idOrName: string): { name: string; filePath?: string } => {
      const sym = this.symbolMap.get(idOrName);
      if (sym) {
        return { name: sym.qualifiedName || sym.name, filePath: sym.filePath };
      }
      const parts = idOrName.split(':');
      if (parts.length >= 3) {
        return { name: parts[1], filePath: parts[0] };
      }
      return { name: idOrName };
    };

    for (const entry of this.entries.values()) {
      for (const rel of entry.relationships) {
        const src = resolveSymbolName(rel.sourceId);
        const tgt = resolveSymbolName(rel.targetId);

        const srcMatches = src.name.toLowerCase().includes(q) || rel.sourceId.toLowerCase().includes(q);
        const tgtMatches = tgt.name.toLowerCase().includes(q) || rel.targetId.toLowerCase().includes(q);

        if (srcMatches || tgtMatches) {
          results.push({
            type: rel.kind,
            sourceSymbol: src.name,
            targetSymbol: tgt.name,
            filePath: (rel.metadata?.filePath as string) || src.filePath || entry.filePath,
          });
        }
      }
    }

    return results;
  }

  /**
   * Finds method belonging to a struct or class.
   */
  public findMethod(structOrClass: string, methodName: string): SymbolNode[] {
    const sLower = structOrClass.toLowerCase();
    const mLower = methodName.toLowerCase();
    const results: SymbolNode[] = [];

    for (const sym of this.symbolMap.values()) {
      if (sym.kind === 'method') {
        const matchesParent = sym.parentSymbol && sym.parentSymbol.toLowerCase() === sLower;
        const matchesName = sym.name.toLowerCase() === mLower;
        const matchesQualified = sym.qualifiedName.toLowerCase().includes(`${sLower}::${mLower}`) ||
          sym.qualifiedName.toLowerCase().includes(`${sLower}.${mLower}`);

        if ((matchesParent && matchesName) || matchesQualified) {
          results.push(sym);
        }
      }
    }

    return results;
  }

  /**
   * Finds structs or classes implementing a trait or interface.
   */
  public findImplementations(traitOrInterface: string): SymbolNode[] {
    const tLower = traitOrInterface.toLowerCase();
    const implementers = this.implementationGraph.get(tLower);
    if (!implementers) return [];

    const results: SymbolNode[] = [];
    for (const typeName of implementers) {
      const syms = this.nameIndex.get(typeName.toLowerCase());
      if (syms) {
        results.push(...syms);
      }
    }
    return results;
  }

  /**
   * Finds callers of a given function or method.
   */
  public findCallers(functionName: string): SymbolNode[] {
    const fLower = functionName.toLowerCase();
    const callerIds = this.callersGraph.get(fLower);
    if (!callerIds) return [];

    const results: SymbolNode[] = [];
    for (const id of callerIds) {
      const sym = this.symbolMap.get(id);
      if (sym) results.push(sym);
    }
    return results;
  }

  /**
   * Finds callees (functions invoked) by a given function.
   */
  public findCallees(functionName: string): string[] {
    const syms = this.findSymbol(functionName, 1);
    if (syms.length === 0) return [];
    const callees = this.calleesGraph.get(syms[0].id);
    return callees ? Array.from(callees) : [];
  }

  /**
   * Finds definitions of a symbol.
   */
  public findDefinitions(symbolName: string): SymbolNode[] {
    const q = symbolName.toLowerCase();
    return (this.nameIndex.get(q) || []).filter(
      (s) => ['function', 'class', 'struct', 'enum', 'trait', 'interface', 'method'].includes(s.kind)
    );
  }

  /**
   * Finds references to a symbol across all files.
   */
  public findReferences(symbolName: string): SymbolNode[] {
    const results: SymbolNode[] = [];
    const q = symbolName.toLowerCase();

    for (const sym of this.symbolMap.values()) {
      if (sym.references.some((r) => r.toLowerCase() === q)) {
        results.push(sym);
      }
    }

    return results;
  }

  /**
   * Finds related symbols via graph traversal (callers, callees, parents, implementers).
   */
  public findRelatedSymbols(symbolName: string, maxDepth = 1): SymbolNode[] {
    const visited = new Set<string>();
    const related: SymbolNode[] = [];

    const rootSyms = this.findSymbol(symbolName, 2);
    if (rootSyms.length === 0) return [];

    for (const root of rootSyms) {
      visited.add(root.id);

      // 1. Parent symbol (e.g. struct/class)
      if (root.parentSymbol) {
        const parents = this.findSymbol(root.parentSymbol, 1);
        for (const p of parents) {
          if (!visited.has(p.id)) {
            visited.add(p.id);
            related.push(p);
          }
        }
      }

      // 2. Callers
      const callers = this.findCallers(root.name);
      for (const c of callers) {
        if (!visited.has(c.id)) {
          visited.add(c.id);
          related.push(c);
        }
      }

      // 3. Implementations if trait/interface
      if (root.kind === 'trait' || root.kind === 'interface') {
        const impls = this.findImplementations(root.name);
        for (const impl of impls) {
          if (!visited.has(impl.id)) {
            visited.add(impl.id);
            related.push(impl);
          }
        }
      }
    }

    return related;
  }

  /**
   * Finds files containing keywords.
   */
  public findFilesContaining(keywords: readonly string[], limit = 5): string[] {
    const scores = new Map<string, number>();

    for (const kw of keywords) {
      const k = kw.toLowerCase();
      for (const [relPath, entry] of this.entries.entries()) {
        let score = scores.get(relPath) || 0;
        const pathLower = relPath.toLowerCase();

        if (pathLower.includes(k)) score += 5;
        for (const exp of entry.exports) {
          if (exp.toLowerCase().includes(k)) score += 3;
        }
        for (const sym of entry.symbols) {
          if (sym.name.toLowerCase().includes(k)) score += 2;
        }

        if (score > 0) {
          scores.set(relPath, score);
        }
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((entry) => entry[0]);
  }

  /**
   * Computes token savings for extracting a specific symbol slice vs loading full file.
   */
  public calculateSymbolSavings(filePath: string, symbol: SymbolNode): SymbolTokenMetrics {
    const fullPath = path.join(this.projectRoot, filePath);
    let fullText = '';
    try {
      fullText = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      // Fallback
    }

    const fullFileTokens = Math.ceil(fullText.length / 4);
    const lines = fullText.split('\n');
    const symbolSlice = lines.slice(Math.max(0, symbol.startLine - 1), symbol.endLine + 1).join('\n');
    const symbolTokens = Math.ceil(symbolSlice.length / 4);
    const tokensSaved = Math.max(0, fullFileTokens - symbolTokens);
    const reductionPercent = fullFileTokens > 0
      ? Math.round((tokensSaved / fullFileTokens) * 1000) / 10
      : 0;

    return {
      filePath,
      symbolName: symbol.name,
      fullFileTokens,
      symbolTokens,
      tokensSaved,
      reductionPercent,
    };
  }

  public getStats(): AstIndexStats {
    let totalSymbols = 0;
    let totalRelationships = 0;
    const languages: Record<string, number> = {};

    for (const entry of this.entries.values()) {
      totalSymbols += entry.symbols.length;
      totalRelationships += entry.relationships.length;
      languages[entry.language] = (languages[entry.language] || 0) + 1;
    }

    return {
      totalFiles: this.entries.size,
      totalSymbols,
      totalRelationships,
      languages,
      lastIndexedAt: new Date().toISOString(),
    };
  }

  public getAllSymbols(): SymbolNode[] {
    return Array.from(this.symbolMap.values());
  }

  public getAllRelationships(): AstRelationship[] {
    const rels: AstRelationship[] = [];
    for (const entry of this.entries.values()) {
      rels.push(...entry.relationships);
    }
    return rels;
  }

  private clearGraphs(): void {
    this.symbolMap.clear();
    this.nameIndex.clear();
    this.callersGraph.clear();
    this.calleesGraph.clear();
    this.implementationGraph.clear();
    this.inheritanceGraph.clear();
  }

  private rebuildInternalGraphs(): void {
    this.clearGraphs();

    for (const entry of this.entries.values()) {
      for (const sym of entry.symbols) {
        this.symbolMap.set(sym.id, sym);

        const nameLower = sym.name.toLowerCase();
        const list = this.nameIndex.get(nameLower) || [];
        list.push(sym);
        this.nameIndex.set(nameLower, list);
      }

      for (const rel of entry.relationships) {
        if (rel.kind === 'calls') {
          // targetId is called function name
          const targetLower = rel.targetId.toLowerCase();
          const callers = this.callersGraph.get(targetLower) || new Set();
          callers.add(rel.sourceId);
          this.callersGraph.set(targetLower, callers);

          const callees = this.calleesGraph.get(rel.sourceId) || new Set();
          callees.add(rel.targetId);
          this.calleesGraph.set(rel.sourceId, callees);
        } else if (rel.kind === 'implements') {
          const traitLower = rel.targetId.toLowerCase();
          const implementers = this.implementationGraph.get(traitLower) || new Set();
          implementers.add(rel.sourceId);
          this.implementationGraph.set(traitLower, implementers);
        } else if (rel.kind === 'inherits') {
          const baseLower = rel.targetId.toLowerCase();
          const derived = this.inheritanceGraph.get(baseLower) || new Set();
          derived.add(rel.sourceId);
          this.inheritanceGraph.set(baseLower, derived);
        }
      }
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
}
