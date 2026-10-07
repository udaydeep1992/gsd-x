/**
 * GSD-X Local Context Inspector Web Server
 *
 * Lightweight, zero-dependency local HTTP server allowing Antigravity users
 * to interactively inspect context compilation records, reasons, and diffs.
 */

import * as http from 'http';
import { CompilationTelemetryRecorder } from './recorder';
import { generateInspectorHtml } from './html-generator';

export class ContextInspectorServer {
  private projectRoot: string;
  private recorder: CompilationTelemetryRecorder;
  private server: http.Server | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.recorder = new CompilationTelemetryRecorder(this.projectRoot);
  }

  public async start(port = 8765): Promise<{ port: number; url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        const url = req.url || '/';

        // Same-origin dashboard requests need no CORS grant. Validate Host to
        // prevent arbitrary hostnames/DNS rebinding from reaching this API.
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        const address = this.server?.address();
        const boundPort = typeof address === 'object' && address ? address.port : port;
        if (!isLoopbackHost(req.headers.host, boundPort)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Forbidden');
          return;
        }

        if (url === '/' || url.startsWith('/?')) {
          const latest = await this.recorder.getLatest();
          if (!latest) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html><html><body style="background:#090d13;color:#94a3b8;font-family:sans-serif;padding:40px;text-align:center;">
              <h2>GSD-X Visual Context Inspector</h2>
              <p>No context compilations recorded yet in this project.</p>
              <p style="font-size:12px;margin-top:10px;">Run <code>gsd-tools context compile --task &lt;task&gt;</code> to compile and inspect.</p>
            </body></html>`);
            return;
          }

          const html = generateInspectorHtml(latest);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }

        if (url === '/api/latest') {
          const latest = await this.recorder.getLatest();
          res.writeHead(latest ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(latest || { error: 'No compilations found' }, null, 2));
          return;
        }

        if (url === '/api/history') {
          const history = await this.recorder.getHistory(50);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ total: history.length, compilations: history }, null, 2));
          return;
        }

        if (url.startsWith('/api/compilation/')) {
          const id = url.replace('/api/compilation/', '');
          const record = await this.recorder.getRecord(id);
          res.writeHead(record ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(record || { error: 'Record not found' }, null, 2));
          return;
        }

        if (url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'gsd-x-context-inspector', runtime: 'antigravity', localOnly: true }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, '127.0.0.1', () => {
        const addr = this.server?.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        const actualUrl = `http://127.0.0.1:${actualPort}`;
        resolve({
          port: actualPort,
          url: actualUrl,
          close: async () => {
            return new Promise((resClose) => {
              if (this.server) {
                this.server.close(() => resClose());
              } else {
                resClose();
              }
            });
          },
        });
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }
}

function isLoopbackHost(hostHeader: string | undefined, expectedPort: number): boolean {
  if (!hostHeader) return false;
  try {
    const parsed = new URL(`http://${hostHeader}`);
    const port = parsed.port ? Number(parsed.port) : 80;
    return !parsed.username && !parsed.password &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname.toLowerCase()) && port === expectedPort;
  } catch {
    return false;
  }
}
