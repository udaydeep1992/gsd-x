<div align="center">

# GSD-X

**GSD，拥有更智能的记忆与上下文引擎。**

[English](README.md) · [Português](README.pt-BR.md) · **简体中文** · [日本語](README.ja-JP.md) · [한국어](README.ko-KR.md)

专为长期运行的 AI 软件开发打造的高性能、记忆感知型 Open GSD Core 演进版本——将严格的规格驱动规划与验证，与本地优先语义记忆、智能上下文编译、代码感知检索、自适应 Token 预算及模型感知路由完美结合。

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
> **Fork 与衍生说明**：GSD-X 是 [Open GSD Core](https://github.com/open-gsd/gsd-core) 的独立分支与架构演进版本，与原 GSD / Open GSD 维护者无官方附属或背书关系。GSD-X 100% 保留了上游标准的 `.planning/` 工作流与兼容性，同时外嵌了本地优先的记忆与上下文智能层。

---

## 核心痛点：上下文膨胀与遗忘

传统的 AI 编码工具普遍陷入**累加式上下文陷阱**：
$$\text{原始上下文} = \text{系统提示词} + \text{对话历史} + \text{全部规划文档} + \text{检索到的所有记忆} + \text{完整代码文件}$$

这种做法会导致：
1. **Token 成本激增**：随着项目推进，单次调用 Token 膨胀 300% 至 500%。
2. **上下文退化与注意力分散**：面对成千上万行无关文档，模型容易忽略真正关键的核心指令。
3. **指令冲突**：过时的历史规划文档与当前任务产生矛盾。

### GSD-X 核心设计哲学

> **记忆必须替代冗余上下文，而非简单增加更多上下文。**

GSD-X 不盲目拼接所有文件，而是运行确定性的上下文编译流水线：

```
任务目标 (Task Intent)
    │
    ▼
[任务分类器] ────► 评估任务复杂度，按需分配自适应 Token 预算
    │
    ▼
[省略过滤器] ────► 自动过滤 70% 至 90% 与当前任务无关的规划文档
    │
    ▼
[代码索引器] ────► 仅提取 5-10 行关键函数/类签名与注释，替代数百行源码
    │
    ▼
[语义记忆库] ────► 注入 25 Token 的精炼决策事实，替代数千行分析文档
    │
    ▼
[跨文档去重] ────► 识别并折叠各 Markdown 文件中反复出现的规范约束
    │
    ▼
编译后上下文 (Compiled Context) —— 最小化 Token，最大化信息密度
```

---

## 系统架构

```mermaid
flowchart TD
    User([开发者 / 自主 Agent]) --> Runtime[Antigravity / Claude Code / Codex]
    Runtime --> Commands[GSD-X 工作流 / 斜杠命令]
    Commands --> SDK[GSD-X 智能层 SDK]

    subgraph IntelligenceLayer ["GSD-X 智能层 (Intelligence Layer)"]
        Classifier[任务分类与复杂度评估]
        Budget[自适应 Token 预算分配]
        Selector[任务感知文档选择器]
        CodeIdx[增量代码索引 CodebaseIndex]
        MemRetriever[多因子语义记忆检索]
        Dedupe[跨文档语义去重引擎]
        Defenses[Prompt 注入隔离护栏]
        Compiler[上下文编译器 ContextCompiler]
        Router[模型感知路由器]

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
    Router --> CompiledContext[精炼编译简报 (Compiled Brief)]
    CompiledContext --> Agent[专业化 GSD Agent]
    Agent --> Exec[执行 / 测试 / 验证]
    Exec --> Summary[SUMMARY.md 任务总结]
    Summary --> Extraction[保守型记忆提取与密钥脱敏]
    Extraction --> Consolidation[知识聚合与时间衰减]
    Consolidation --> LocalStore[(本地存储: LanceDB / JSONL)]
    LocalStore -.-> MemRetriever
```

---

## 实测基准数据 (Empirical Benchmarks)

以下所有数据均由自动化基准套件（`benchmarks/run-benchmark.cjs`）实测生成，在提交 `13d37238ba08377929e4850fd6ae4b8db49a22ca` 上直接对比原生 Open GSD Core 与 GSD-X：

| 开发场景 | 原生 GSD Token | GSD-X Token | Token 节省率 | 原生基线成本 | GSD-X 成本 | 成本节省率 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. 简单任务** (Simple Task) | 2,253 | 382 | **83.0%** | $0.0098 | $0.0041 | **57.5%** |
| **2. 小型 Bug** (Small Bug) | 2,977 | 592 | **80.1%** | $0.0140 | $0.0068 | **51.2%** |
| **3. 标准功能** (Feature) | 3,655 | 1,302 | **64.4%** | $0.0242 | $0.0171 | **29.2%** |
| **4. 复杂功能** (Complex Feature) | 4,954 | 2,146 | **56.7%** | $0.0371 | $0.0286 | **22.7%** |
| **5. 存量代码** (Brownfield Feature) | 3,409 | 1,056 | **69.0%** | $0.0204 | $0.0134 | **34.6%** |
| **6. 重复经验** (Repeated Knowledge) | 3,211 | 920 | **71.3%** | $0.0174 | $0.0106 | **39.4%** |
| **7. 长期项目** (Long-running Project) | 2,665 | 1,341 | **49.7%** | $0.0224 | $0.0184 | **17.7%** |
| **8. 记忆召回** (Memory Recall) | 2,358 | 549 | **76.7%** | $0.0113 | $0.0058 | **48.1%** |
| **总计 / 加权平均** | **25,482** | **8,288** | **67.5%** | **$0.1345** | **$0.0949** | **29.5%** |

*计费模型：Claude 3.7 Sonnet ($3.00/1M 输入，$15.00/1M 输出)。数据真实透明，绝无伪造。*

---

## 核心特性

### 1. 本地优先语义记忆系统
- **双存储引擎**：基于嵌入式 [LanceDB](https://lancedb.github.io/lancedb/) 的向量检索引擎，配合纯 TypeScript 实现的零外部依赖 `JsonMemoryStore`（JSONL）无缝保底。
- **离线确定性 128 维特征向量**：采用 MurmurHash3 与 SHA-256 特征哈希，完全离线计算单元长度向量，彻底摆脱第三方 Embedding API 与 Python 依赖。
- **多因子综合评分模型**：融合语义余弦相似度、项目归属、阶段上下文、任务标签、权威度权重、时间衰减与召回频率，搭配阶段（$1.25\times$）、项目（$1.10\times$）、全局（$0.85\times$）范围优先级。
- **严格权威度分级**：`authoritative` > `verified` > `high-confidence` > `learned` > `inferred` > `experimental`。推测性修改绝无法覆盖已验证的架构决策。
- **知识衰减与架构保护**：普通经验遵循 30 天半衰期衰减，而核心架构规范与硬性约束**永不衰减**。

### 2. 智能上下文编译器
- **自适应 Token 预算**：根据任务复杂度自动分配合理预算（简单任务 3,500 Token 至系统重构 32,000 Token）。
- **任务感知选择与省略**：自动过滤无关技术文档，并在诊断清单中记录省略原因。
- **跨文档语义去重**：自动合并各 Markdown 规约中重复声明的代码规范与技术选型，节约 15% 至 30% Token。
- **Prompt 注入隔离**：所有检索到的记忆强制使用 `<retrieved-memory>` 标签包裹，并通过操作契约明确约束为事实数据，杜绝指令劫持。

### 3. 增量代码符号索引 (`CodebaseIndex`)
- 增量扫描并比对文件修改时间（`mtime`）与 SHA-256 哈希。
- 解析函数、类、接口与类型签名，按需仅向上下文注入数行关键签名而非全文件。
- 原生支持 TypeScript、JavaScript 及 Python 代码。

---

## 方案对比：GSD-X vs. 其他架构

| 维度 | 传统 RAG / Mem0 | RuFlo / Claude Flow | 原生 Open GSD Core | **GSD-X** |
|:---|:---:|:---:|:---:|:---:|
| **开发范式** | 对话式记忆 | 群体智能协作 | 规范驱动阶段循环 | **规范驱动 + 记忆智能层** |
| **上下文策略** | 累加式（更多 Token） | 多 Agent 累积上下文 | 人工读取全量文件 | **替代式（记忆替代冗余文档）** |
| **Token 优化** | ❌ 无优化 | ❌ 运行时开销偏大 | ⚠️ 依赖新鲜子上下文 | ✅ **自适应预算 + 节省 67.5%** |
| **语义去重** | ❌ 无 | ❌ 无 | ❌ 无 | ✅ **跨文档自动语义去重** |
| **代码感知** | ❌ 粗粒度文本切块 | ⚠️ 仅文件列表 | ⚠️ 人工 grep 扫描 | ✅ **增量符号与签名索引** |
| **存储架构** | 云端 SaaS / Redis | 分布式网格 | 无本地记忆（仅 Markdown） | ✅ **本地优先 LanceDB + JSONL** |
| **安全性** | 存在数据出境风险 | 外部数据未隔离 | 本地文件 | ✅ **标签边界隔离 + 密钥自动脱敏** |
| **向前兼容** | 不适用 | 不适用 | 原生基线 | ✅ **100% 兼容 `.planning/`** |

---

## 快速上手

### 安装与构建

```bash
git clone https://github.com/open-gsd/gsd-core.git gsd-x
cd gsd-x
git checkout gsd-x

npm install
npm run build:sdk
```

### 运行测试与基准验证

```bash
# 执行完整测试套件 (41 项测试全部通过)
npm run test:sdk

# 运行自动化 Token 与成本基准评测
npm run benchmark
```

### 命令行常用指令

```bash
# 检查记忆库健康状态与密钥泄露审计
node gsd-core/bin/gsd-tools.cjs memory doctor

# 手动添加一项架构决策
node gsd-core/bin/gsd-tools.cjs memory add "统一使用 PostgreSQL 16 搭配 UUIDv4 主键" --type decision --tags db,postgres

# 语义向量搜索项目记忆
node gsd-core/bin/gsd-tools.cjs memory search "数据库选型决策" --limit 5

# 查看特定记忆详情
node gsd-core/bin/gsd-tools.cjs memory show <memory-id>

# 观察当前任务的上下文编译预算、省略项及去重节省
node gsd-core/bin/gsd-tools.cjs context stats --task "重构身份认证中间件"
```

---

## 维护团队与商业技术支持

GSD-X 由 **Codee Studio** 主导研发与维护。

[![Maintained by: Codee Studio](https://img.shields.io/badge/Maintained%20by-Codee%20Studio-007acc.svg?style=for-the-badge)](https://www.fiverr.com/codee_studio)
[![Hire on Fiverr](https://img.shields.io/badge/Fiverr-Hire%20Codee%20Studio-1dbf73?style=for-the-badge&logo=fiverr&logoColor=white)](https://www.fiverr.com/codee_studio)
[![Telegram](https://img.shields.io/badge/Telegram-@kblautosignals-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/kblautosignals)

如果您需要定制企业级 AI Agent 架构、自动化开发流程接入、定制记忆系统改造或高性能工作流开发：
- 💼 **在 Fiverr 上雇佣我们**：[fiverr.com/codee_studio](https://www.fiverr.com/codee_studio) —— 专业的 Agent 架构设计、定制工具开发与工程落地服务。
- 💬 **Telegram 直达技术支持**：[@kblautosignals](https://t.me/kblautosignals) —— 快速技术交流与需求直连。

---

## 许可证

MIT © [OpenGSD](https://github.com/open-gsd) 与 GSD-X 贡献者。
