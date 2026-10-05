/**
 * GSD-X Task Classifier
 *
 * Classifies tasks into categories (trivial, summarization, research, coding, debugging, architecture, security, verification).
 */

import { TaskCategory } from './types';

export function classifyTaskCategory(task: string, agentRole?: string): TaskCategory {
  const lower = task.toLowerCase();

  // 1. Role-based shortcuts
  if (agentRole) {
    if (agentRole.includes('verifier') || agentRole.includes('auditor-uat')) return 'verification';
    if (agentRole.includes('security')) return 'security';
    if (agentRole.includes('debugger')) return 'debugging';
    if (agentRole.includes('architect') || agentRole.includes('planner')) return 'architecture';
    if (agentRole.includes('researcher')) return 'research';
    if (agentRole.includes('executor')) return 'coding';
  }

  // 2. Security
  if (
    lower.includes('security') ||
    lower.includes('vulnerability') ||
    lower.includes('auth') ||
    lower.includes('permission') ||
    lower.includes('cve') ||
    lower.includes('injection') ||
    lower.includes('secret') ||
    lower.includes('credential') ||
    lower.includes('leak')
  ) {
    return 'security';
  }

  // 3. Verification & Testing
  if (
    lower.includes('verify') ||
    lower.includes('test') ||
    lower.includes('audit') ||
    lower.includes('validate') ||
    lower.includes('check acceptance')
  ) {
    return 'verification';
  }

  // 4. Debugging & Error resolution
  if (
    lower.includes('bug') ||
    lower.includes('fix') ||
    lower.includes('error') ||
    lower.includes('exception') ||
    lower.includes('failing') ||
    lower.includes('debug')
  ) {
    return 'debugging';
  }

  // 5. Architecture & System design
  if (
    lower.includes('architect') ||
    lower.includes('design') ||
    lower.includes('system') ||
    lower.includes('protocol') ||
    lower.includes('database schema') ||
    lower.includes('spec')
  ) {
    return 'architecture';
  }

  // 6. Research & Exploration
  if (
    lower.includes('research') ||
    lower.includes('explore') ||
    lower.includes('compare') ||
    lower.includes('evaluate') ||
    lower.includes('spike')
  ) {
    return 'research';
  }

  // 7. Summarization & Status
  if (
    lower.includes('summarize') ||
    lower.includes('summary') ||
    lower.includes('digest') ||
    lower.includes('report')
  ) {
    return 'summarization';
  }

  // 8. Trivial queries
  if (
    lower.includes('status') ||
    lower.includes('version') ||
    lower.includes('show') ||
    lower.includes('list')
  ) {
    return 'trivial';
  }

  // Default: coding
  return 'coding';
}
