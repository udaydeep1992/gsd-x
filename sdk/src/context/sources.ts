/**
 * GSD-X Context Sources Loader
 *
 * Discovers and loads candidate planning, architecture, and codebase artifacts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContextItem, ContextPriority } from './types';
import { estimateTokenCount } from '../memory/rerank';

export class SourceArtifactLoader {
  private projectRoot: string;
  private planningDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.planningDir = path.join(this.projectRoot, '.planning');
  }

  /**
   * Loads core project planning artifacts.
   */
  public loadProjectArtifacts(): ContextItem[] {
    const items: ContextItem[] = [];

    const coreFiles: Array<{ name: string; priority: ContextPriority; category: ContextItem['category'] }> = [
      { name: 'PROJECT.md', priority: 'required', category: 'planning' },
      { name: 'STATE.md', priority: 'required', category: 'planning' },
      { name: 'ROADMAP.md', priority: 'important', category: 'planning' },
      { name: 'REQUIREMENTS.md', priority: 'important', category: 'planning' },
    ];

    for (const f of coreFiles) {
      const p = path.join(this.planningDir, f.name);
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          items.push({
            id: `plan-${f.name.toLowerCase().replace('.md', '')}`,
            sourcePath: `.planning/${f.name}`,
            content,
            priority: f.priority,
            category: f.category,
            estimatedTokens: estimateTokenCount(content),
            reason: `Core planning artifact: ${f.name}`,
          });
        } catch {
          // ignore read failure
        }
      }
    }

    return items;
  }

  /**
   * Loads codebase map artifacts (.planning/codebase/*.md).
   */
  public loadCodebaseMapArtifacts(): ContextItem[] {
    const items: ContextItem[] = [];
    const codebaseDir = path.join(this.planningDir, 'codebase');
    if (!fs.existsSync(codebaseDir)) return items;

    const mapFiles = ['ARCHITECTURE.md', 'STACK.md', 'CONVENTIONS.md', 'STRUCTURE.md'];
    for (const file of mapFiles) {
      const fullPath = path.join(codebaseDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          items.push({
            id: `map-${file.toLowerCase().replace('.md', '')}`,
            sourcePath: `.planning/codebase/${file}`,
            content,
            priority: 'important',
            category: file.includes('CONVENTIONS') ? 'convention' : 'architecture',
            estimatedTokens: estimateTokenCount(content),
            reason: `Codebase intelligence map: ${file}`,
          });
        } catch {
          // ignore
        }
      }
    }

    return items;
  }

  /**
   * Loads phase-specific artifacts (PLAN.md, RESEARCH.md, CONTEXT.md, prior summaries).
   */
  public loadPhaseArtifacts(phaseId: string): ContextItem[] {
    const items: ContextItem[] = [];
    const phasesBase = path.join(this.planningDir, 'phases');
    if (!fs.existsSync(phasesBase)) return items;

    let phaseDir: string | null = null;
    const dirs = fs.readdirSync(phasesBase);
    for (const d of dirs) {
      if (d === phaseId || d.startsWith(`${phaseId}-`) || d.endsWith(`-${phaseId}`)) {
        phaseDir = path.join(phasesBase, d);
        break;
      }
    }

    if (!phaseDir || !fs.existsSync(phaseDir)) return items;

    const files = fs.readdirSync(phaseDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullPath = path.join(phaseDir, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const isPlan = file.includes('PLAN');
          const isResearch = file.includes('RESEARCH');
          const isSummary = file.includes('SUMMARY');

          items.push({
            id: `phase-${file.toLowerCase().replace('.md', '')}`,
            sourcePath: path.relative(this.projectRoot, fullPath).replace(/\\/g, '/'),
            content,
            priority: isPlan ? 'required' : isResearch ? 'important' : 'optional',
            category: 'planning',
            estimatedTokens: estimateTokenCount(content),
            reason: isPlan ? 'Active phase execution plan' : isResearch ? 'Phase research findings' : 'Phase context',
          });
        } catch {
          // ignore
        }
      }
    }

    return items;
  }
}
