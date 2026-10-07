/**
 * GSD-X Context Compiler Types
 */

import { MemoryResult } from '../memory/types';
import { SymbolInfo } from './code-index';
import { ContextCompilationRecord } from './inspector/types';

export type ContextPriority = 'required' | 'important' | 'optional' | 'redundant';

export interface ContextItem {
  id: string;
  sourcePath: string;
  content: string;
  priority: ContextPriority;
  category: 'planning' | 'architecture' | 'convention' | 'code' | 'test' | 'memory' | 'instruction';
  estimatedTokens: number;
  reason: string;
}

export interface CodeContext {
  filePath: string;
  symbol?: string;
  kind?: string;
  startLine?: number;
  endLine?: number;
  content: string;
  estimatedTokens: number;
  relevanceReason: string;
  originalTokens?: number;
  tokensSaved?: number;
}

export interface ContextOmission {
  source: string;
  reason: string;
  priority: ContextPriority;
  estimatedTokens: number;
}

export interface ContextManifestSource {
  path: string;
  reason: string;
  priority: ContextPriority;
  tokens: number;
}

export interface ContextManifestMemory {
  id: string;
  reason: string;
  authority: string;
  tokens: number;
}

export interface ContextManifestCode {
  filePath: string;
  symbol?: string;
  tokens: number;
}

export interface ContextManifest {
  task: string;
  taskCategory: string;
  budget: number;
  estimatedTokens: number;
  sources: ContextManifestSource[];
  memories: ContextManifestMemory[];
  code: ContextManifestCode[];
  omitted: ContextOmission[];
  deduplicatedCount: number;
  deduplicatedTokensSaved: number;
  compiledAt: string;
}

export interface CompiledContext {
  budget: number;
  task: string;
  requiredArtifacts: ContextItem[];
  memories: MemoryResult[];
  codeContext: CodeContext[];
  instructions: string[];
  omittedItems: ContextOmission[];
  estimatedTokens: number;
  manifest: ContextManifest;
  formattedBrief: string;
  record?: ContextCompilationRecord;
}

export interface CompileOptions {
  task: string;
  projectDir: string;
  projectId?: string;
  phaseId?: string;
  agentRole?: string;
  modelContextLimit?: number;
  requestedBudget?: number;
  includeCodeIndex?: boolean;
  includeMemory?: boolean;
}
