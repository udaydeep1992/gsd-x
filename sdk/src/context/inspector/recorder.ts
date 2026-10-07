/**
 * GSD-X Compilation Telemetry Recorder
 *
 * Persists context compilation records locally in .gsd/inspector/ for observability
 * and interactive inspection. Local-first, zero cloud exfiltration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContextCompilationRecord } from './types';
import { writeFileAtomic } from '../atomic-file';

export class CompilationTelemetryRecorder {
  private projectRoot: string;
  private inspectorDir: string;
  private latestPath: string;
  private historyPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.inspectorDir = path.join(this.projectRoot, '.gsd', 'inspector');
    this.latestPath = path.join(this.inspectorDir, 'latest.json');
    this.historyPath = path.join(this.inspectorDir, 'history.jsonl');
  }

  public async recordCompilation(record: ContextCompilationRecord): Promise<void> {
    try {
      fs.mkdirSync(this.inspectorDir, { recursive: true });

      // 1. Write latest.json
      writeFileAtomic(this.latestPath, JSON.stringify(record, null, 2), 'utf8');

      // Keep a bounded history snapshot and replace it atomically. Skip
      // malformed lines individually so one damaged row does not erase all history.
      const lines = this.readValidHistoryLines();
      lines.push(JSON.stringify(record));
      writeFileAtomic(this.historyPath, `${lines.slice(-50).join('\n')}\n`, 'utf8');
    } catch {
      // Graceful error ignore - telemetry recording should never fail agent workflow
    }
  }

  public async record(record: ContextCompilationRecord): Promise<void> {
    return this.recordCompilation(record);
  }

  public async getLatest(): Promise<ContextCompilationRecord | null> {
    if (fs.existsSync(this.latestPath)) {
      try {
        const raw = fs.readFileSync(this.latestPath, 'utf-8');
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  public async getHistory(limit = 20): Promise<ContextCompilationRecord[]> {
    if (!fs.existsSync(this.historyPath)) return [];
    try {
      const lines = this.readValidHistoryLines();
      const records: ContextCompilationRecord[] = [];
      for (const line of lines.slice(-limit).reverse()) {
        records.push(JSON.parse(line));
      }
      return records;
    } catch {
      return [];
    }
  }

  public async getRecord(requestId: string): Promise<ContextCompilationRecord | null> {
    const history = await this.getHistory(50);
    return history.find((r) => r.requestId === requestId || (r as any).id === requestId) || null;
  }

  public async getById(id: string): Promise<ContextCompilationRecord | null> {
    return this.getRecord(id);
  }

  private readValidHistoryLines(): string[] {
    if (!fs.existsSync(this.historyPath)) return [];
    try {
      return fs.readFileSync(this.historyPath, 'utf8').split(/\r?\n/).filter((line) => {
        if (!line.trim()) return false;
        try { JSON.parse(line); return true; } catch { return false; }
      });
    } catch {
      return [];
    }
  }
}
