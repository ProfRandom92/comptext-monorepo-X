# CompText Wiki

> **CompText** — Domain-Specific Language for Clinical AI Token Preprocessing
> DSL v5 · FHIR R4 · GDPR-compliant · 93–94% token reduction · MedGemma-ready

---

## What is CompText?

CompText preprocesses FHIR R4 patient bundles before sending them to clinical LLMs (MedGemma, GPT-4, Claude). It reduces token count by **93–94%** while preserving all safety-critical information.

```
FHIR Bundle                  CompText Frame
──────────────               ──────────────
1,847 tokens    ──────→      112 tokens
4,820 bytes                  438 bytes

                 93.9% reduction
                 83.7% faster inference on MedGemma 27B
```

**Key properties:**

- Deterministic — same input → same output, no LLM in the pipeline
- Safety-first — allergies, contraindications, and triage fields are never compressed
- GDPR compliant — PHI is one-way hashed (Art. 5/17/25), never stored
- Token target — >90% reduction vs. raw FHIR JSON (measured: 93.8–94.1%)

---

## Quick Start

```bash
npm install @comptext/core
```

```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core";

const result = await pipeline(FHIR_STEMI);

console.log(result.frame.tri); // "P1"
console.log(result.benchmark.reduction_pct); // 93.9

const comptext = serializeFrame(result.frame);
// CT:v5 SC:STEMI TRI:P1
// VS[hr:118 sbp:82 spo2:91]
// LAB[hsTnI:4847 ckmb:48.7]
// ALG:Jodkontrastmittel SEV:II KI:[V08,V09]
// ...
```

---

## Wiki Pages

| Page                   | Description                                     |
| ---------------------- | ----------------------------------------------- |
| [[Architecture]]       | System architecture, pipeline stages, data flow |
| [[DSL Specification]]  | CompText DSL v5 syntax and field reference      |
| [[API Reference]]      | Full API docs for `@comptext/core`              |
| [[Clinical Scenarios]] | The 5 validated FHIR R4 test bundles            |
| [[Token Benchmarks]]   | Token reduction and inference latency results   |
| [[GDPR Compliance]]    | PHI scrubbing, hashing, GDPR Art. 5/9/17/25     |
| [[Contributing]]       | Development setup, code standards, PR process   |

---

## Pipeline at a Glance

### Stage 1 — NURSE

PHI scrubbing per GDPR Art. 25. Removes names, birth dates, addresses, free-text narratives. Preserves all coded fields (LOINC, SNOMED CT, ICD-10-GM). **~12% token reduction.**

### Stage 2 — KVTC

Four deterministic compression layers:

- **K** — Key extraction: FHIR structural overhead → compact keys (`Heart rate` → `HR`)
- **V** — Value normalization: SI units, significant figures
- **T** — Type encoding: FHIR types → CompText codes (`MedicationStatement` → `MED`)
- **C** — Context compression: Clinical abbreviations

**~79% token reduction (cumulative with NURSE).**

### Stage 3 — Frame Assembly + Triage

Rule-based triage classification per ESC/AHA/SSC/WAO guidelines. Outputs a `CompTextFrame` with triage level (P1/P2/P3), vitals, labs, allergies, medications, and ICD-10 codes. **~94% total reduction.**

---

## Token Benchmarks

| Scenario    | FHIR Raw | CompText | Reduction |
| ----------- | -------- | -------- | --------- |
| STEMI       | 1,847    | 112      | **93.9%** |
| Sepsis      | 2,213    | 131      | **94.1%** |
| Stroke      | 2,041    | 124      | **93.9%** |
| Anaphylaxie | 1,742    | 108      | **93.8%** |
| DM Hypo     | 1,963    | 119      | **93.9%** |

_Measured with tiktoken `cl100k_base` (GPT-4)._

---

## Repository Structure

```
comptext-monorepo/
├── packages/
│   ├── core/          ← @comptext/core npm library
│   └── visualizer/    ← React demo app
├── docs/              ← Architecture, DSL spec, API reference
└── scripts/           ← Benchmark runner
```

---

## Links

- **npm:** [@comptext/core](https://www.npmjs.com/package/@comptext/core)
- **Kaggle:** MedGemma × CompText — Impact Challenge 2026
- **License:** MIT

> ⚠️ **Medical Disclaimer:** CompText is a research tool. It is not a certified medical device and must not be used in clinical decision-making without proper validation and regulatory approval.
