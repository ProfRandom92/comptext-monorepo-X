# API Reference

> Full TypeScript API documentation for `@comptext/core`.  
> Source: [`docs/API.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/API.md)

---

## Main Functions

### `pipeline(bundle)`

Runs the full CompText pipeline on a FHIR R4 bundle.

```typescript
function pipeline(bundle: FHIRBundle): Promise<PipelineResult>
```

**Throws** `CompTextError` for invalid input or processing errors.

```typescript
import { pipeline, FHIR_STEMI } from "@comptext/core"

const result = await pipeline(FHIR_STEMI)
console.log(result.frame.tri)                 // "P1"
console.log(result.benchmark.reduction_pct)   // 93.9
console.log(result.benchmark.gdpr_compliant)  // true
```

---

### `serializeFrame(frame)`

Converts a `CompTextFrame` to the compact DSL string for LLM input.

```typescript
function serializeFrame(frame: CompTextFrame): string
```

```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core"

const result = await pipeline(FHIR_STEMI)
const dsl = serializeFrame(result.frame)
// CT:v5 SC:STEMI TRI:P1
// VS[hr:118 sbp:82↓↓ spo2:91↓]
// ...
```

---

### `pipelineAll()`

Runs the pipeline on all 5 built-in scenarios.

```typescript
function pipelineAll(): Promise<Record<string, PipelineResult>>
```

---

## Key Types

### `PipelineResult`

```typescript
interface PipelineResult {
  input: {
    bundle_id: string
    scenario_id: string
    token_count: number   // raw FHIR token count
    fhir_bytes: number
  }
  nurse: NURSEOutput      // PHI scrubbing result
  kvtc: KVTCOutput        // compression result
  frame: CompTextFrame    // final LLM-ready output
  benchmark: {
    total_ms: number
    reduction_pct: number
    gdpr_compliant: boolean
  }
}
```

---

### `CompTextFrame`

The final pipeline output — the compressed frame for LLM consumption.

```typescript
interface CompTextFrame {
  v: "5"              // schema version
  sc: ScenarioCode    // scenario type
  tri: TriageClass    // triage classification
  alg: AllergyCode[]  // safety-critical allergies — NEVER compressed
  rx: MedicationCode[] // medications with clinical flags
  vs: VitalSigns      // vital signs
  lab: LabValues      // key lab values
  ctx: string         // compressed clinical narrative
  icd: string[]       // ICD-10 codes
  ts: number          // unix timestamp
  gdpr: GDPRMarker    // GDPR compliance marker
}
```

---

### `ScenarioCode`

```typescript
type ScenarioCode =
  | "STEMI"     // ST-Elevation Myocardial Infarction
  | "SEPSIS"    // Sepsis / Septic Shock
  | "STROKE"    // Ischaemic Stroke
  | "ANAPH"     // Anaphylaxis
  | "DM-HYPO"   // Diabetic Hypoglycaemia
  | "TRAUMA"    // Polytrauma
  | "ACS"       // Acute Coronary Syndrome
  | "HF-DECOMP" // Decompensated Heart Failure
```

---

### `TriageClass`

```typescript
type TriageClass = "P1" | "P2" | "P3" | "P4"
// P1 = Immediate (life-threatening)
// P2 = Emergency (urgent)
// P3 = Urgent (less urgent)
// P4 = Less urgent (non-urgent)
```

---

### `AllergyCode`

Safety-critical allergy codes — always fully expanded, never abbreviated.

```typescript
interface AllergyCode {
  ag: string              // allergen name (SNOMED preferred, max 20 chars)
  sev: "I" | "II" | "III" | "IV"  // WAO/AWMF severity grade
  rx?: string[]           // contraindicated ATC drug classes
  note?: string           // clinical note (max 60 chars)
}
```

---

### `GDPRMarker`

```typescript
interface GDPRMarker {
  art9: true              // Art. 9 GDPR — special category health data processed
  phi_hash: string        // FNV-1a hash (8 hex chars, not reversible)
  scrubbed_at: number     // timestamp of PHI removal
  minimized: true         // data minimisation applied
}
```

---

## Error Handling

All pipeline errors are thrown as `CompTextError`:

```typescript
class CompTextError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_FHIR"
      | "PHI_SCRUB_FAILED"
      | "KVTC_ERROR"
      | "TRIAGE_UNKNOWN"
      | "NO_RESOURCES",
    public readonly context?: Record<string, unknown>
  )
}
```

| Code | Meaning |
|------|---------|
| `INVALID_FHIR` | Input is not a valid FHIR Bundle |
| `PHI_SCRUB_FAILED` | NURSE stage failed to remove PHI |
| `KVTC_ERROR` | Compression stage error |
| `TRIAGE_UNKNOWN` | No triage criterion matched |
| `NO_RESOURCES` | Bundle contains no entries |

---

## Built-in Constants

```typescript
import {
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  ALL_FHIR_BUNDLES,   // Record<string, FHIRBundle>
  TOKEN_BENCHMARKS,   // Record<string, TokenBenchmark>
} from "@comptext/core"
```

---

## Low-level Compiler Functions

Individual pipeline stages can be used directly:

```typescript
import { runNURSE } from "@comptext/core/compiler/nurse"
import { runKVTC } from "@comptext/core/compiler/kvtc"
import { assembleFrame } from "@comptext/core/compiler/triage"

const nurse = runNURSE(bundle)
const kvtc = runKVTC(nurse)
const { frame, meta } = assembleFrame(bundle, nurse, kvtc)
```

---

> 📄 Full API documentation with all types: [`docs/API.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/API.md)
