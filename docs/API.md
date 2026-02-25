# CompText API Reference

> **@comptext/core** — Vollständige API-Dokumentation für die Clinical AI Preprocessing Pipeline

---

## Inhaltsverzeichnis

- [Schnellstart](#schnellstart)
- [Hauptfunktionen](#hauptfunktionen)
- [TypeScript-Typen](#typescript-typen)
- [Exportierte Konstanten](#exportierte-konstanten)
- [Fehlerbehandlung](#fehlerbehandlung)
- [Compiler-Funktionen](#compiler-funktionen)
- [Beispiele](#beispiele)

---

## Schnellstart

```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core"

// Pipeline auf STEMI-Szenario ausführen
const result = await pipeline(FHIR_STEMI)

console.log(result.frame.tri)     // "P1"
console.log(result.frame.alg)     // Allergien
console.log(result.benchmark.reduction_pct)  // 93.9

// In DSL-String serialisieren
const dsl = serializeFrame(result.frame)
// CT:v5 SC:STEMI TRI:P1
// VS[hr:118 sbp:82 spo2:91]
// ...
```

---

## Hauptfunktionen

### `pipeline(bundle: FHIRBundle): Promise<PipelineResult>`

Führt die vollständige CompText-Pipeline auf einem FHIR R4 Bundle aus.

**Parameter:**
| Name | Typ | Beschreibung |
|------|-----|--------------|
| `bundle` | `FHIRBundle` | FHIR R4 Bundle mit Patient, Observations, Conditions, Medications |

**Returns:** `Promise<PipelineResult>`

**Throws:** `CompTextError` bei ungültigem Input oder Verarbeitungsfehlern

**Beispiel:**
```typescript
import { pipeline, FHIR_STEMI } from "@comptext/core"

try {
  const result = await pipeline(FHIR_STEMI)
  console.log(`Token-Reduktion: ${result.benchmark.reduction_pct}%`)
  console.log(`Triage-Klasse: ${result.frame.tri}`)
} catch (error) {
  if (error.code === "INVALID_FHIR") {
    console.error("Ungültiges FHIR-Format")
  }
}
```

---

### `pipelineAll(): Promise<Record<string, PipelineResult>>`

Führt die Pipeline auf allen 5 eingebauten klinischen Szenarien aus.

**Returns:** `Promise<Record<string, PipelineResult>>`

**Beispiel:**
```typescript
import { pipelineAll } from "@comptext/core"

const allResults = await pipelineAll()

for (const [scenario, result] of Object.entries(allResults)) {
  console.log(`${scenario}: ${result.benchmark.reduction_pct}% reduction`)
}
// Output:
// stemi: 93.9% reduction
// sepsis: 94.1% reduction
// ...
```

---

### `serializeFrame(frame: CompTextFrame): string`

Konvertiert einen CompTextFrame in das kompakte DSL-String-Format für LLM-Input.

**Parameter:**
| Name | Typ | Beschreibung |
|------|-----|--------------|
| `frame` | `CompTextFrame` | Der zu serialisierende Frame |

**Returns:** `string` — CompText DSL v5 String

**Beispiel:**
```typescript
import { pipeline, FHIR_STEMI, serializeFrame } from "@comptext/core"

const result = await pipeline(FHIR_STEMI)
const dsl = serializeFrame(result.frame)

console.log(dsl)
// CT:v5 SC:STEMI TRI:P1
// VS[hr:118 sbp:82 spo2:91]
// LAB[hsTnI:4847 ckmb:48.7]
// ALG:Jodkontrastmittel SEV:II KI:[V08,V09]
// RX:Aspirin ATC:1191 DOSE:500mg FREQ:Einmalgabe
// ICD:[I21.09]
// CTX:Ak. transm. MI VW KS; KM-ALG Grad II
// GDPR:ART9 PHI:3f8a1c2d TS:1710509000
```

---

## TypeScript-Typen

### Core DSL Types

#### `CompTextFrame`

Der finale Output der Pipeline — das komprimierte Frame für LLM-Konsum.

```typescript
interface CompTextFrame {
  /** Schema-Version */
  v: "5"
  /** Szenario-Typ */
  sc: ScenarioCode
  /** Triage-Klassifikation */
  tri: TriageClass
  /** Sicherheitskritische Allergien — NIE komprimiert */
  alg: AllergyCode[]
  /** Medikamente mit klinischen Flags */
  rx: MedicationCode[]
  /** Vitalzeichen — kompakte Notation */
  vs: VitalSigns
  /** Laborwerte — nur Schlüsselwerte */
  lab: LabValues
  /** Klinischer Kontext — komprimierte Narrative */
  ctx: string
  /** ICD-10 Codes */
  icd: string[]
  /** Unix-Zeitstempel (Sekunden) */
  ts: number
  /** DSGVO-Compliance-Marker */
  gdpr: GDPRMarker
  /** Pipeline-Metadaten (optional) */
  _pipe?: PipelineMeta
  /** Geschätzte Token-Anzahl */
  tokens?: number
}
```

---

#### `ScenarioCode`

Unterstützte klinische Szenarien:

```typescript
type ScenarioCode =
  | "STEMI"      // ST-Elevation Myocardial Infarction
  | "SEPSIS"     // Sepsis / Septischer Schock
  | "STROKE"     // Ischämischer Schlaganfall
  | "ANAPH"      // Anaphylaxie
  | "DM-HYPO"    // Diabetische Hypoglykämie
  | "TRAUMA"     // Polytrauma
  | "ACS"        // Akutes Koronarsyndrom
  | "HF-DECOMP"  // Dekompensierte Herzinsuffizienz
```

---

#### `TriageClass`

Triage-Klassifikation nach internationalen Leitlinien:

```typescript
type TriageClass = "P1" | "P2" | "P3" | "P4"
// P1 = Lebensbedrohlich (Immediate)
// P2 = Dringend (Emergency)
// P3 = Weniger dringend (Urgent)
// P4 = Nicht dringend (Less urgent)
```

---

#### `AllergyCode`

Sicherheitskritische Allergie-Codes — immer expandiert, nie abgekürzt.

```typescript
interface AllergyCode {
  /** Allergen (SNOMED bevorzugter Begriff, max 20 Zeichen) */
  ag: string
  /** WAO/AWMF-Schweregrad */
  sev: "I" | "II" | "III" | "IV"
  /** Kontraindizierte Arzneimittelklassen (ATC-Codes) */
  rx?: string[]
  /** Klinische Notiz (max 60 Zeichen) */
  note?: string
}
```

**Beispiel:**
```typescript
{
  ag: "Jodkontrastmittel",
  sev: "II",
  rx: ["V08", "V09"],
  note: "Urtikaria, Bronchospasmus"
}
```

---

#### `MedicationCode`

Medikament mit klinischen Relevanz-Markern.

```typescript
interface MedicationCode {
  /** ATC-Code (WHO) */
  atc: string
  /** INN, max 20 Zeichen */
  name: string
  /** Kompakte Dosis-Notation "500mg iv" */
  dose: string
  /** Kompakte Frequenz "1x/d" */
  freq: string
  /** Kontraindikation / klinische Alerts */
  ki?: string[]
}
```

**Beispiel:**
```typescript
{
  atc: "B01AF01",
  name: "Rivaroxaban",
  dose: "20mg",
  freq: "1x/d",
  ki: ["LYSE-KI:NOAC<48h"]
}
```

---

#### `VitalSigns`

Vitalzeichen in kompakter Notation.

```typescript
interface VitalSigns {
  hr?: number      // bpm - Herzfrequenz
  sbp?: number     // mmHg - Systolischer Blutdruck
  dbp?: number     // mmHg - Diastolischer Blutdruck
  spo2?: number    // % - O2-Sättigung
  rr?: number      // /min - Atemfrequenz
  temp?: number    // °C - Temperatur
  gcs?: number     // 3-15 - Glasgow Coma Scale
  map?: number     // mmHg - Mittlerer arterieller Druck
}
```

---

#### `LabValues`

Laborwerte — nur Schlüsselwerte relevant für das Szenario.

```typescript
interface LabValues {
  // Cardiac
  hs_tni?: number      // ng/L - hsTroponin I
  ckmb?: number        // µg/L - CK-MB

  // Infection/Sepsis
  pct?: number         // µg/L - Procalcitonin
  crp?: number         // mg/L - CRP
  lactate?: number     // mmol/L - Laktat

  // Neurology
  glucose?: number     // mmol/L - Glukose

  // Renal
  egfr?: number        // mL/min/1.73m²
  creatinine?: number  // µmol/L

  // Coagulation
  inr?: number
  aptt?: number        // s

  // Hematology
  hb?: number          // g/dL - Hämoglobin
  wbc?: number         // 10^9/L - Leukozyten
  plt?: number         // 10^9/L - Thrombozyten
}
```

---

#### `GDPRMarker`

DSGVO-Compliance-Marker für jeden Frame.

```typescript
interface GDPRMarker {
  /** Art. 9 DSGVO — besondere Kategorien personenbezogener Daten */
  art9: true
  /** PHI-Hash (FNV-1a, 8 Hex-Zeichen, nicht umkehrbar) */
  phi_hash: string
  /** Zeitstempel der PHI-Entfernung */
  scrubbed_at: number
  /** Datenminimierung angewendet */
  minimized: true
}
```

---

### Pipeline Types

#### `PipelineResult`

Das vollständige Ergebnis der Pipeline-Ausführung.

```typescript
interface PipelineResult {
  input: {
    bundle_id: string
    scenario_id: string
    token_count: number
    fhir_bytes: number
  }
  nurse: NURSEOutput      // PHI-Scrubbing Ergebnis
  kvtc: KVTCOutput        // Kompressions-Ergebnis
  frame: CompTextFrame    // Finaler Output für LLM
  benchmark: {
    total_ms: number
    reduction_pct: number
    gdpr_compliant: boolean
  }
}
```

---

#### `NURSEOutput`

Output der NURSE-Stage (PHI-Scrubbing + Deduplizierung).

```typescript
interface NURSEOutput {
  bundle_id: string
  scrubbed: boolean
  phi_hash: string
  phi_fields_removed: number
  phi_regex_matches: number
  token_in: number
  token_out: number
  resources: NURSEResource[]
}

interface NURSEResource {
  type: string
  id_hash: string
  fields: Record<string, unknown>
}
```

---

#### `KVTCOutput`

Output der KVTC-Stage (4-Layer-Kompression).

```typescript
interface KVTCOutput {
  layer_k: KLayerOutput   // Key extraction
  layer_v: VLayerOutput   // Value normalization
  layer_t: TLayerOutput   // Type encoding
  layer_c: CLayerOutput   // Context compression
  token_in: number
  token_out: number
}

interface KLayerOutput {
  pairs: Array<{
    loinc: string
    display: string
    value: number
    unit: string
    interp?: string
  }>
  token_saved: number
}

interface VLayerOutput {
  normalized: Array<{
    key: string
    compact: string
    critical: boolean
  }>
  token_saved: number
}

interface TLayerOutput {
  encoded: Record<string, string>
  token_saved: number
}

interface CLayerOutput {
  narrative: string
  token_saved: number
}
```

---

#### `PipelineMeta`

Metadaten zur Pipeline-Ausführung.

```typescript
interface PipelineMeta {
  tok_in: number
  tok_out: number
  reduction_pct: number
  stages: Array<{
    name: string
    tok: number
    ms: number
  }>
  total_ms: number
}
```

---

### FHIR Types

#### `FHIRBundle`

FHIR R4 Bundle — Eingabeformat für die Pipeline.

```typescript
interface FHIRBundle {
  resourceType: "Bundle"
  id: string
  type: "collection"
  timestamp: string
  total: number
  entry: Array<{
    resource: FHIRPatient | FHIRObservation | FHIRCondition | FHIRMedicationStatement
  }>
  // Abgeleitete Metadaten (nicht im FHIR-Spec)
  _meta?: {
    scenarioId: string
    triageClass: "P1" | "P2" | "P3"
    tokenCountRaw: number
    encodedAt: string
  }
}
```

---

#### `FHIRPatient`

```typescript
interface FHIRPatient {
  resourceType: "Patient"
  id: string
  meta: {
    versionId: string
    lastUpdated: string
    profile: string[]
  }
  identifier: Array<{
    use: string
    type: { coding: Array<{ system: string; code: string; display: string }> }
    system: string
    value: string
  }>
  name: Array<{ use: string; family: string; given: string[] }>
  gender: string
  birthDate: string
  address: Array<{
    use: string
    line: string[]
    city: string
    postalCode: string
    country: string
  }>
  telecom: Array<{ system: string; value: string; use: string }>
}
```

---

#### `FHIRObservation`

```typescript
interface FHIRObservation {
  resourceType: "Observation"
  id: string
  status: string
  category: Array<{
    coding: Array<{ system: string; code: string; display?: string }>
  }>
  code: {
    coding: Array<{ system: string; code: string; display: string }>
    text: string
  }
  subject: { reference: string }
  effectiveDateTime: string
  valueQuantity?: {
    value: number
    unit: string
    system: string
    code: string
  }
  interpretation?: Array<{
    coding: Array<{ system: string; code: string; display?: string }>
  }>
  referenceRange?: Array<{
    low?: { value: number; unit?: string }
    high?: { value: number; unit?: string }
    text?: string
    unit?: string
  }>
}
```

---

#### `FHIRCondition`

```typescript
interface FHIRCondition {
  resourceType: "Condition"
  id: string
  clinicalStatus: { coding: Array<{ system: string; code: string }> }
  verificationStatus: { coding: Array<{ system: string; code: string }> }
  category: Array<{
    coding: Array<{ system: string; code: string; display: string }>
  }>
  severity: { coding: Array<{ system: string; code: string; display: string }> }
  code: {
    coding: Array<{
      system: string
      code: string
      display: string
      system2?: string
    }>
    text: string
  }
  subject: { reference: string }
  onsetDateTime: string
  recordedDate: string
}
```

---

#### `FHIRMedicationStatement`

```typescript
interface FHIRMedicationStatement {
  resourceType: "MedicationStatement"
  id: string
  status: string
  medicationCodeableConcept: {
    coding: Array<{ system: string; code: string; display: string }>
    text: string
  }
  subject: { reference: string }
  effectivePeriod: { start: string }
  dosage: Array<{
    text: string
    timing: {
      repeat: {
        frequency: number
        period: number
        periodUnit: string
      }
    }
    doseAndRate: Array<{
      doseQuantity: {
        value: number
        unit: string
        system: string
        code: string
      }
    }>
  }>
}
```

---

### Benchmark Types

#### `TokenBenchmark`

Token-Count-Benchmarks für alle Szenarien.

```typescript
interface TokenBenchmark {
  scenarioId: string
  fhirJsonBytes: number
  // GPT-4 / Claude (cl100k_base)
  gpt4_raw: number
  gpt4_nurse: number
  gpt4_kvtc: number
  gpt4_comptext: number
  gpt4_reduction_pct: number
  // Gemini 1.5 / MedGemma (SentencePiece)
  gemini_raw: number
  gemini_nurse: number
  gemini_kvtc: number
  gemini_comptext: number
  gemini_reduction_pct: number
  // Inferenz-Latenz (MedGemma 27B, A100 40GB, batch=1)
  latency_raw_ms: number
  latency_comptext_ms: number
  latency_reduction_pct: number
}
```

---

## Exportierte Konstanten

### Eingebaute FHIR-Bundles

```typescript
import {
  FHIR_STEMI,           // ST-Elevation Myocardial Infarction
  FHIR_SEPSIS,          // Sepsis / Septischer Schock
  FHIR_STROKE,          // Ischämischer Schlaganfall
  FHIR_ANAPHYLAXIE,     // Anaphylaxie
  FHIR_DM_HYPO,         // Diabetische Hypoglykämie
  ALL_FHIR_BUNDLES,     // Alle 5 Szenarien als Record
  TOKEN_BENCHMARKS,     // Token-Benchmarks
} from "@comptext/core"
```

---

## Fehlerbehandlung

### `CompTextError`

Alle Pipeline-Fehler werden als `CompTextError` geworfen.

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

**Error Codes:**

| Code | Bedeutung |
|------|-----------|
| `INVALID_FHIR` | Input ist kein gültiges FHIR Bundle |
| `PHI_SCRUB_FAILED` | NURSE-Stage konnte PHI nicht entfernen |
| `KVTC_ERROR` | Kompressions-Stage fehlgeschlagen |
| `TRIAGE_UNKNOWN` | Kein Triage-Kriterium erkannt |
| `NO_RESOURCES` | Bundle enthält keine Einträge |

**Beispiel:**
```typescript
import { pipeline, CompTextError } from "@comptext/core"

try {
  const result = await pipeline(myBundle)
} catch (error) {
  if (error instanceof CompTextError) {
    switch (error.code) {
      case "INVALID_FHIR":
        console.error("Ungültiges FHIR:", error.message)
        break
      case "NO_RESOURCES":
        console.error("Leeres Bundle:", error.context?.bundle_id)
        break
      default:
        console.error("Pipeline-Fehler:", error.code)
    }
  }
}
```

---

## Compiler-Funktionen

### NURSE Stage

```typescript
import { runNURSE } from "@comptext/core/compiler/nurse"
import type { NURSEOutput } from "@comptext/core"

const nurse: NURSEOutput = runNURSE(bundle)
```

**Features:**
- PHI-Entfernung nach GDPR Art. 25
- Deduplizierung von Observations (nach LOINC-Code)
- Regex-basierte PHI-Erkennung in Freitext-Feldern
- FNV-1a Hashing für Audit-Trail

---

### KVTC Stage

```typescript
import { runKVTC } from "@comptext/core/compiler/kvtc"
import type { KVTCOutput } from "@comptext/core"

const kvtc: KVTCOutput = runKVTC(nurseOutput)
```

**Features:**
- **K-Layer**: LOINC-Codes → klinische Kürzel
- **V-Layer**: SI-Einheit-Normalisierung
- **T-Layer**: FHIR-Typen → CompText-Codes
- **C-Layer**: Klinische Abkürzungen

---

### Triage / Frame Assembly

```typescript
import { assembleFrame } from "@comptext/core/compiler/triage"
import type { CompTextFrame } from "@comptext/core"

const { frame, meta } = assembleFrame(bundle, nurseOutput, kvtcOutput)
```

**Features:**
- Triage-Klassifikation (P1/P2/P3) nach ESC/AHA/SSC-Leitlinien
- Extraktion von Allergien und Medikamenten
- Frame-Assembly mit GDPR-Markern

---

## Beispiele

### Beispiel 1: Eigene FHIR-Daten verarbeiten

```typescript
import { pipeline, serializeFrame, CompTextError } from "@comptext/core"

// Dein eigenes FHIR Bundle
const myBundle = {
  resourceType: "Bundle",
  id: "bundle-custom-001",
  type: "collection",
  timestamp: new Date().toISOString(),
  total: 5,
  entry: [
    // Patient, Observations, Conditions, Medications...
  ]
}

try {
  const result = await pipeline(myBundle)

  console.log("=== Pipeline Ergebnis ===")
  console.log(`Bundle ID: ${result.input.bundle_id}`)
  console.log(`Szenario: ${result.frame.sc}`)
  console.log(`Triage: ${result.frame.tri}`)
  console.log(`Token-Reduktion: ${result.benchmark.reduction_pct}%`)
  console.log(`Verarbeitungszeit: ${result.benchmark.total_ms}ms`)
  console.log(`DSGVO-konform: ${result.benchmark.gdpr_compliant}`)

  // DSL-Output für LLM
  const dsl = serializeFrame(result.frame)
  console.log("\n=== CompText DSL ===")
  console.log(dsl)

} catch (error) {
  if (error instanceof CompTextError) {
    console.error(`Fehler [${error.code}]:`, error.message)
  }
}
```

---

### Beispiel 2: Benchmark für alle Szenarien

```typescript
import { pipelineAll, TOKEN_BENCHMARKS } from "@comptext/core"

async function runBenchmark() {
  const results = await pipelineAll()

  console.log("=== Token-Benchmarks ===\n")

  for (const [scenario, result] of Object.entries(results)) {
    const benchmark = TOKEN_BENCHMARKS[scenario]

    console.log(`${scenario.toUpperCase()}:`)
    console.log(`  Raw FHIR:     ${benchmark.gpt4_raw} tokens`)
    console.log(`  CompText:     ${benchmark.gpt4_comptext} tokens`)
    console.log(`  Reduktion:    ${benchmark.gpt4_reduction_pct}%`)
    console.log(`  Latenz-Verbesserung: ${benchmark.latency_reduction_pct}%`)
    console.log(`  Triage:       ${result.frame.tri}`)
    console.log()
  }
}

runBenchmark()
```

---

### Beispiel 3: Einzelne Stages verwenden

```typescript
import { runNURSE } from "@comptext/core/compiler/nurse"
import { runKVTC } from "@comptext/core/compiler/kvtc"
import { assembleFrame } from "@comptext/core/compiler/triage"
import { FHIR_STEMI } from "@comptext/core"

// Nur NURSE-Stage
const nurse = runNURSE(FHIR_STEMI)
console.log(`PHI-Felder entfernt: ${nurse.phi_fields_removed}`)
console.log(`Regex-Matches: ${nurse.phi_regex_matches}`)
console.log(`Tokens: ${nurse.token_in} → ${nurse.token_out}`)

// Nur KVTC-Stage
const kvtc = runKVTC(nurse)
console.log("K-Layer Keys:", kvtc.layer_k.pairs.map(p => p.display))
console.log("V-Layer Values:", kvtc.layer_v.normalized.map(n => n.compact))
console.log("C-Layer Narrative:", kvtc.layer_c.narrative)

// Frame Assembly
const { frame, meta } = assembleFrame(FHIR_STEMI, nurse, kvtc)
console.log(`Frame Triage: ${frame.tri}`)
console.log(`Allergien: ${frame.alg.map(a => a.ag).join(", ")}`)
```

---

### Beispiel 4: Fehlerbehandlung

```typescript
import { pipeline, CompTextError } from "@comptext/core"

async function safeProcess(bundle: unknown) {
  try {
    // Type-Check vor dem Aufruf
    if (!bundle || typeof bundle !== "object") {
      throw new Error("Bundle muss ein Object sein")
    }

    const result = await pipeline(bundle as FHIRBundle)
    return { success: true, result }

  } catch (error) {
    if (error instanceof CompTextError) {
      // Bekannter Fehler
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          context: error.context
        }
      }
    }

    // Unbekannter Fehler
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Unbekannter Fehler"
      }
    }
  }
}
```

---

### Beispiel 5: Frame-Daten für LLM extrahieren

```typescript
import { pipeline, FHIR_SEPSIS } from "@comptext/core"

async function extractLLMContext() {
  const result = await pipeline(FHIR_SEPSIS)
  const frame = result.frame

  // Kritische Informationen für Prompt-Engineering
  const context = {
    // Triage
    priority: frame.tri,  // "P1"

    // Vitalzeichen
    vitals: frame.vs,   // { hr: 118, sbp: 82, spo2: 91 }

    // Labor
    labs: frame.lab,    // { lactate: 4.8, pct: 38.4 }

    // Allergien (kritisch!)
    allergies: frame.alg.map(a => ({
      allergen: a.ag,
      severity: a.sev,
      contraindicated: a.rx
    })),

    // Medikamente mit Alerts
    medications: frame.rx.map(m => ({
      name: m.name,
      atc: m.atc,
      dose: m.dose,
      alerts: m.ki
    })),

    // Diagnosen
    diagnoses: frame.icd,

    // Kontext
    narrative: frame.ctx
  }

  // Für LLM-Prompt
  const prompt = `
Patient: ${frame.sc} (${frame.tri})
Vitalzeichen: ${JSON.stringify(frame.vs)}
Labor: ${JSON.stringify(frame.lab)}
Allergien: ${frame.alg.map(a => `${a.ag} (Grad ${a.sev})`).join(", ")}
Medikamente: ${frame.rx.map(m => m.name).join(", ")}
Kontext: ${frame.ctx}
`

  return { context, prompt }
}
```

---

## Versionshinweise

| Version | Datum | Änderungen |
|---------|-------|------------|
| 5.0.0 | 2024-03 | Initiale Version mit NURSE, KVTC, Triage-Stages |

---

**Siehe auch:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Technische Architektur
- [DSL_SPEC.md](./DSL_SPEC.md) — DSL-Spezifikation
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Entwicklungsrichtlinien
