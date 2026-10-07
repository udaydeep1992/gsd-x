/**
 * GSD-X Visual Context Inspector HTML Generator
 *
 * Generates an offline, standalone, dark luxury web UI for Antigravity
 * based on the codee-dashboard-ui design system, visualizing context compilation,
 * token flow tracing, retrieval explanations ("Why selected?"),
 * rejected candidate logs, and interactive side-by-side context diffs.
 */

import { ContextCompilationRecord } from './types';

export function generateInspectorHtml(record: ContextCompilationRecord): string {
  const jsonRecord = JSON.stringify(record).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GSD-X Visual Context Inspector</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-canvas: radial-gradient(circle at top center, #0f172a 0%, #030712 100%);
      --surface-card: rgba(15, 23, 42, 0.65);
      --surface-elevated: rgba(30, 41, 59, 0.75);
      --surface-well: rgba(3, 7, 18, 0.85);
      --border-card: rgba(51, 65, 85, 0.45);
      --border-bright: rgba(56, 189, 248, 0.5);
      --text-white: #ffffff;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-cyan: #38bdf8;
      --accent-emerald: #10b981;
      --accent-purple: #c084fc;
      --accent-amber: #fbbf24;
      --accent-rose: #f43f5e;
      --glow-emerald: 0 0 35px -5px rgba(16, 185, 129, 0.2);
      --glow-cyan: 0 0 35px -5px rgba(6, 182, 212, 0.2);
      --glow-purple: 0 0 30px -5px rgba(168, 85, 247, 0.25);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #030712;
      background: var(--bg-canvas);
      color: var(--text-primary);
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      padding: 28px 24px 60px 24px;
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }

    /* Ambient Glowing Atmosphere Orbs */
    .ambient-orb {
      position: absolute;
      border-radius: 9999px;
      pointer-events: none;
      z-index: 0;
      opacity: 0.6;
    }
    .orb-cyan {
      width: 500px;
      height: 500px;
      top: -120px;
      left: 10%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 70%);
      filter: blur(120px);
    }
    .orb-emerald {
      width: 450px;
      height: 450px;
      top: 60px;
      right: 5%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.10) 0%, rgba(16, 185, 129, 0) 70%);
      filter: blur(130px);
    }
    .orb-purple {
      width: 400px;
      height: 400px;
      top: 400px;
      left: 30%;
      background: radial-gradient(circle, rgba(192, 132, 252, 0.08) 0%, rgba(192, 132, 252, 0) 70%);
      filter: blur(140px);
    }

    .container { max-width: 1440px; margin: 0 auto; position: relative; z-index: 1; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      backdrop-filter: blur(20px);
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 22px 28px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    .header-left { flex: 1; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .badge-brand {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(192, 132, 252, 0.15));
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: var(--accent-cyan);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      padding: 5px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 9999px;
      background-color: var(--accent-emerald);
      box-shadow: 0 0 10px var(--accent-emerald);
      display: inline-block;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .task-title {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
      margin-top: 4px;
    }
    .meta-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .meta-chip {
      background: rgba(30, 41, 59, 0.6);
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid rgba(51, 65, 85, 0.6);
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .btn-action {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid var(--border-card);
      color: var(--text-primary);
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: rgba(51, 65, 85, 0.9);
      border-color: var(--border-bright);
      color: #fff;
    }

    /* KPI Metrics Bar */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      backdrop-filter: blur(16px);
      background: var(--surface-card);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 20px 22px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-bright);
    }
    .kpi-label {
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .kpi-value {
      font-size: 30px;
      font-weight: 800;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -1px;
    }
    .kpi-sub { font-size: 12px; margin-top: 6px; font-weight: 500; }
    .sub-green { color: var(--accent-emerald); }
    .sub-cyan { color: var(--accent-cyan); }
    .sub-purple { color: var(--accent-purple); }

    /* Section Cards */
    .section-card {
      backdrop-filter: blur(16px);
      background: var(--surface-card);
      border: 1px solid var(--border-card);
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.4);
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-white);
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* 5-Stage Pipeline Flow */
    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 12px;
    }
    .stage-item {
      background: var(--surface-well);
      border: 1px solid var(--border-card);
      border-radius: 12px;
      padding: 16px;
      position: relative;
      transition: all 0.2s;
    }
    .stage-item:hover {
      border-color: rgba(56, 189, 248, 0.4);
      box-shadow: var(--glow-cyan);
    }
    .stage-name {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-cyan);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stage-tokens {
      font-size: 22px;
      font-weight: 700;
      margin: 8px 0;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
    }
    .stage-reduction {
      font-size: 12px;
      color: var(--accent-emerald);
      font-weight: 600;
    }
    .stage-time {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Sources Progress Bar */
    .source-bar-wrapper {
      display: flex;
      height: 14px;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      background: var(--surface-well);
      border: 1px solid var(--border-card);
    }
    .source-segment { height: 100%; transition: width 0.3s; }
    .source-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 13px;
    }
    .legend-item { display: flex; align-items: center; gap: 8px; font-weight: 500; }
    .legend-dot { width: 10px; height: 10px; border-radius: 3px; }

    /* Tabs */
    .tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border-card);
      margin-bottom: 20px;
      padding-bottom: 4px;
    }
    .tab-btn {
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      color: var(--text-secondary);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 18px;
      cursor: pointer;
      border-radius: 6px 6px 0 0;
      transition: all 0.2s;
    }
    .tab-btn:hover { color: #fff; background: rgba(30, 41, 59, 0.4); }
    .tab-btn.active {
      color: var(--accent-cyan);
      border-bottom-color: var(--accent-cyan);
      background: rgba(56, 189, 248, 0.08);
    }

    /* Filter Chips */
    .filter-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .filter-chip {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border-card);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-chip:hover, .filter-chip.active {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.4);
      color: var(--accent-cyan);
    }

    /* Artifacts View */
    .artifact-card {
      background: var(--surface-card);
      border: 1px solid var(--border-card);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 14px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .artifact-card:hover {
      border-color: var(--border-bright);
      transform: translateY(-1px);
    }
    .artifact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .artifact-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }
    .artifact-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
    }
    .badge-code, .badge-ast { background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.35); }
    .badge-memory { background: rgba(192, 132, 252, 0.15); color: var(--accent-purple); border: 1px solid rgba(192, 132, 252, 0.35); }
    .badge-planning { background: rgba(251, 191, 36, 0.15); color: var(--accent-amber); border: 1px solid rgba(251, 191, 36, 0.35); }
    .badge-heuristic { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.35); }
    
    .reasons-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }
    .reason-pill {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--accent-emerald);
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 6px;
    }
    pre.code-preview {
      background: var(--surface-well);
      border: 1px solid var(--border-card);
      border-radius: 8px;
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      color: #e2e8f0;
      overflow-x: auto;
      max-height: 280px;
      margin-top: 10px;
      line-height: 1.6;
    }

    /* Rejected View */
    .rejected-card {
      background: var(--surface-card);
      border: 1px solid rgba(244, 63, 94, 0.25);
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .rejected-path { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #fff; font-weight: 600; }
    .rejected-reason { color: var(--accent-rose); font-size: 12.5px; font-weight: 600; }

    /* Diff View */
    .diff-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    @media (max-width: 900px) {
      .diff-container { grid-template-columns: 1fr; }
    }
    .diff-pane-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .hidden { display: none; }
  </style>
</head>
<body>
  <!-- Ambient Atmosphere Blur Orbs -->
  <div class="ambient-orb orb-cyan"></div>
  <div class="ambient-orb orb-emerald"></div>
  <div class="ambient-orb orb-purple"></div>

  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <span class="badge-brand"><span class="status-dot"></span> GSD-X Visual Context Inspector</span>
        <h1 class="task-title" id="taskDisplay">${escapeHtml(record.task)}</h1>
        <div class="meta-tags">
          <span class="meta-chip">Model: <strong>${escapeHtml(record.model)}</strong></span>
          <span class="meta-chip">Request ID: <code style="color: var(--accent-cyan);">${escapeHtml(record.requestId)}</code></span>
          <span class="meta-chip">Timestamp: ${escapeHtml(record.timestamp)}</span>
          <span class="meta-chip" style="color: var(--accent-emerald);">● 127.0.0.1:8765</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-action" onclick="exportJson()">Export JSON</button>
        <button class="btn-action" onclick="window.print()">Print / PDF</button>
      </div>
    </header>

    <!-- Top KPI Bar -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Context Budget</div>
        <div class="kpi-value">${record.contextBudget.toLocaleString()}</div>
        <div class="kpi-sub sub-cyan">Allocated limit</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Raw Candidate Tokens</div>
        <div class="kpi-value">${record.originalTokens.toLocaleString()}</div>
        <div class="kpi-sub">Total discovered</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Compiled Context</div>
        <div class="kpi-value">${record.finalTokens.toLocaleString()}</div>
        <div class="kpi-sub sub-purple">${((record.finalTokens / Math.max(1, record.contextBudget)) * 100).toFixed(1)}% of budget</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tokens Saved</div>
        <div class="kpi-value">${record.tokensSaved.toLocaleString()}</div>
        <div class="kpi-sub sub-green">▲ ${record.reductionPercent.toFixed(1)}% reduction</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pipeline Latency</div>
        <div class="kpi-value">${record.totalLatencyMs}ms</div>
        <div class="kpi-sub">Retrieval: ${record.retrievalLatencyMs}ms | Compiler: ${record.compilationLatencyMs}ms</div>
      </div>
    </div>

    <!-- Pipeline Stage Flow -->
    <div class="section-card">
      <div class="section-title">
        <span>Deterministic Token Optimization Pipeline</span>
        <span style="font-size: 12px; color: var(--accent-emerald);">5 Sequential Stages</span>
      </div>
      <div class="pipeline-grid">
        ${record.stages.map((s, idx) => `
          <div class="stage-item">
            <div class="stage-name">Stage ${idx + 1}: ${escapeHtml(s.displayName)}</div>
            <div class="stage-tokens">${s.outputTokens.toLocaleString()} <span style="font-size: 11px; color: var(--text-muted);">tokens</span></div>
            <div class="stage-reduction">${s.removedTokens > 0 ? `-${s.removedTokens.toLocaleString()} (${s.reductionPercent.toFixed(1)}%)` : 'Baseline'}</div>
            <div class="stage-time">${s.durationMs}ms duration</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Context Sources Distribution -->
    <div class="section-card">
      <div class="section-title">Context Sources Distribution</div>
      <div class="source-bar-wrapper">
        <div class="source-segment" style="width: ${record.sourceBreakdown.codePercentage}%; background-color: var(--accent-cyan);" title="Code: ${record.sourceBreakdown.codeTokens} tokens"></div>
        <div class="source-segment" style="width: ${record.sourceBreakdown.memoryPercentage}%; background-color: var(--accent-purple);" title="Memory: ${record.sourceBreakdown.memoryTokens} tokens"></div>
        <div class="source-segment" style="width: ${record.sourceBreakdown.astPercentage}%; background-color: var(--accent-emerald);" title="AST: ${record.sourceBreakdown.astTokens} tokens"></div>
        <div class="source-segment" style="width: ${record.sourceBreakdown.planningPercentage}%; background-color: var(--accent-amber);" title="Planning: ${record.sourceBreakdown.planningTokens} tokens"></div>
      </div>
      <div class="source-legend">
        <div class="legend-item"><div class="legend-dot" style="background: var(--accent-cyan);"></div> Code Symbols (${record.sourceBreakdown.codeTokens.toLocaleString()} tokens - ${record.sourceBreakdown.codePercentage.toFixed(1)}%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--accent-purple);"></div> Semantic Memory (${record.sourceBreakdown.memoryTokens.toLocaleString()} tokens - ${record.sourceBreakdown.memoryPercentage.toFixed(1)}%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--accent-emerald);"></div> AST Slices (${record.sourceBreakdown.astTokens.toLocaleString()} tokens - ${record.sourceBreakdown.astPercentage.toFixed(1)}%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--accent-amber);"></div> Planning Specs (${record.sourceBreakdown.planningTokens.toLocaleString()} tokens - ${record.sourceBreakdown.planningPercentage.toFixed(1)}%)</div>
      </div>
    </div>

    <!-- Tabbed Exploration Views -->
    <nav class="tabs-nav">
      <button class="tab-btn active" id="btn-tab-artifacts" onclick="switchTab('tab-artifacts')">Retrieved Artifacts (${record.selectedArtifacts.length})</button>
      <button class="tab-btn" id="btn-tab-rejected" onclick="switchTab('tab-rejected')">Rejected Candidates (${record.rejectedArtifacts.length})</button>
      <button class="tab-btn" id="btn-tab-diff" onclick="switchTab('tab-diff')">Context Diff View</button>
      <button class="tab-btn" id="btn-tab-decisions" onclick="switchTab('tab-decisions')">Compiler Decisions</button>
    </nav>

    <!-- Tab 1: Retrieved Artifacts -->
    <div id="tab-artifacts">
      <div class="filter-bar">
        <button class="filter-chip active" onclick="filterArtifacts('all')">All (${record.selectedArtifacts.length})</button>
        <button class="filter-chip" onclick="filterArtifacts('code')">Code &amp; AST</button>
        <button class="filter-chip" onclick="filterArtifacts('memory')">Memory</button>
        <button class="filter-chip" onclick="filterArtifacts('planning')">Planning</button>
      </div>

      ${record.selectedArtifacts.map((a, idx) => `
        <div class="artifact-card" data-source="${a.sourceType}">
          <div class="artifact-header">
            <span class="artifact-path">${escapeHtml(a.filePath)}${a.symbolName ? ` &gt; ${escapeHtml(a.symbolName)}` : ''}</span>
            <div>
              <span class="artifact-badge badge-${a.sourceType}">${a.sourceType}</span>
              <span style="font-size: 12px; margin-left: 8px; color: var(--text-muted);">${a.selectedTokens} tokens (saved ${a.tokensSaved})</span>
              <button class="btn-action" style="padding: 3px 10px; font-size: 11px; margin-left: 10px;" onclick="inspectArtifactDiff(${idx})">Inspect Diff</button>
            </div>
          </div>
          <div class="reasons-list">
            ${a.reasons.map((r) => `<span class="reason-pill">✓ ${escapeHtml(r)}</span>`).join('')}
          </div>
          <pre class="code-preview">${escapeHtml(a.selectedSnippet)}</pre>
        </div>
      `).join('')}
    </div>

    <!-- Tab 2: Rejected Context -->
    <div id="tab-rejected" class="hidden">
      ${record.rejectedArtifacts.length === 0 ? '<p style="color: var(--text-muted); padding: 20px;">No candidates were rejected for this compilation.</p>' : ''}
      ${record.rejectedArtifacts.map((r) => `
        <div class="rejected-card">
          <div>
            <span class="rejected-path">${escapeHtml(r.sourcePath)}${r.symbolName ? ` &gt; ${escapeHtml(r.symbolName)}` : ''}</span>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(${r.estimatedTokens} tokens prevented)</span>
          </div>
          <div class="rejected-reason">✗ ${escapeHtml(r.rejectionReason)}</div>
        </div>
      `).join('')}
    </div>

    <!-- Tab 3: Context Diff View -->
    <div id="tab-diff" class="hidden">
      <div style="margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">Active Artifact Diff:</span>
        <select id="diffSelector" onchange="renderDiff(parseInt(this.value, 10))" style="background: rgba(30, 41, 59, 0.8); color: #fff; border: 1px solid var(--border-card); padding: 6px 12px; border-radius: 8px; font-family: monospace; font-size: 12px;">
          ${record.selectedArtifacts.map((a, i) => `<option value="${i}">${escapeHtml(a.filePath)}${a.symbolName ? ` (${escapeHtml(a.symbolName)})` : ''}</option>`).join('')}
        </select>
      </div>
      <div class="diff-container">
        <div>
          <div class="diff-pane-title">Full Candidate File (Raw)</div>
          <pre id="diffRawPane" class="code-preview" style="max-height: 440px;">${escapeHtml(record.selectedArtifacts[0]?.originalSnippet || '// Original file representation (full content omitted for brevity)')}</pre>
        </div>
        <div>
          <div class="diff-pane-title">Compiled Symbol Slice (Extracted)</div>
          <pre id="diffSlicePane" class="code-preview" style="max-height: 440px;">${escapeHtml(record.selectedArtifacts[0]?.selectedSnippet || '// Selected symbol slice')}</pre>
        </div>
      </div>
    </div>

    <!-- Tab 4: Compiler Decisions -->
    <div id="tab-decisions" class="hidden">
      <div class="section-card">
        <ul style="padding-left: 20px; color: var(--text-secondary); font-size: 14px; line-height: 1.8;">
          ${record.compilerDecisions.map((d) => `<li style="margin-bottom: 8px;">${escapeHtml(d)}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>

  <script>
    const recordData = ${jsonRecord};

    function switchTab(tabId) {
      document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-' + tabId);
      if (activeBtn) activeBtn.classList.add('active');

      document.getElementById('tab-artifacts').classList.add('hidden');
      document.getElementById('tab-rejected').classList.add('hidden');
      document.getElementById('tab-diff').classList.add('hidden');
      document.getElementById('tab-decisions').classList.add('hidden');

      const target = document.getElementById(tabId);
      if (target) target.classList.remove('hidden');
    }

    function inspectArtifactDiff(index) {
      switchTab('tab-diff');
      const selector = document.getElementById('diffSelector');
      if (selector) {
        selector.value = index;
        renderDiff(index);
      }
    }

    function renderDiff(index) {
      const artifact = recordData.selectedArtifacts[index];
      if (!artifact) return;
      document.getElementById('diffRawPane').textContent = artifact.originalSnippet || '// Full candidate file';
      document.getElementById('diffSlicePane').textContent = artifact.selectedSnippet || '// Compiled slice';
    }

    function filterArtifacts(category) {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');

      document.querySelectorAll('.artifact-card').forEach(card => {
        const source = card.getAttribute('data-source');
        if (category === 'all') {
          card.classList.remove('hidden');
        } else if (category === 'code' && (source === 'code' || source === 'ast')) {
          card.classList.remove('hidden');
        } else if (source === category) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    function exportJson() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recordData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "context-compilation-" + recordData.requestId + ".json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    // Auto-polling when connected to live HTTP server
    if (location.protocol.startsWith('http')) {
      setInterval(async () => {
        try {
          const res = await fetch('/api/latest');
          if (res.ok) {
            const latest = await res.json();
            if (latest.requestId && latest.requestId !== recordData.requestId) {
              location.reload();
            }
          }
        } catch (_) {}
      }, 2500);
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
