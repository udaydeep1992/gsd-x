/**
 * GSD-X Tree-sitter AST Structural Intelligence Types
 *
 * Defines language-independent symbol models, structural relationship graphs,
 * query contracts, and AST index statistics.
 */

export type SymbolKind =
  | 'function'
  | 'method'
  | 'class'
  | 'struct'
  | 'enum'
  | 'trait'
  | 'interface'
  | 'impl'
  | 'module'
  | 'namespace'
  | 'constant'
  | 'variable'
  | 'type'
  | 'macro'
  | 'constructor'
  | 'field'
  | 'property';

export type AstLanguage =
  | 'rust'
  | 'go'
  | 'cpp'
  | 'c'
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'unknown';

export type Visibility = 'public' | 'private' | 'protected' | 'internal';

export interface SymbolNode {
  id: string; // filePath:qualifiedName:startLine
  name: string;
  qualifiedName: string;
  kind: SymbolKind;
  language: AstLanguage;
  filePath: string;
  startLine: number;
  endLine: number;
  startByte: number;
  endByte: number;
  signature: string;
  parentSymbol?: string;
  namespace?: string;
  visibility: Visibility;
  documentation?: string;
  imports: string[];
  references: string[];
  dependencies: string[];
  hash: string; // SHA-256 of symbol slice
}

export type RelationshipKind =
  | 'calls'
  | 'belongs_to'
  | 'inherits'
  | 'implements'
  | 'contains'
  | 'imports'
  | 'references';

export interface AstRelationship {
  sourceId: string;
  targetId: string;
  kind: RelationshipKind;
  metadata?: Record<string, unknown>;
}

export interface AstParseResult {
  symbols: SymbolNode[];
  relationships: AstRelationship[];
  imports: string[];
  references: string[];
  errors: string[];
}

export interface SymbolQuery {
  name?: string;
  qualifiedName?: string;
  kind?: SymbolKind | SymbolKind[];
  language?: AstLanguage;
  filePath?: string;
  limit?: number;
}

export interface AstFileIndexEntry {
  filePath: string;
  mtime: number;
  hash: string;
  language: AstLanguage;
  symbols: SymbolNode[];
  relationships: AstRelationship[];
  imports: string[];
  exports: string[];
}

export interface AstIndexStats {
  totalFiles: number;
  totalSymbols: number;
  totalRelationships: number;
  languages: Record<string, number>;
  lastIndexedAt: string;
}

export interface SymbolTokenMetrics {
  filePath: string;
  symbolName: string;
  fullFileTokens: number;
  symbolTokens: number;
  tokensSaved: number;
  reductionPercent: number;
}
