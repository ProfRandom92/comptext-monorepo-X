# Clinical Scenarios

Five fully validated FHIR R4 bundles are included with `@comptext/core`. Each scenario is medically accurate and covers a distinct emergency medicine use case.

## Scenarios

| Scenario        | ICD-10        | Key Values                   | Alert                                       |
| --------------- | ------------- | ---------------------------- | ------------------------------------------- |
| **STEMI**       | I21.09        | hsTnI 4847 ng/L, sBP 82 mmHg | Jodkontrastmittel → imaging protocol change |
| **Sepsis**      | A41.9 + J18.9 | Laktat 4.8, PCT 38.4 µg/L    | Penicillin Grade III → Ceftriaxon           |
| **Stroke**      | I63.3         | NIHSS 14, Onset 2h           | Rivaroxaban → lyse KI (NOAC < 48h)          |
| **Anaphylaxie** | T78.2         | sBP 64, SpO2 87%             | Hymenoptera + Asthma → bronchospasm risk    |
| **DM Hypo**     | E11.64        | BZ 1.8 mmol/L, eGFR 38       | Glibenclamid + CKD → rebound 24h monitoring |

## Triage Results

All five scenarios correctly classify as **P1** (immediate):

| Scenario    | Trigger                       | Result |
| ----------- | ----------------------------- | ------ |
| STEMI       | sBP 82 mmHg + hsTnI 4847 ng/L | P1 ✅  |
| Sepsis      | Laktat 4.8 + sBP 76 + qSOFA 3 | P1 ✅  |
| Stroke      | ICD I63.3 + NIHSS 14          | P1 ✅  |
| Anaphylaxie | sBP 64 + SpO2 87% + ICD T78.2 | P1 ✅  |
| DM Hypo     | BZ 1.8 mmol/L + ICD E11.64    | P1 ✅  |

## Usage

```typescript
import {
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  ALL_FHIR_BUNDLES,
  pipeline,
  pipelineAll,
} from "@comptext/core";

// Single scenario
const result = await pipeline(FHIR_STEMI);

// All 5 scenarios (benchmarking)
const all = await pipelineAll();
```

## Clinical References

- **STEMI:** ESC Guidelines 2023 (DOI:10.1093/eurheartj/ehad191)
- **Sepsis:** Surviving Sepsis Campaign 2021 (DOI:10.1097/CCM.0000000000005337)
- **Stroke:** AHA/ASA Stroke Guidelines 2019 + 2022 Update
- **Anaphylaxie:** WAO Anaphylaxis Guidelines 2020; DGAKI-Leitlinie 2021
- **DM Hypo:** ADA Standards of Care 2024; DDG/DGIM 2023
