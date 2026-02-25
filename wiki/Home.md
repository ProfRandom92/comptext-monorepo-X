# CompText — Clinical AI Token Preprocessing Pipeline

> **DSL v5** · FHIR R4 · GDPR-compliant · 93–94% token reduction · MedGemma-ready

CompText is a deterministic pipeline that compresses FHIR R4 patient bundles by **93–94%** before sending them to clinical LLMs (MedGemma, GPT-4, Claude) — without losing any safety-critical information.

```
FHIR Bundle (1,847 tokens)
    ↓ NURSE  →  1,621 tokens  (−12%)
    ↓ KVTC   →    387 tokens  (−79%)
    ↓ Frame  →    112 tokens  (−94%) ✓
```

---

## Quick Navigation

| Topic | Description |
|-------|-------------|
| [[Getting-Started]] | Installation, quick start, first pipeline run |
| [[Architecture]] | System design, pipeline stages, data flow |
| [[API-Reference]] | Full API documentation with TypeScript types |
| [[DSL-Specification]] | CompText DSL v5 format & field reference |
| [[Clinical-Scenarios]] | 5 validated FHIR R4 scenarios (STEMI, Sepsis, …) |
| [[GDPR-Compliance]] | GDPR Art. 5/17/25 implementation details |
| [[Contributing]] | Dev setup, code standards, PR process |

---

## What CompText Does

```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core"

const result = await pipeline(FHIR_STEMI)

console.log(result.frame.tri)                  // "P1"
console.log(result.frame.alg[0].ag)            // "Jodkontrastmittel"
console.log(result.benchmark.reduction_pct)    // 93.9

const dsl = serializeFrame(result.frame)
// CT:v5 SC:STEMI TRI:P1
// VS[hr:118 sbp:82↓↓ spo2:91↓]
// LAB[hsTnI:4847ng/L↑↑ ckmb:48.7µg/L↑↑]
// ALG:Jodkontrastmittel SEV:II KI:[V08,V09]
// ...
```

---

## Key Design Principles

1. **Deterministic** — same input → same output, no LLM in the pipeline
2. **Safety-first** — ALG, RX, TRIAGE fields are never compressed
3. **GDPR Art. 5/17/25** — PHI is one-way hashed (FNV-1a), never stored in plaintext
4. **Token goal** — >90% reduction vs. raw FHIR JSON (measured: 93.8–94.1%)

---

## Token Benchmarks

| Scenario | FHIR Raw | NURSE | KVTC | CompText | Reduction |
|----------|----------|-------|------|----------|-----------|
| STEMI | 1,847 | 1,621 | 387 | **112** | **93.9%** |
| Sepsis | 2,213 | 1,934 | 461 | **131** | **94.1%** |
| Stroke | 2,041 | 1,788 | 427 | **124** | **93.9%** |
| Anaphylaxie | 1,742 | 1,523 | 363 | **108** | **93.8%** |
| DM Hypo | 1,963 | 1,717 | 410 | **119** | **93.9%** |

*Measured with tiktoken `cl100k_base` (GPT-4)*

---

## Installation

```bash
npm install @comptext/core
```

---

> ⚠️ **Medical Disclaimer**: CompText is a research tool. It is not a certified medical device and must not be used in clinical decision-making without proper validation and regulatory approval.
