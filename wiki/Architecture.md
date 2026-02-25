# Architecture

> See also: [`docs/ARCHITECTURE.md`](../blob/main/docs/ARCHITECTURE.md) for the full technical reference.

## System Overview

CompText is a deterministic three-stage pipeline. No LLM is involved in the compression — every transformation is rule-based and fully auditable.

```
FHIR Bundle (1847 Tokens)
    ↓ NURSE (PHI-Scrubbing)
    → 1621 Tokens  (-12%)
    ↓ KVTC (4-Layer Compression)
    → 387 Tokens   (-79%)
    ↓ Frame Assembly
    → 112 Tokens   (-94%)  ✓
```

## Source Layout

| File                                   | Role                                     |
| -------------------------------------- | ---------------------------------------- |
| `packages/core/src/compiler/nurse.ts`  | Stage 1: PHI scrubbing + deduplication   |
| `packages/core/src/compiler/kvtc.ts`   | Stage 2: K/V/T/C layer compression       |
| `packages/core/src/compiler/triage.ts` | Stage 3: Frame assembly + triage engine  |
| `packages/core/src/index.ts`           | Public API + `pipeline()` entry point    |
| `packages/core/src/types/index.ts`     | TypeScript types (`CompTextFrame`, etc.) |
| `packages/core/src/data.ts`            | 5 validated FHIR R4 test bundles         |

## Design Decisions (ADRs)

| ADR     | Decision                                                                       |
| ------- | ------------------------------------------------------------------------------ |
| ADR-001 | FNV-1a 32-bit for PHI hashing (deterministic, audit-trail friendly)            |
| ADR-002 | No LLM in the pipeline (determinism + cost + auditability)                     |
| ADR-003 | LOINC as primary vocabulary for observations                                   |
| ADR-004 | `CompTextFrame.v` must be bumped on any breaking change                        |
| ADR-005 | Token estimation: `chars / 3.8` heuristic (±5%), tiktoken as optional peer dep |
