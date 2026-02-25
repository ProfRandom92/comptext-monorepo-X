# Getting Started

This guide walks you through installing `@comptext/core` and running your first pipeline.

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

---

## Installation

```bash
npm install @comptext/core
```

---

## Your First Pipeline Run

```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core"

// Run the full pipeline on a built-in STEMI scenario
const result = await pipeline(FHIR_STEMI)

// Triage classification
console.log(result.frame.tri)   // "P1"

// Safety-critical allergy
console.log(result.frame.alg)
// [{ ag: "Jodkontrastmittel", sev: "II", rx: ["V08", "V09"] }]

// Token reduction achieved
console.log(result.benchmark.reduction_pct)  // 93.9

// Compact DSL string for LLM input
const dsl = serializeFrame(result.frame)
console.log(dsl)
```

**Output:**
```
CT:v5 SC:STEMI TRI:P1
VS[hr:118 sbp:82↓↓ spo2:91↓]
LAB[hsTnI:4847ng/L↑↑ ckmb:48.7µg/L↑↑]
ALG:Jodkontrastmittel SEV:II KI:[V08,V09]
RX:Aspirin ATC:1191 DOSE:500mg FREQ:1x iv
ICD:[I21.09]
CTX:Ak. transm. MI VW KS; KM-ALG Grad II; Erstvorstellung
GDPR:ART9 PHI:3f8a1c2d TS:1710509000
```

---

## Using Your Own FHIR Bundle

```typescript
import { pipeline, serializeFrame, CompTextError } from "@comptext/core"
import type { FHIRBundle } from "@comptext/core"

const myBundle: FHIRBundle = {
  resourceType: "Bundle",
  id: "my-bundle-001",
  type: "collection",
  timestamp: new Date().toISOString(),
  total: 5,
  entry: [
    // Patient, Observations, Conditions, MedicationStatements ...
  ]
}

try {
  const result = await pipeline(myBundle)
  const dsl = serializeFrame(result.frame)
  // Send `dsl` to your LLM ...
} catch (error) {
  if (error instanceof CompTextError) {
    console.error(`[${error.code}] ${error.message}`)
  }
}
```

---

## Run All Built-in Scenarios

```typescript
import { pipelineAll } from "@comptext/core"

const results = await pipelineAll()

for (const [scenario, result] of Object.entries(results)) {
  console.log(`${scenario}: ${result.benchmark.reduction_pct}% reduction, triage ${result.frame.tri}`)
}
// stemi: 93.9% reduction, triage P1
// sepsis: 94.1% reduction, triage P1
// stroke: 93.9% reduction, triage P1
// anaphylaxie: 93.8% reduction, triage P1
// dm_hypo: 93.9% reduction, triage P2
```

---

## Available Built-in Bundles

```typescript
import {
  FHIR_STEMI,         // ST-Elevation Myocardial Infarction
  FHIR_SEPSIS,        // Sepsis / Septic Shock
  FHIR_STROKE,        // Ischaemic Stroke
  FHIR_ANAPHYLAXIE,   // Anaphylaxis
  FHIR_DM_HYPO,       // Diabetic Hypoglycaemia
  ALL_FHIR_BUNDLES,   // All 5 as Record<string, FHIRBundle>
  TOKEN_BENCHMARKS,   // Pre-computed token benchmarks
} from "@comptext/core"
```

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/ProfRandom92/comptext-monorepo-X.git
cd comptext-monorepo-X

# Install all workspace dependencies
npm install

# Build @comptext/core
npm run build -w packages/core

# Run tests (31 unit tests)
npm run test -w packages/core

# Start the React visualizer
npm run dev -w packages/visualizer
```

---

## Next Steps

- **[[Architecture]]** — Understand how the three pipeline stages work
- **[[API-Reference]]** — Full TypeScript API documentation
- **[[Clinical-Scenarios]]** — Explore the 5 built-in medical scenarios
- **[[DSL-Specification]]** — CompText DSL v5 format reference
