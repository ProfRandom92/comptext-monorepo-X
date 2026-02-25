# Architecture

> For the full architecture document see [`docs/ARCHITECTURE.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/ARCHITECTURE.md).

---

## System Overview

CompText is a deterministic, three-stage pipeline that compresses FHIR R4 patient bundles for clinical LLMs.

```
FHIR Bundle (1,847 tokens)
    ↓ Stage 1 — NURSE  →  1,621 tokens  (−12%)
    ↓ Stage 2 — KVTC   →    387 tokens  (−79% cumulative)
    ↓ Stage 3 — Frame  →    112 tokens  (−94% cumulative) ✓
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Deterministic** | Same input → same output; no LLM in the pipeline |
| **Safety-first** | ALG, RX, TRIAGE fields are never compressed |
| **GDPR-compliant** | PHI is one-way hashed (FNV-1a), never stored in plaintext |
| **Token-efficient** | >90% reduction vs. raw FHIR JSON |

---

## Monorepo Structure

```
comptext-monorepo/
├── packages/
│   ├── core/               ← @comptext/core npm library
│   │   └── src/
│   │       ├── index.ts    ← Public API + pipeline() entry point
│   │       ├── data.ts     ← FHIR R4 test data (5 scenarios)
│   │       ├── types/      ← TypeScript types
│   │       └── compiler/
│   │           ├── nurse.ts   ← Stage 1: PHI-Scrubbing
│   │           ├── kvtc.ts    ← Stage 2: Compression
│   │           └── triage.ts  ← Stage 3: Frame Assembly
│   └── visualizer/         ← React demo app
├── docs/                   ← Full technical documentation
└── scripts/                ← Benchmark runner
```

---

## Stage 1 — NURSE

**N**ormalized **U**tility for **R**emoving **S**ensitive **E**ntries

PHI scrubbing per GDPR Art. 25 (data protection by design):

| Removed | Preserved |
|---------|-----------|
| `Patient.name` | `Patient.gender` |
| `Patient.birthDate` | Age (decade approximation: "60s") |
| `Patient.address` | All coded fields (LOINC, SNOMED, ICD-10) |
| `Patient.telecom` | Observation values + units |
| All `identifier.value` | Medication dose + frequency |
| Free-text narrative > 100 chars | Allergy severity grades |

- PHI fields are replaced with a deterministic **FNV-1a hash**
- Duplicate observations (same LOINC code) are deduplicated
- Regex-based scanning for PHI in free-text fields

**Token reduction: ~12%**

---

## Stage 2 — KVTC

Four deterministic compression layers:

### K — Key Extraction

FHIR structural overhead → compact clinical keys via LOINC lookup:

```
"code":{"coding":[{"system":"http://loinc.org","code":"8867-4","display":"Heart rate"}]}
→  hr
```

### V — Value Normalization

SI units, significant figures, criticality flags:

```
"valueQuantity":{"value":118,"unit":"/min",...}  +  interpretation:"H"
→  118/min↑
```

### T — Type Encoding

FHIR resource types → compact CompText codes:

```
"resourceType":"MedicationStatement"  →  MED
"resourceType":"Observation"          →  OBS
```

### C — Context Compression

Clinical abbreviations (German → compact):

```
"Akuter transmuraler Myokardinfarkt der Vorderwand"  →  "Ak. transm. MI VW"
```

**Token reduction: ~79% cumulative**

---

## Stage 3 — Frame Assembly + Triage

Deterministic triage classification (ESC/AHA/SSC/WAO guidelines):

| Criterion | P1 Threshold | Source |
|-----------|-------------|--------|
| Systolic BP | < 90 mmHg | ESC 2023 |
| SpO2 | < 90% | ERC |
| Heart rate | > 150 /min | AHA ACLS |
| Lactate | > 4.0 mmol/L | SSC 2021 |
| hsTroponin I | > 52 ng/L | ESC 2023 |
| Blood glucose | < 2.5 mmol/L | ADA 2024 |
| Any P1 ICD-10 | I21.x, I63.x, A41.x, T78.2, ... | — |

**Token reduction: ~94% final frame vs. raw FHIR**

---

## Architecture Decision Records (ADRs)

### ADR-001 — FNV-1a Hash for PHI

**Decision**: FNV-1a 32-bit for PHI hashing in the NURSE stage.  
**Rationale**: GDPR requires non-reversibility, not cryptographic security. FNV-1a is fast and deterministic, which is more important for audit trails (same input → same hash across sessions) than crypto-grade strength.

### ADR-002 — No LLM in the Pipeline

**Decision**: NURSE, KVTC and Triage are pure rule engines — no LLM.  
**Rationale**: (a) Determinism is mandatory for medical applications, (b) LLM token cost for a two-stage approach would be counter-productive, (c) Auditability — every compression rule is traceable.

### ADR-003 — LOINC as Primary Vocabulary

**Decision**: Observations are identified primarily via LOINC codes, not free text.  
**Rationale**: LOINC 2.76 contains 100k+ clinical concepts, is internationally standardised, and enables cross-institution interoperability.

### ADR-004 — CompTextFrame v5 Versioning

**Convention**: The `v` field in the frame must be incremented for every incompatible change. MedGemma prompts reference the version explicitly.

### ADR-005 — Token Estimation Heuristic

**Current**: `chars / 3.8` — deviates ±5% from `cl100k_base`.  
**Production**: tiktoken as optional peer dependency. The heuristic remains as fallback for browser environments.

---

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│              PHI Boundary                        │
│                                                  │
│  FHIR Bundle (PHI)  →  NURSE  →  PHI-free data  │
│                                                  │
│  Patient Name         →  [REMOVED]               │
│  Birth Date           →  [REMOVED]               │
│  Address              →  [REMOVED]               │
│  Patient ID           →  FNV-1a Hash             │
│                                                  │
│  Everything after NURSE is PHI-free              │
└─────────────────────────────────────────────────┘
```

---

## Performance

| Metric | Value |
|--------|-------|
| Pipeline latency (Node.js, M1) | < 5 ms per bundle |
| Memory (typical bundle) | < 2 MB peak |
| MedGemma 27B inference speedup | **83.9%** faster |

---

> 📄 Full architecture documentation: [`docs/ARCHITECTURE.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/ARCHITECTURE.md)
