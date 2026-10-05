/**
 * GSD-X Safe Context Compressor
 *
 * Compresses historical context, summaries, and code outlines while
 * protecting exact source code for the immediate task.
 */

import { estimateTokenCount } from '../memory/rerank';

export interface CompressedSection {
  title: string;
  originalTokens: number;
  compressedTokens: number;
  content: string;
}

/**
 * Compresses historical SUMMARY.md markdown text into concise achievement bullets.
 */
export function compressHistoricalSummary(summaryContent: string, phaseOrPlanName: string): CompressedSection {
  const originalTokens = estimateTokenCount(summaryContent);
  const lines = summaryContent.split('\n');

  let oneLiner = '';
  const keyDecisions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!oneLiner && (trimmed.startsWith('One-line summary:') || trimmed.startsWith('## Objective'))) {
      oneLiner = trimmed.replace(/^One-line summary:\s*|^## Objective\s*/, '');
    }
    if (trimmed.startsWith('- ') && trimmed.toLowerCase().includes('decision')) {
      keyDecisions.push(trimmed);
    }
  }

  const resultLines: string[] = [];
  resultLines.push(`• **${phaseOrPlanName}**: ${oneLiner || 'Completed tasks as planned'}`);
  if (keyDecisions.length > 0) {
    resultLines.push(`  - Key decisions: ${keyDecisions.slice(0, 2).join('; ')}`);
  }

  const content = resultLines.join('\n');
  const compressedTokens = estimateTokenCount(content);

  return {
    title: phaseOrPlanName,
    originalTokens,
    compressedTokens,
    content,
  };
}

/**
 * Compresses a source code file into a signature outline (classes, functions, interfaces, exports)
 * when the agent only needs structural awareness rather than implementation details.
 */
export function compressCodeToOutline(filePath: string, codeContent: string): CompressedSection {
  const originalTokens = estimateTokenCount(codeContent);
  const lines = codeContent.split('\n');
  const outlineLines: string[] = [];

  outlineLines.push(`// Outline: ${filePath}`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match class, interface, type, function, export declarations
    if (
      /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/.test(trimmed) ||
      /^(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/.test(trimmed) ||
      /^(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/.test(trimmed) ||
      /^(?:export\s+)?type\s+([a-zA-Z0-9_$]+)/.test(trimmed) ||
      /^(?:public|protected|private)\s+(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(/.test(trimmed) ||
      /^(?:export\s+const\s+[a-zA-Z0-9_$]+)/.test(trimmed)
    ) {
      // Clean up body opener
      const cleanHeader = line.replace(/\{[\s\S]*$/, '').trimEnd();
      outlineLines.push(`  ${cleanHeader};`);
    }
  }

  const content = outlineLines.join('\n');
  const compressedTokens = estimateTokenCount(content);

  return {
    title: filePath,
    originalTokens,
    compressedTokens,
    content,
  };
}
