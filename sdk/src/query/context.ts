/**
 * GSD-X Context Query Handlers
 */

import { ContextCompiler } from '../context/compiler';
import { formatContextStats } from '../context/manifest';
import * as path from 'path';

export class ContextQueryHandler {
  private projectDir: string;
  private compiler: ContextCompiler;

  constructor(projectDir: string) {
    this.projectDir = path.resolve(projectDir);
    this.compiler = new ContextCompiler(this.projectDir);
  }

  public async compile(task: string, phaseId?: string, agentRole?: string): Promise<string> {
    const result = await this.compiler.compile({
      task,
      projectDir: this.projectDir,
      phaseId,
      agentRole,
    });

    return result.formattedBrief;
  }

  public async stats(task = 'General development task'): Promise<string> {
    const result = await this.compiler.compile({
      task,
      projectDir: this.projectDir,
    });

    return formatContextStats(result.manifest);
  }
}
