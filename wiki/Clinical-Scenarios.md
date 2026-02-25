# Clinical Scenarios

CompText ships with **5 medically validated FHIR R4 bundles** covering the most common emergency scenarios. All values are based on published clinical guidelines.

---

## Scenario Overview

| Scenario | ICD-10 | Triage | Key Values | Alert |
|----------|--------|--------|------------|-------|
| STEMI | I21.09 | P1 | hsTnI 4847 ng/L, sBP 82 mmHg | Jodkontrastmittel → imaging protocol change |
| Sepsis | A41.9 + J18.9 | P1 | Laktat 4.8, PCT 38.4 µg/L | Penicillin Grade III → Ceftriaxon |
| Stroke | I63.3 | P1 | NIHSS 14, Onset 2h | Rivaroxaban → lyse KI (NOAC < 48h) |
| Anaphylaxie | T78.2 | P1 | sBP 64, SpO2 87% | Hymenoptera + Asthma → bronchospasm risk |
| DM Hypo | E11.64 | P2 | BZ 1.8 mmol/L, eGFR 38 | Glibenclamid + CKD → rebound 24h monitoring |

---

## STEMI (SC:STEMI)

**Clinical picture**: Acute transmural myocardial infarction with cardiogenic shock and contrast media allergy.

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

**P1 triggers**: hsTnI > 52 ng/L ✓ · sBP < 90 mmHg ✓ · ICD I21.x ✓  
**Safety alert**: Iodine contrast media allergy → PCI imaging protocol must be adapted  
**Reference**: ESC Guidelines 2023 (DOI:10.1093/eurheartj/ehad191)

```typescript
import { FHIR_STEMI } from "@comptext/core"
const result = await pipeline(FHIR_STEMI)
```

---

## Sepsis (SC:SEPSIS)

**Clinical picture**: Septic shock (A41.9) from community-acquired pneumonia (J18.9), Penicillin allergy Grade III.

```
CT:v5 SC:SEPSIS TRI:P1
VS[hr:135↑ sbp:76↓↓ rr:28↑ spo2:93↓]
LAB[lactate:4.8mmol/L↑↑ pct:38.4µg/L↑↑ crp:287mg/L↑]
ALG:Penicillin SEV:III KI:[J01CA,J01CE,J01CF,J01CR]
RX:Ceftriaxon ATC:J01DD04 DOSE:2g FREQ:1x iv
ICD:[A41.9,J18.9]
CTX:SepS bei CAP; qSOFA 3/3; Laktat 4.8
GDPR:ART9 PHI:7b3c9d2a TS:1710509100
```

**P1 triggers**: Lactate > 4.0 mmol/L ✓ · sBP < 90 mmHg ✓ · ICD A41.x ✓  
**Safety alert**: Penicillin allergy Grade III → Aminopenicillins and carbapenems with caution  
**Reference**: Surviving Sepsis Campaign 2021 (DOI:10.1097/CCM.0000000000005337)

```typescript
import { FHIR_SEPSIS } from "@comptext/core"
const result = await pipeline(FHIR_SEPSIS)
```

---

## Stroke (SC:STROKE)

**Clinical picture**: Ischaemic stroke (left MCA), NIHSS 14, 2-hour onset, Rivaroxaban therapy.

```
CT:v5 SC:STROKE TRI:P1
VS[hr:95 sbp:145 spo2:97]
LAB[glucose:6.4mmol/Ln]
RX:Rivaroxaban ATC:B01AF01 DOSE:20mg FREQ:1x/d KI:[LYSE-KI:NOAC<48h]
ICD:[I63.3]
CTX:Ak. isch. Stroke li. MCA; NIHSS 14; Onset 2h
GDPR:ART9 PHI:9e4f1b8c TS:1710509200
```

**P1 triggers**: ICD I63.x ✓ · NIHSS > 4 ✓  
**Safety alert**: Rivaroxaban < 48h → systemic thrombolysis contraindicated (LYSE-KI)  
**Reference**: AHA/ASA Stroke Guidelines 2019 + 2022 Update

```typescript
import { FHIR_STROKE } from "@comptext/core"
const result = await pipeline(FHIR_STROKE)
```

---

## Anaphylaxie (SC:ANAPH)

**Clinical picture**: Anaphylactic shock Grade III (WAO) after wasp sting, known hymenoptera allergy, asthma.

```
CT:v5 SC:ANAPH TRI:P1
VS[hr:142↑ sbp:64↓↓ spo2:87↓↓]
ALG:Hymenoptera SEV:III
ICD:[T78.2]
CTX:AnaphS Grad III (WAO) nach Wespenstich; Urtikaria+Bronchospasmus
GDPR:ART9 PHI:2a5d8e1f TS:1710509300
```

**P1 triggers**: sBP < 90 mmHg ✓ · SpO2 < 90% ✓ · ICD T78.2 ✓  
**Safety alert**: Hymenoptera allergy Grade III + pre-existing asthma → increased bronchospasm risk  
**Reference**: WAO Anaphylaxis Guidelines 2020; DGAKI-Leitlinie 2021

```typescript
import { FHIR_ANAPHYLAXIE } from "@comptext/core"
const result = await pipeline(FHIR_ANAPHYLAXIE)
```

---

## DM Hypoglykämie (SC:DM-HYPO)

**Clinical picture**: Severe hypoglycaemia (BG 1.8 mmol/L), Type 2 diabetes, Glibenclamid, CKD stage 3b.

```
CT:v5 SC:DM-HYPO TRI:P2
VS[hr:95 spo2:97 sbp:110]
LAB[glucose:1.8mmol/L↓↓ egfr:38ml/min/1.73m²↓]
RX:Glibenclamid ATC:A10BB01 DOSE:3.5mg FREQ:2x/d KI:[HYPO-RISK:SHT-Rebound-24h]
ICD:[E11.64]
CTX:Schwere Hypoglykämie BZ 1.8; GCS 10; CKD 3b; SHT-Therapie
GDPR:ART9 PHI:8c2a4d9e TS:1710509400
```

**P2 triggers**: Blood glucose < 2.5 mmol/L ✓  
**Safety alert**: Glibenclamid (sulphonylurea) + CKD → 24h rebound hypoglycaemia monitoring required  
**Reference**: ADA Standards of Care 2024; DDG/DGIM 2023

```typescript
import { FHIR_DM_HYPO } from "@comptext/core"
const result = await pipeline(FHIR_DM_HYPO)
```

---

## Running All Scenarios

```typescript
import { pipelineAll, TOKEN_BENCHMARKS } from "@comptext/core"

const results = await pipelineAll()

for (const [id, result] of Object.entries(results)) {
  const bench = TOKEN_BENCHMARKS[id]
  console.log(`${id}: ${bench.gpt4_raw} → ${bench.gpt4_comptext} tokens (${bench.gpt4_reduction_pct}% reduction)`)
}
```

---

## Medical Validation Status

| Test | Expected | Status |
|------|----------|--------|
| Contrast media ALG in STEMI frame | Present | ✅ |
| Penicillin ALG in Sepsis frame | Present | ✅ |
| Rivaroxaban LYSE-KI in Stroke | Present | ✅ |
| Glibenclamid HYPO-Rebound in DM | Present | ✅ |
| PHI fields in output | Not present | ✅ |
| GDPR marker in all frames | Present | ✅ |

> ⚠️ **Medical Disclaimer**: These are research/test scenarios. Values are medically plausible but not derived from real patient data. CompText must not be used in clinical decision-making without proper validation.
