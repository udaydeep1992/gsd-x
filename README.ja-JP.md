<div align="center">

# GSD-X

**よりスマートなメモリとコンテキストエンジンを備えた GSD。**

[English](README.md) · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko-KR.md)

ベンチマーク全体で67.5%の集約トークン削減、個別タスクでは最大83.0%の削減を実現するように再設計されたGSD。スマートメモリ、インテリジェントなコンテキスト圧縮、適応型トークンコンパイル、およびコードインデックスにより、長期運用されるAIコーディングエージェントをより高速かつ高効率に支援します。

[![Maintained by: Codee Studio](https://img.shields.io/badge/Maintained%20by-Codee%20Studio-007acc.svg)](https://www.fiverr.com/codee_studio)
[![Hire on Fiverr](https://img.shields.io/badge/Fiverr-Hire%20Codee%20Studio-1dbf73?logo=fiverr&logoColor=white)](https://www.fiverr.com/codee_studio)
[![Telegram](https://img.shields.io/badge/Telegram-@kblautosignals-2CA5E0?logo=telegram&logoColor=white)](https://t.me/kblautosignals)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%7C%206.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-41%20Passing-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](tests/)
[![Token Savings](https://img.shields.io/badge/Token%20Savings-67.5%25%20Aggregate-blueviolet?style=for-the-badge)](docs/BENCHMARKS.md)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

> [!NOTE]
> **フォークおよび派生についての注記**：GSD-X は [Open GSD Core](https://github.com/open-gsd/gsd-core) の独立したフォークおよびアーキテクチャ進化版であり、オリジナルの GSD / Open GSD メンテナーとの公式な提携や保証関係はありません。アップストリームの `.planning/` ワークフローとの完全な後方互換性を保ちながら、ローカルファーストのメモリとコンテキストインテリジェンス層を追加しています。

---

## コアの課題：コンテキストの肥大化と忘却

従来の素朴な AI コーディングエージェントは、**加算型コンテキストの誤謬（Additive Context Fallacy）**に陥っています：

$$\text{ナイーブなコンテキスト} = \text{システムプロンプト} + \text{会話履歴} + \text{すべての計画文書} + \text{取得された全メモリ} + \text{全ソースコードファイル}$$

このアプローチは以下を招きます：
1. **深刻なトークン非効率**：プロジェクトの進行とともに、コストが 300% 〜 500% 爆発的に増加します。
2. **コンテキストの劣化と忘却**：数千行の無関係な仕様でウィンドウが飽和すると、モデルの注意力が低下します。
3. **指示の矛盾**：過去の古い計画文書が、現在のアクティブな実装指示と衝突します。

### GSD-X の設計原則

> **メモリは冗長なコンテキストを置き換えるべきであり、単にコンテキストを追加するだけではならない。**

すべてを盲目的に投入するのではなく、GSD-X は決定論的なコンテキストコンパイルパイプラインを実行します：

```
タスク意図 (Task Intent)
    │
    ▼
[タスク分類器] ──────► 複雑度を判定し、適応型トークンバジェットを割り当て
    │
    ▼
[省略フィルター] ────► 現在のタスクに無関係な計画文書の 70〜90% を自動除外
    │
    ▼
[シンボル索引] ──────► 500行のファイル全体ではなく、5〜10行の型定義・シグネチャを抽出
    │
    ▼
[セマンティックメモリ] ► 数千行の調査記録の代わりに、25トークンの蒸留された決定事項を注入
    │
    ▼
[意味的重複排除] ────► 複数ファイルに散在する同一の規約や制約を統合・縮小
    │
    ▼
コンパイル済みコンテキスト (Compiled Context) —— 最小トークン、最大シグナル
```

---

## システムアーキテクチャ

```mermaid
flowchart TD
    User([ユーザー / 自律エージェント]) --> Runtime[Antigravity / Claude Code / Codex]
    Runtime --> Commands[GSD-X ワークフロー / スラッシュコマンド]
    Commands --> SDK[GSD-X インテリジェンス SDK]

    subgraph IntelligenceLayer ["GSD-X インテリジェンス層 (Intelligence Layer)"]
        Classifier[タスク分類器 & 複雑度アナライザー]
        Budget[適応型トークンバジェット]
        Selector[タスク認識型成果物セレクター]
        CodeIdx[増分コードインデックス CodebaseIndex]
        MemRetriever[多因子セマンティックメモリ検索]
        Dedupe[文書間セマンティック重複排除エンジン]
        Defenses[プロンプトインジェクション隔離ガード]
        Compiler[コンテキストコンパイラ ContextCompiler]
        Router[モデル認識ルーター]

        Classifier --> Budget
        Budget --> Selector
        Selector --> CodeIdx
        CodeIdx --> MemRetriever
        MemRetriever --> Dedupe
        Dedupe --> Defenses
        Defenses --> Compiler
        Compiler --> Router
    end

    SDK --> IntelligenceLayer
    Router --> CompiledContext[コンパイル済みコンテキスト概要 (Compiled Brief)]
    CompiledContext --> Agent[専門化された GSD エージェント]
    Agent --> Exec[実行 / テスト / 検証]
    Exec --> Summary[SUMMARY.md & 検証レポート]
    Summary --> Extraction[安全なメモリ抽出 & 秘密情報マスク]
    Extraction --> Consolidation[知識統合 & 時間減衰]
    Consolidation --> LocalStore[(ローカルメモリストア: LanceDB / JSONL)]
    LocalStore -.-> MemRetriever
```

---

## 実測ベンチマーク結果：最大83.0%のトークン削減 (Empirical Benchmarks)

> **8つの標準開発シナリオにおける集約トークン削減率は67.5%であり、個別タスクでは最大83.0%の削減を達成。Fable 5 料金モデルに基づく実測コスト削減率は33.0%です。**

以下の数値は、自動化された再現可能ベンチマークハーネス（`benchmarks/run-benchmark.cjs`）により、コミット `13d37238ba08377929e4850fd6ae4b8db49a22ca` 上で Open GSD Core 原型と GSD-X を直接比較・実測したものです。正規データセットは [`benchmarks/data/benchmark_results.json`](benchmarks/data/benchmark_results.json) に記録されています：

### シナリオ別測定データ

| 開発シナリオ | 原型 GSD トークン | GSD-X トークン | トークン削減率 | 原型コスト | GSD-X コスト | コスト削減率 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. 単純タスク** (Simple Task) | 2,253 | 382 | **83.0%** | $0.0325 | $0.0138 | **57.5%** |
| **2. 小規模バグ修正** (Small Bug) | 2,977 | 592 | **80.1%** | $0.0466 | $0.0227 | **51.2%** |
| **3. 通常機能実装** (Feature) | 3,655 | 1,302 | **64.4%** | $0.0806 | $0.0570 | **29.2%** |
| **4. 複雑な機能実装** (Complex Feature) | 4,954 | 2,146 | **56.7%** | $0.1235 | $0.0955 | **22.7%** |
| **5. 既存コード改修** (Brownfield Feature) | 3,409 | 1,056 | **69.0%** | $0.0681 | $0.0446 | **34.6%** |
| **6. 既知ノウハウ活用** (Repeated Knowledge) | 3,211 | 920 | **71.3%** | $0.0581 | $0.0352 | **39.4%** |
| **7. 長期プロジェクト運用** (Long-running Project) | 2,665 | 1,341 | **49.7%** | $0.0747 | $0.0614 | **17.7%** |
| **8. メモリ想起** (Memory Recall) | 2,358 | 549 | **76.7%** | $0.0376 | $0.0195 | **48.1%** |
| **合計 / 加重平均** | **25,482** | **8,288** | **67.5%** | **$0.5216** | **$0.3497** | **33.0%** |

*価格設定モデル：Fable 5（入力 $10.00/1M、出力 $50.00/1M）。すべての計算は未丸めの基盤データに基づいています。未丸めのベースライン総コストは $0.52162（表示上は $0.5216）、GSD-X 総コストは $0.34968（表示上は $0.3497）です。小数点以下4桁の表示丸め累積（+0.00008）により、各シナリオの合計は $0.5217 と表示されます。*

### 削減額の計算方法と仕組み

```text
トークン削減計算
ベースライン合計トークン：25,482（入力 18,812 + 出力 6,670）
GSD-X 合計トークン：      8,288（入力 1,618 + 出力 6,670）
純削減トークン数：        17,194
集約トークン削減率 = (25,482 − 8,288) ÷ 25,482 × 100 = 67.475% ≈ 67.5%

コスト削減計算 (Fable 5: 入力 $10/M, 出力 $50/M)
ベースラインコスト：(18,812 × $10 ÷ 1M) + (6,670 × $50 ÷ 1M) = $0.18812 + $0.33350 = $0.52162
GSD-X コスト：      (1,618 × $10 ÷ 1M) + (6,670 × $50 ÷ 1M)  = $0.01618 + $0.33350 = $0.34968
純削減コスト：$0.52162 − $0.34968 = $0.17194
コスト削減率 = ($0.52162 − $0.34968) ÷ $0.52162 × 100 = 32.963% ≈ 33.0%

なぜトークン削減率 (67.5%) ≠ コスト削減率 (33.0%) なのか？
Fable 5 では出力トークンの単価が入力トークンの5倍（$50/M 対 $10/M）です。
GSD-X は冗長な入力コンテキスト（仕様書、マップ、履歴サマリー）を大幅に削減しますが、
タスク解決のために生成される高品質なコード出力（6,670 トークン）は同等に維持されます。
高額な出力トークンがベースラインコストの64%を占めるため、トークン消費量が67.5%削減されても
実際の金額削減率は33.0%となります。
```

### スケール効果：ベースラインと GSD-X 等価ワークロードの比較 (Scale Projections)

ベースラインの入力 73.8% / 出力 26.2% の構成比率に基づく等比拡大：

| 指標 | 原型ベースラインワークロード | GSD-X 等価ワークロード | GSD-X による実質節約 |
|:---|:---:|:---:|:---:|
| **100万ベースライントークン** | 1,000,000 トークン | 325,249 トークン | **674,751 トークン削減 (67.5% 削減)** |
| **Fable 5 コスト (1M)** | $20.47 | $13.72 | **100万トークンあたり $6.75 削減 (33.0% 削減)** |
| **1,000万トークン規模** | 10,000,000 トークン ($204.70) | 3,252,492 トークン ($137.23) | **6,747,508 トークン削減 \| $67.47 削減** |
| **1億トークン規模** | 100,000,000 トークン ($2,046.99) | 32,524,920 トークン ($1,372.26) | **67,475,080 トークン削減 \| $674.73 削減** |

*注：スケール数値は未丸め実測データからの厳密な線形外挿です。丸め後の1M単価（$20.47, $13.72, $6.75）を直接乗算した場合、10M では $204.70 / $137.20 / $67.50、100M では $2,047.00 / $1,372.00 / $675.00 となります。*

---

## 主な機能

### 1. ローカルファーストのセマンティックメモリシステム
- **デュアルバックエンドストレージ**：外部サーバー不要の埋め込み型 [LanceDB](https://lancedb.github.io/lancedb/) ベクトル検索と、外部依存ゼロの TypeScript 製フォールバック（`JsonMemoryStore` / JSONL）を標準装備。
- **オフライン決定論的 128 次元特徴ベクトル**：軽量な特徴ハッシュ（`LocalHashEmbeddingProvider`）により、外部 API 依存を排除し、完全なデータプライバシーを保証。
- **多因子スコアリングモデル**：セマンティック類似度、プロジェクト境界、フェーズ関連度、権威レベル、時間的減衰、アクセス頻度を総合して最適順位付け。
- **厳格な権威階層**：`authoritative` > `verified` > `high-confidence` > `learned` > `inferred` > `experimental` の優先順位により、推測による変更が確立された決定を上書きすることを防止。
- **時間減衰と保護**：一般的な知見は 30 日の半減期で自然減衰しますが、権威あるアーキテクチャ決定事項は**永久に減衰しません**。

### 2. インテリジェント・コンテキストコンパイラ
- **適応型トークンバジェット**：タスクの難易度に応じて動的に最適なバジェットを配分（単純タスクの 3,500 トークンからリファクタリングの 32,000 トークンまで）。
- **タスク認識型選択と省略**：`.planning/` やコードマップを走査し、無関係な文書を除外した上で監査マニフェストに理由を記録。
- **文書間セマンティック重複排除**：複数 Markdown に重複して記載されたプロジェクト規則や設計制約を検出し、15%〜30% のトークンを削減。
- **プロンプトインジェクション防御**：取得されたメモリは `<retrieved-memory>` タグで厳格に囲み、運用契約（Operational Contract）を付与して悪意ある指示の実行を無力化。

### 3. インクリメンタル・コードインテリジェンス (`CodebaseIndex`)
- **変更追跡型シンボルインデックス**：ファイルの更新日時（`mtime`）と SHA-256 ハッシュをキャッシュし、変更されたファイルのみを効率的に解析。
- **シグネチャと Docstring の抽出**：500行のソースファイル全体ではなく、5〜10行の関数・クラスシグネチャのみをコンテキストに注入。
- **対応言語**：TypeScript、JavaScript、Python を標準サポート。

### 4. モデル認識ルーティング
- **複雑度に応じたルーティング**：タスクの性質に応じて最適なモデル層（`cheapModel`, `fastModel`, `strongCodingModel`, `reasoningModel`, `auditModel`）を選択。
- **安全なフォールバック**：ルーティングが無効な場合は、ランタイムのデフォルトまたは既存のプロファイルへ安全にフォールバック。

---

## 他ソリューションとの比較

| 評価軸 | 単純 RAG / Mem0 | RuFlo / Claude Flow | 原型 Open GSD Core | **GSD-X** |
|:---|:---:|:---:|:---:|:---:|
| **パラダイム** | チャット中心メモリ | スウォーム分散協調 | 仕様駆動フェーズサイクル | **仕様駆動 + メモリ知性層** |
| **コンテキスト戦略** | 加算型（トークン増） | 蓄積型スウォームコンテキスト | 手動での全ファイル読み込み | **代替型（メモリが冗長文書を代替）** |
| **トークン最適化** | ❌ なし | ❌ オーバーヘッド過大 | ⚠️ 新規サブコンテキストのみ | ✅ **適応型バジェット + 67.5% 削減** |
| **意味的重複排除** | ❌ なし | ❌ なし | ❌ なし | ✅ **文書間セマンティック重複排除** |
| **コード構造認識** | ❌ 粗いテキスト分割 | ⚠️ ファイル一覧のみ | ⚠️ 手動 grep 頼み | ✅ **インクリメンタル型シンボル索引** |
| **ストレージ** | クラウド SaaS / Redis | 分散メッシュ | なし（Markdown のみ） | ✅ **ローカルファースト LanceDB + JSONL** |
| **セキュリティ** | クラウド流出リスク | 外部データの無検証 | ローカルファイル | ✅ **タグ境界隔離 + 秘密情報自動マスク** |
| **後方互換性** | 該当なし | 該当なし | 基準ベースライン | ✅ **`.planning/` と 100% 互換** |

---

## クイックスタート

### インストールとビルド

```bash
# リポジトリのクローン
git clone https://github.com/udaydeep1992/gsd-x.git
cd gsd-x
git checkout gsd-x

# 依存関係のインストールと SDK のビルド
npm install
npm run build:sdk
```

### テストとベンチマークの実行

```bash
# 完全なテストスイートを実行 (6つのサブシステムすべてで 41/41 通過)
npm run test:sdk

# 再現可能なトークン & コスト削減ベンチマークを実行
npm run benchmark
```

### CLI コマンドリファレンス

GSD-X は既存の `gsd-tools` CLI とシームレスに連携します：

```bash
# メモリの健全性と機密情報漏洩の監査
node gsd-core/bin/gsd-tools.cjs memory doctor

# アーキテクチャ決定事項を永続メモリに追加
node gsd-core/bin/gsd-tools.cjs memory add "UUIDv4 を主キーとした PostgreSQL 16 を使用する" --type decision --tags db,postgres

# プロジェクトメモリをセマンティックベクトル検索
node gsd-core/bin/gsd-tools.cjs memory search "データベース設計の決定事項" --limit 5

# 特定のメモリエントリの詳細を表示
node gsd-core/bin/gsd-tools.cjs memory show <memory-id>

# メモリストレージの統計情報を表示
node gsd-core/bin/gsd-tools.cjs memory stats

# コンパイラのトークンバジェット、省略された文書、重複排除の削減効果を診断
node gsd-core/bin/gsd-tools.cjs context stats --task "認証ミドルウェアのリファクタリング"
```

---

## ドキュメント

- 🧠 **[ローカルファースト・セマンティックメモリ (MEMORY.md)](docs/MEMORY.md)**: LanceDB、特徴ベクトルハッシュ、多因子スコアリング、権威階層、時間減衰の詳細解説。
- ⚡ **[コンテキストコンパイラ (CONTEXT-COMPILER.md)](docs/CONTEXT-COMPILER.md)**: 8段階の知性パイプライン、重複排除、バジェット強制の仕組み。
- 📊 **[トークン最適化手法 (TOKEN-OPTIMIZATION.md)](docs/TOKEN-OPTIMIZATION.md)**: トークン削減を実現する5つのレバーと定量的分析。
- 🪐 **[Google Antigravity 連携ガイド (ANTIGRAVITY.md)](docs/ANTIGRAVITY.md)**: Antigravity 内でのスラッシュコマンドとサブエージェント連携手順。
- 📈 **[ベンチマーク手法と実測データ (BENCHMARKS.md)](docs/BENCHMARKS.md)**: シナリオ定義、生データ、再現手順。
- 🛡️ **[セキュリティ & プライバシー設計 (SECURITY.md)](docs/SECURITY.md)**: プロンプトインジェクション隔離、秘密情報自動マスク、ローカル隔離。
- 🔄 **[移行ガイド (MIGRATION.md)](docs/MIGRATION.md)**: Open GSD Core、GSD v1、GSD v2 からの破壊的変更ゼロでのアップグレード手順。

---

## メンテナーおよび商用サポート

GSD-X は **Codee Studio** によって積極的に開発および保守されています。

[![Maintained by: Codee Studio](https://img.shields.io/badge/Maintained%20by-Codee%20Studio-007acc.svg?style=for-the-badge)](https://www.fiverr.com/codee_studio)
[![Hire on Fiverr](https://img.shields.io/badge/Fiverr-Hire%20Codee%20Studio-1dbf73?style=for-the-badge&logo=fiverr&logoColor=white)](https://www.fiverr.com/codee_studio)
[![Telegram](https://img.shields.io/badge/Telegram-@kblautosignals-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/kblautosignals)

カスタム AI エージェントのアーキテクチャ設計、開発ワークフロー統合、エンタープライズ向けメモリシステムの実装、自動化開発パイプラインの導入が必要な場合：
- 💼 **Fiverr で依頼する**：[fiverr.com/codee_studio](https://www.fiverr.com/codee_studio) —— 専門的な AI エージェント開発、ランタイム統合、特注のコーディングツール構築を提供。
- 💬 **Telegram ダイレクトサポート**：[@kblautosignals](https://t.me/kblautosignals) —— 迅速な技術相談およびエンジニアリングのお問い合わせ。

---

## ライセンス

MIT © [OpenGSD](https://github.com/open-gsd) and GSD-X 貢献者。
