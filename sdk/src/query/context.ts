/**
 * GSD-X Context Query Handlers
 */

import { ContextCompiler } from '../context/compiler';
import { formatContextStats } from '../context/manifest';
import { ContextCompilationRecord } from '../context/inspector/types';
import { generateInspectorHtml } from '../context/inspector/html-generator';
import { CompilationTelemetryRecorder } from '../context/inspector/recorder';
import { ContextInspectorServer } from '../context/inspector/server';
import * as path from 'path';

export class ContextQueryHandler {
  private projectDir: string;
  private compiler: ContextCompiler;
  private recorder: CompilationTelemetryRecorder;

  constructor(projectDir: string) {
    this.projectDir = path.resolve(projectDir);
    this.compiler = new ContextCompiler(this.projectDir);
    this.recorder = new CompilationTelemetryRecorder(this.projectDir);
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

  public async inspect(task = 'General development task'): Promise<{ record: ContextCompilationRecord; html: string }> {
    const result = await this.compiler.compile({
      task,
      projectDir: this.projectDir,
    });

    const record = result.record || (await this.recorder.getLatest())!;
    const html = generateInspectorHtml(record);

    return { record, html };
  }

  public async getLatestRecord(): Promise<ContextCompilationRecord | null> {
    return this.recorder.getLatest();
  }

  public async startServer(port = 8765): Promise<{ port: number; url: string; close: () => Promise<void> }> {
    const server = new ContextInspectorServer(this.projectDir);
    return server.start(port);
  }
}
