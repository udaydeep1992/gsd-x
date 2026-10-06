<div align="center">

# GSD-X

**더 스마트한 메모리와 컨텍스트 엔진을 갖춘 GSD.**

[English](README.md) · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja-JP.md) · **한국어**

장기 실행 AI 소프트웨어 개발을 위해 최적화된, 메모리 인식형 Open GSD Core 진화 버전—규율 있는 스펙 기반 계획 및 검증과 로컬 우선 시맨틱 프로젝트 메모리, 지능형 컨텍스트 컴파일, 코드 인식 검색, 적응형 토큰 예산, 모델 인식 라우팅의 결합.

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
> **포크 및 계보 고지**: GSD-X는 [Open GSD Core](https://github.com/open-gsd/gsd-core)의 독립적인 포크이자 아키텍처 진화 버전이며, 원본 GSD / Open GSD 유지보수자와 공식적인 제휴나 보증 관계가 없습니다. GSD-X는 업스트림의 `.planning/` 워크플로와 100% 하위 호환성을 유지하면서 로컬 우선 메모리 및 컨텍스트 인텔리전스 계층을 결합합니다.

---

## 핵심 문제: 컨텍스트 비대화와 망각

기존의 단순한 AI 코딩 에이전트는 **가산형 컨텍스트의 오류(Additive Context Fallacy)**에 빠져 있습니다:

$$\text{단순한 컨텍스트} = \text{시스템 프롬프트} + \text{대화 기록} + \text{모든 기획 문서} + \text{검색된 전체 메모리} + \text{전체 소스코드 파일}$$

이러한 방식은 다음과 같은 치명적인 문제를 일으킵니다:
1. **극심한 토큰 낭비**: 프로젝트가 진행됨에 따라 단일 호출 비용이 300% ~ 500% 폭증합니다.
2. **컨텍스트 품질 저하 및 주의력 분산**: 수천 줄의 무관한 문서로 컨텍스트 창이 채워지면 핵심 지침을 망각합니다.
3. **지침 충돌**: 오래된 과거 기획 문서가 현재의 활성 구현 세부 정보와 충돌합니다.

### GSD-X 설계 철학

> **메모리는 중복된 컨텍스트를 대체해야 하며, 단순히 더 많은 컨텍스트를 추가해서는 안 된다.**

모든 파일을 맹목적으로 쏟아붓는 대신, GSD-X는 결정론적인 컨텍스트 컴파일 파이프라인을 실행합니다:

```
작업 의도 (Task Intent)
    │
    ▼
[작업 분류기] ──────► 복잡도를 판별하고 적응형 토큰 예산 동적 배정
    │
    ▼
[생략 필터] ────────► 현재 작업과 무관한 기획 문서의 70~90%를 자동 제외
    │
    ▼
[심볼 인덱서] ──────► 500줄 파일 전체 대신 5~10줄의 핵심 시그니처 및 문서 주석만 추출
    │
    ▼
[시맨틱 메모리] ────► 수천 줄의 분석 문서 대신 25토큰의 정제된 결정 사실 주입
    │
    ▼
[의미적 중복 제거] ──► 여러 문서에 중복 기술된 규칙과 제약사항을 통합 및 축약
    │
    ▼
컴파일된 컨텍스트 (Compiled Context) —— 최소 토큰, 최대 정보 밀도
```

---

## 시스템 아키텍처

```mermaid
flowchart TD
    User([사용자 / 자율 에이전트]) --> Runtime[Antigravity / Claude Code / Codex]
    Runtime --> Commands[GSD-X 워크플로 / 슬래시 명령어]
    Commands --> SDK[GSD-X 인텔리전스 SDK]

    subgraph IntelligenceLayer ["GSD-X 인텔리전스 계층 (Intelligence Layer)"]
        Classifier[작업 분류 및 복잡도 분석기]
        Budget[적응형 토큰 예산 배정]
        Selector[작업 인식 문서 선택기]
        CodeIdx[점진적 코드 인덱스 CodebaseIndex]
        MemRetriever[다요소 시맨틱 메모리 검색]
        Dedupe[문서 간 시맨틱 중복 제거기]
        Defenses[프롬프트 인젝션 격리 가드]
        Compiler[컨텍스트 컴파일러 ContextCompiler]
        Router[모델 인식 라우터]

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
    Router --> CompiledContext[컴파일된 브리프 (Compiled Brief)]
    CompiledContext --> Agent[전문화된 GSD 에이전트]
    Agent --> Exec[실행 / 테스트 / 검증]
    Exec --> Summary[SUMMARY.md 작업 요약]
    Summary --> Extraction[안전한 메모리 추출 및 비밀 마스킹]
    Extraction --> Consolidation[지식 통합 및 시간 감쇠]
    Consolidation --> LocalStore[(로컬 메모리 저장소: LanceDB / JSONL)]
    LocalStore -.-> MemRetriever
```

---

## 실측 벤치마크 결과 (Empirical Benchmarks)

다음의 모든 수치는 자동화된 재현 가능 벤치마크 도구(`benchmarks/run-benchmark.cjs`)를 통해 커밋 `13d37238ba08377929e4850fd6ae4b8db49a22ca`에서 원본 Open GSD Core와 GSD-X를 8가지 표준 개발 시나리오로 실측 비교한 결과입니다:

| 개발 시나리오 | 원본 GSD 토큰 | GSD-X 토큰 | 토큰 절감율 | 원본 기준 비용 | GSD-X 비용 | 비용 절감율 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. 단순 작업** (Simple Task) | 2,253 | 382 | **83.0%** | $0.0325 | $0.0138 | **57.5%** |
| **2. 소규모 버그** (Small Bug) | 2,977 | 592 | **80.1%** | $0.0466 | $0.0227 | **51.2%** |
| **3. 일반 기능** (Feature) | 3,655 | 1,302 | **64.4%** | $0.0806 | $0.0570 | **29.2%** |
| **4. 복합 기능** (Complex Feature) | 4,954 | 2,146 | **56.7%** | $0.1235 | $0.0955 | **22.7%** |
| **5. 기존 코드 수정** (Brownfield Feature) | 3,409 | 1,056 | **69.0%** | $0.0681 | $0.0446 | **34.6%** |
| **6. 반복 지식 활용** (Repeated Knowledge) | 3,211 | 920 | **71.3%** | $0.0581 | $0.0352 | **39.4%** |
| **7. 장기 프로젝트** (Long-running Project) | 2,665 | 1,341 | **49.7%** | $0.0747 | $0.0614 | **17.7%** |
| **8. 메모리 회상** (Memory Recall) | 2,358 | 549 | **76.7%** | $0.0376 | $0.0195 | **48.1%** |
| **합계 / 가중 평균** | **25,482** | **8,288** | **67.5%** | **$0.5216** | **$0.3497** | **33.0%** |

*요금 책정 모델: Fable 5 (입력 $10.00/1M, 출력 $50.00/1M). 과장이나 조작이 없는 투명한 실측 데이터입니다.*

### 대규모 확장 효과: 100만 기준 토큰 대비 GSD-X 절감량 (1M Baseline Tokens vs. GSD-X)

| 지표 | 업스트림 기준 (1,000,000 토큰) | GSD-X 처리량 (325,249 토큰) | GSD-X 순 절감치 |
|:---|:---:|:---:|:---:|
| **소모 토큰 수** | 1,000,000 토큰 | 325,249 토큰 | **674,751 토큰 절약 (67.5% 절감)** |
| **Fable 5 비용** | $20.47 | $13.72 | **100만 토큰당 $6.75 절약 (33.0% 비용 절감)** |
| **1,000만 토큰 규모** | $204.70 | $137.20 | **$67.50 절약** (6,747,510 토큰 절약) |
| **1억 토큰 규모** | $2,047.00 | $1,372.00 | **$675.00 절약** (67,475,100 토큰 절약) |

*Fable 5 요금제 기준 (입력 $10.00/1M, 출력 $50.00/1M). 표준 GSD에서 100만 토큰을 소모하는 개발 워크플로우를 GSD-X는 약 32.5만 토큰으로 압축하여 컨텍스트 저하를 방지하고 33.0%의 비용을 절감합니다.*

---

## 주요 기능

### 1. 로컬 우선 시맨틱 메모리 시스템
- **이중 백엔드 저장소**: 외부 서버가 필요 없는 임베디드 [LanceDB](https://lancedb.github.io/lancedb/) 벡터 검색 엔진과 외부 의존성이 전혀 없는 TypeScript 기반 JSONL 폴백(`JsonMemoryStore`) 완벽 지원.
- **오프라인 결정론적 128차원 벡터**: 경량 특징 해싱(`LocalHashEmbeddingProvider`)을 통해 외부 임베딩 API 의존성을 완전히 제거하고 완벽한 데이터 프라이버시를 보장.
- **다요소 순위 매김 모델**: 시맨틱 유사도, 프로젝트 경계 일치, 단계 관련성, 권위 수준, 시간 감쇠, 최근 검색 빈도를 종합 평가하여 최적 순위 산출.
- **엄격한 권위 위계**: `authoritative` > `verified` > `high-confidence` > `learned` > `inferred` > `experimental` 순서를 엄격히 적용하여 검증되지 않은 추측이 확립된 아키텍처 결정을 덮어쓰지 못하도록 보장.
- **시간 감쇠 및 보존**: 일반적 경험은 30일 반감기에 따라 자연 감쇠하지만, 핵심 아키텍처 규약 및 제약사항은 **영구히 보존**됩니다.

### 2. 지능형 컨텍스트 컴파일러
- **적응형 토큰 예산**: 작업 복잡도에 따라 최적 예산을 동적 할당 (단순 작업 3,500 토큰부터 대규모 리팩터링 32,000 토큰까지).
- **작업 인식 선택 및 생략**: `.planning/` 및 코드 맵을 분석하여 무관한 문서를 자동 생략하고 감사 매니페스트에 사유를 기록.
- **문서 간 시맨틱 중복 제거**: 여러 마크다운 파일에 걸쳐 중복 선언된 프로젝트 규칙과 제약조건을 통합하여 15%~30%의 토큰 절감.
- **프롬프트 인젝션 방어**: 검색된 모든 메모리는 `<retrieved-memory>` 태그로 엄격히 감싸며, 조작 명령을 무력화하는 운영 계약(Operational Contract)을 적용.

### 3. 점진적 코드 인텔리전스 (`CodebaseIndex`)
- **수정 추적 심볼 인덱싱**: 파일 수정 시간(`mtime`)과 SHA-256 해시를 캐싱하여 변경된 파일만 효율적으로 파싱.
- **시그니처 및 Docstring 추출**: 500줄 전체 파일 대신 5~10줄의 함수/클래스 시그니처만 컨텍스트에 주입.
- **다국어 지원**: TypeScript, JavaScript, Python 기본 지원.

### 4. 모델 인식 라우팅
- **복잡도 기반 라우팅**: 작업 난이도에 따라 최적의 모델 계층(`cheapModel`, `fastModel`, `strongCodingModel`, `reasoningModel`, `auditModel`) 매핑.
- **안전한 폴백**: 라우팅이 비활성화된 경우 런타임의 기본 또는 상속된 모델 프로필로 원활하게 폴백.

---

## 대안 솔루션과의 비교

| 비교 항목 | 단순 RAG / Mem0 | RuFlo / Claude Flow | 원본 Open GSD Core | **GSD-X** |
|:---|:---:|:---:|:---:|:---:|
| **개발 패러다임** | 대화 중심 메모리 | 군집형 분산 협업 | 스펙 기반 단계 루프 | **스펙 기반 + 메모리 인텔리전스** |
| **컨텍스트 전략** | 가산형 (토큰 증가) | 군집 누적 컨텍스트 | 수동 전체 파일 읽기 | **대체형 (메모리가 중복 문서를 대체)** |
| **토큰 최적화** | ❌ 없음 | ❌ 오버헤드 큼 | ⚠️ 새로운 서브컨텍스트만 | ✅ **적응형 예산 + 67.5% 절감** |
| **시맨틱 중복 제거** | ❌ 없음 | ❌ 없음 | ❌ 없음 | ✅ **문서 간 자동 시맨틱 중복 제거** |
| **코드 구조 인식** | ❌ 단순 텍스트 분할 | ⚠️ 파일 목록 위주 | ⚠️ 수동 grep 스캔 | ✅ **점진적 심볼 및 시그니처 인덱서** |
| **저장소 아키텍처** | 클라우드 SaaS / Redis | 분산 메시 | 없음 (.planning/ 마크다운) | ✅ **로컬 우선 LanceDB + JSONL** |
| **보안 및 프라이버시** | 외부 데이터 유출 위험 | 외부 데이터 미격리 | 로컬 파일 | ✅ **태그 경계 격리 + 비밀정보 자동 마스킹** |
| **하위 호환성** | 해당 없음 | 해당 없음 | 기준 베이스라인 | ✅ **`.planning/` 100% 호환** |

---

## 빠른 시작

### 설치 및 빌드

```bash
# 리포지토리 클론
git clone https://github.com/udaydeep1992/gsd-x.git
cd gsd-x
git checkout gsd-x

# 의존성 설치 및 SDK 빌드
npm install
npm run build:sdk
```

### 테스트 및 벤치마크 실행

```bash
# 전체 테스트 스위트 실행 (6개 하위 시스템 전체 41/41 통과)
npm run test:sdk

# 재현 가능한 토큰 및 비용 벤치마크 실행
npm run benchmark
```

### CLI 명령어 안내

GSD-X는 `gsd-tools` CLI와 완벽하게 통합되어 작동합니다:

```bash
# 메모리 저장소 무결성 검사 및 비밀정보 유출 감사
node gsd-core/bin/gsd-tools.cjs memory doctor

# 아키텍처 결정 사항을 영구 메모리에 추가
node gsd-core/bin/gsd-tools.cjs memory add "UUIDv4 기본 키를 사용하는 PostgreSQL 16 채택" --type decision --tags db,postgres

# 프로젝트 메모리 대상 시맨틱 벡터 검색
node gsd-core/bin/gsd-tools.cjs memory search "데이터베이스 설계 결정" --limit 5

# 특정 메모리 항목 상세 조회
node gsd-core/bin/gsd-tools.cjs memory show <memory-id>

# 메모리 저장소 통계 정보 확인
node gsd-core/bin/gsd-tools.cjs memory stats

# 컴파일러 토큰 예산, 생략된 문서 및 중복 제거 절감량 확인
node gsd-core/bin/gsd-tools.cjs context stats --task "인증 미들웨어 리팩터링"
```

---

## 문서 안내

- 🧠 **[로컬 우선 시맨틱 메모리 (MEMORY.md)](docs/MEMORY.md)**: LanceDB, 임베딩 해싱, 다요소 스코어링, 권위 체계 및 시간 감쇠 심층 분석.
- ⚡ **[컨텍스트 컴파일러 (CONTEXT-COMPILER.md)](docs/CONTEXT-COMPILER.md)**: 8단계 인텔리전스 파이프라인, 중복 제거 및 예산 강제 적용 상세.
- 📊 **[토큰 최적화 기법 (TOKEN-OPTIMIZATION.md)](docs/TOKEN-OPTIMIZATION.md)**: 토큰 절감을 이끄는 5가지 핵심 레버와 정량적 분석.
- 🪐 **[Google Antigravity 연동 가이드 (ANTIGRAVITY.md)](docs/ANTIGRAVITY.md)**: Google Antigravity 내 슬래시 명령어 및 서브에이전트 연동 가이드.
- 📈 **[벤치마크 방법론 및 실측 데이터 (BENCHMARKS.md)](docs/BENCHMARKS.md)**: 시나리오 정의, 측정 원시 데이터 및 재현 절차.
- 🛡️ **[보안 및 개인정보 보호 설계 (SECURITY.md)](docs/SECURITY.md)**: 프롬프트 인젝션 방어, 비밀 자동 마스킹 및 로컬 격리.
- 🔄 **[마이그레이션 가이드 (MIGRATION.md)](docs/MIGRATION.md)**: Open GSD Core, GSD v1, GSD v2로부터의 무중단 업그레이드 경로.

---

## 메인테이너 및 상업적 기술 지원

GSD-X는 **Codee Studio**에서 주도적으로 개발 및 유지보수하고 있습니다.

[![Maintained by: Codee Studio](https://img.shields.io/badge/Maintained%20by-Codee%20Studio-007acc.svg?style=for-the-badge)](https://www.fiverr.com/codee_studio)
[![Hire on Fiverr](https://img.shields.io/badge/Fiverr-Hire%20Codee%20Studio-1dbf73?style=for-the-badge&logo=fiverr&logoColor=white)](https://www.fiverr.com/codee_studio)
[![Telegram](https://img.shields.io/badge/Telegram-@kblautosignals-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/kblautosignals)

엔터프라이즈 맞춤형 AI 에이전트 아키텍처 구축, 자동화 개발 워크플로 도입, 전용 메모리 시스템 연동 또는 상용 툴링 개발이 필요하신 경우:
- 💼 **Fiverr에서 의뢰하기**: [fiverr.com/codee_studio](https://www.fiverr.com/codee_studio) —— 전문적인 Agent 아키텍처 설계, 런타임 통합 및 맞춤형 개발 툴 제작.
- 💬 **Telegram 전용 지원**: [@kblautosignals](https://t.me/kblautosignals) —— 신속한 기술 질의 및 엔지니어링 상담.

---

## 라이선스

MIT © [OpenGSD](https://github.com/open-gsd) 및 GSD-X 기여자 일동.
