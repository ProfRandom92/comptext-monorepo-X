# API Reference

> See also: [`docs/API.md`](../blob/main/docs/API.md) for the complete reference.

## Installation

```bash
npm install @comptext/core
```

## Main Functions

### `pipeline(bundle)`

Runs the full CompText pipeline (NURSE → KVTC → Frame Assembly).

```typescript
import { pipeline, FHIR_STEMI } from "@comptext/core";

const result = await pipeline(FHIR_STEMI);
```

**Returns: `PipelineResult`**

```typescript
interface PipelineResult {
  input: { bundle_id: string; token_count: number; fhir_bytes: number };
  nurse: NURSEOutput; // PHI scrub result
  kvtc: KVTCOutput; // Compression result
  frame: CompTextFrame; // Final output for LLM
  benchmark: {
    total_ms: number;
    reduction_pct: number;
    gdpr_compliant: boolean;
  };
}
```

### `serializeFrame(frame)`

Converts a `CompTextFrame` to the compact DSL string for LLM input.

```typescript
import { serializeFrame } from "@comptext/core";

const dsl = serializeFrame(result.frame);
// CT:v5 SC:STEMI TRI:P1 ...
```

### `pipelineAll()`

Runs all 5 built-in scenarios. Useful for benchmarking.

```typescript
import { pipelineAll } from "@comptext/core";

const results = await pipelineAll();
// { STEMI: PipelineResult, SEPSIS: PipelineResult, ... }
```

## Built-in FHIR Bundles

```typescript
import {
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  ALL_FHIR_BUNDLES,
} from "@comptext/core";
```

## Token Benchmarks Constant

```typescript
import { TOKEN_BENCHMARKS } from "@comptext/core";

console.log(TOKEN_BENCHMARKS.STEMI.reduction_pct); // 93.9
```

## CompTextFrame Type

```typescript
interface CompTextFrame {
  v: string; // DSL version ("v5")
  sc: string; // Scenario code ("STEMI")
  tri: "P1" | "P2" | "P3";
  vs: VitalSigns;
  lab: LabValues;
  alg: Allergy[];
  rx: Medication[];
  icd: string[];
  ctx: string; // Compressed clinical context
  gdpr: GDPRMarker;
}
```
