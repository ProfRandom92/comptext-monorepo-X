---
name: comptext-pipeline
description: This skill should be used when the user asks to "run comptext pipeline", "process fhir bundle", "compress clinical data", "token reduction", "phi scrubbing", or mentions CompText, FHIR R4, or clinical AI preprocessing.
version: 1.0.0
---

# CompText Pipeline Skill

Clinical AI token preprocessing pipeline for FHIR R4 bundles. Transforms verbose FHIR JSON into compact, LLM-optimized CompText frames while preserving safety-critical information.

## Overview

CompText reduces FHIR bundle token counts by 93-94% through deterministic, rule-based compression:

```
FHIR Bundle (1847 tokens)
    ↓ NURSE (PHI scrubbing)
    → 1621 tokens (-12%)
    ↓ KVTC (4-layer compression)
    → 387 tokens (-79%)
    ↓ Frame Assembly
    → 112 tokens (-94%)
```

## Pipeline Stages

### Stage 1: NURSE (Normalized Utility for Removing Sensitive Entries)

GDPR Art. 25 compliant PHI scrubbing:

| Removed | Preserved |
|---------|-----------|
| Patient.name | Patient.gender |
| Patient.birthDate | Patient.age (decade) |
| Patient.address | All coded fields |
| Patient.telecom | Observation values |
| Free-text >100 chars | Allergy severity |

### Stage 2: KVTC (Key-Value-Type-Code)

Four deterministic compression layers:

**K - Key extraction:** FHIR structural overhead → compact keys
```
"code":{"coding":[{"system":"http://loinc.org","code":"8867-4"}]}
→ HR
```

**V - Value normalization:** SI units, significant figures
```
"valueQuantity":{"value":118,"unit":"/min"}
→ 118/min
```

**T - Type encoding:** FHIR types → CompText codes
```
MedicationStatement → MED
Observation → OBS
```

**C - Context compression:** Clinical abbreviations
```
"Akuter transmuraler Myokardinfarkt" → "Ak. transm. MI"
```

### Stage 3: Frame Assembly + Triage

Deterministic triage per ESC/AHA/SSC guidelines:

| Criterion | P1 Threshold |
|-----------|-------------|
| Systolic BP | < 90 mmHg |
| SpO2 | < 90% |
| Heart rate | > 150 bpm |
| Lactate | > 4.0 mmol/L |
| hsTroponin I | > 52 ng/L |

## Usage

### Basic Pipeline Execution

```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core"

// Run pipeline on built-in scenario
const result = await pipeline(FHIR_STEMI)

console.log(result.frame.tri)        // "P1"
console.log(result.frame.alg)        // Allergies
console.log(result.benchmark.reduction_pct)  // 93.9

// Get compact DSL string
const comptext = serializeFrame(result.frame)
```

### Process Custom FHIR Bundle

```typescript
import { pipeline } from "@comptext/core"

const myBundle = {
  resourceType: "Bundle",
  id: "patient-123",
  entry: [...]
}

const result = await pipeline(myBundle)
```

### Run All Scenarios

```typescript
import { pipelineAll } from "@comptext/core"

const allResults = await pipelineAll()
// Returns: { STEMI: {...}, SEPSIS: {...}, ... }
```

## Built-in Clinical Scenarios

| Scenario | ICD-10 | Key Values | Safety Alert |
|----------|--------|------------|--------------|
| STEMI | I21.09 | hsTnI 4847, sBP 82 | Jodkontrastmittel ALG |
| SEPSIS | A41.9 | Laktat 4.8, PCT 38.4 | Penicillin Grade III |
| STROKE | I63.3 | NIHSS 14, Onset 2h | Rivaroxaban LYSE-KI |
| ANAPHYLAXIE | T78.2 | sBP 64, SpO2 87 | Hymenoptera + Asthma |
| DM_HYPO | E11.64 | BZ 1.8, eGFR 38 | Glibenclamid rebound |

## Output Format (CompText Frame)

```
CT:v5 SC:STEMI TRI:P1
VS[hr:118 sbp:82 spo2:91]
LAB[hsTnI:4847 ckmb:48.7]
ALG:Jodkontrastmittel SEV:II KI:[V08,V09]
RX:Aspirin ATC:1191 DOSE:500mg FREQ:Einmalgabe
ICD:[I21.09]
CTX:Ak. transm. MI VW KS; KM-ALG Grad II
GDPR:ART9 PHI:3f8a1c2d TS:1710509000
```

## Safety-Critical Fields (Never Compressed)

- `alg` - Allergies with severity grades
- `rx` - Medications with contraindications
- `tri` - Triage classification
- Critical vital signs with directional arrows (↑↓)

## GDPR Compliance

- Art. 5(1)(c): Data minimization
- Art. 25: Data protection by design
- One-way FNV-1a hashing for PHI
- No reversible identifiers in output

## Additional Resources

### Reference Files
- **`references/fhir-mapping.md`** - LOINC/SNOMED/ICD-10 mappings
- **`references/triage-criteria.md`** - P1/P2/P3 thresholds by guideline
- **`references/gdpr-compliance.md`** - Privacy implementation details

### Example Files
- **`examples/stemi-pipeline.ts`** - Complete STEMI processing example
- **`examples/custom-bundle.ts`** - Processing custom FHIR data

### Scripts
- **`scripts/benchmark.ts`** - Token reduction benchmarking
- **`scripts/validate-frame.ts`** - Frame structure validation

## Error Handling

```typescript
import { CompTextError } from "@comptext/core"

try {
  const result = await pipeline(bundle)
} catch (error) {
  if (error instanceof CompTextError) {
    console.log(error.code)  // "INVALID_FHIR" | "PHI_SCRUB_FAILED" | ...
    console.log(error.context)
  }
}
```

## Benchmarks

| Scenario | FHIR Raw | CompText | Reduction |
|----------|----------|----------|-----------|
| STEMI | 1,847 | 112 | 93.9% |
| SEPSIS | 2,213 | 131 | 94.1% |
| STROKE | 2,041 | 124 | 93.9% |
| ANAPHYLAXIE | 1,742 | 108 | 93.8% |
| DM_HYPO | 1,963 | 119 | 93.9% |

## Clinical References

- STEMI: ESC Guidelines 2023
- Sepsis: Surviving Sepsis Campaign 2021
- Stroke: AHA/ASA 2019 + 2022 Update
- Anaphylaxis: WAO 2020 / DGAKI 2021
- DM: ADA Standards 2024
