# DSL Specification

> CompText Domain-Specific Language — **v5.0.0** (Stable)  
> Full specification: [`docs/DSL_SPEC.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/DSL_SPEC.md)

---

## Frame Structure

```
CT:v{VERSION} SC:{scenario} TRI:{triage}
VS[{vital}:{value}{unit}{flag} ...]
LAB[{lab}:{value}{unit}{flag} ...]
ALG:{allergen} SEV:{grade} [KI:[{atc},...]]
RX:{name} ATC:{code} DOSE:{dose} FREQ:{freq} [KI:[{flags},...]]
ICD:[{code1},{code2},...]
CTX:{narrative}
GDPR:ART9 PHI:{hash} TS:{epoch}
```

**Mandatory fields**: `CT:v5`, `SC:`, `TRI:`, `ICD:[]`, `GDPR:ART9 PHI: TS:`  
**Optional fields**: `VS[...]`, `LAB[...]`, `CTX:`

---

## Complete Example — STEMI

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

**89 tokens** (vs. 1,847 raw FHIR — 95% reduction)

---

## Vital Signs Fields (`VS[...]`)

| Key | LOINC | Unit | P1 threshold |
|-----|-------|------|-------------|
| `hr` | 8867-4 | /min | > 150 |
| `sbp` | 8480-6 | mmHg | < 90 |
| `dbp` | 8462-4 | mmHg | — |
| `spo2` | 59408-5 | % | < 90 |
| `rr` | 9279-1 | /min | > 30 |
| `temp` | 8310-5 | °C | < 35 or > 40 |
| `gcs` | — | pts | < 9 |
| `map` | 55284-4 | mmHg | < 65 |

---

## Lab Fields (`LAB[...]`)

| Key | LOINC | Unit | P1 threshold |
|-----|-------|------|-------------|
| `hs_tni` | 89579-7 | ng/L | > 52 |
| `ckmb` | 13969-1 | µg/L | > 10 |
| `lactate` | 2519-7 | mmol/L | > 4.0 |
| `pct` | 33959-8 | µg/L | > 10 |
| `crp` | 1988-5 | mg/L | — |
| `glucose` | 15074-8 | mmol/L | < 2.5 |
| `egfr` | 62238-1 | ml/min/1.73m² | < 15 |
| `hb` | 718-7 | g/dL | < 7.0 |
| `inr` | 34714-6 | — | > 3.0 |

---

## Criticality Flags

| Flag | Unicode | Meaning |
|------|---------|---------|
| `↑↑` | U+2191×2 | Critical high (HH) |
| `↑` | U+2191 | High (H) |
| `n` | — | Normal |
| `↓` | U+2193 | Low (L) |
| `↓↓` | U+2193×2 | Critical low (LL) |

---

## Allergy Severity Grades (WAO/AWMF)

| Grade | Code | Clinical significance |
|-------|------|-----------------------|
| I | `SEV:I` | Skin (urticaria, pruritus) — observe |
| II | `SEV:II` | Moderate systemic reaction — antihistamine |
| III | `SEV:III` | Life-threatening (bronchospasm, shock) — adrenaline, ICU |
| IV | `SEV:IV` | Cardiac arrest — CPR |

---

## Scenario Codes

| Code | Full Name | ICD-10 Cluster |
|------|-----------|----------------|
| `STEMI` | ST-Elevation MI | I21.x, I22.x |
| `SEPSIS` | Sepsis / Septic Shock | A40.x, A41.x |
| `STROKE` | Ischaemic Stroke | I63.x, I64 |
| `ANAPH` | Anaphylaxis | T78.2, T80.5 |
| `DM-HYPO` | Diabetic Hypoglycaemia | E10.64, E11.64 |
| `TRAUMA` | Polytrauma | S00-T14 |
| `HF-DECOMP` | Decompensated Heart Failure | I50.x |
| `ACS` | Acute Coronary Syndrome | I20.0, I21.4 |

---

## Parsing Rules

- **Encoding**: UTF-8
- **Line endings**: CRLF (`\r\n`) or LF (`\n`)
- **Whitespace**: single space (0x20) for separation, no tabs
- **Line order**: Header → VS → LAB → ALG → RX → ICD → CTX → GDPR

### Field Length Limits

| Field | Max length |
|-------|------------|
| Allergen (`ALG`) | 20 chars |
| Medication (`RX`) | 20 chars |
| Dose (`DOSE`) | 20 chars |
| Frequency (`FREQ`) | 20 chars |
| Narrative (`CTX`) | 200 chars |
| ICD codes | 10 codes max |
| PHI hash | 8 hex chars |

### Validation Patterns

```typescript
/^CT:v5$/                                          // version
/^(STEMI|SEPSIS|STROKE|ANAPH|DM-HYPO|...)$/        // scenario
/^(P1|P2|P3|P4)$/                                  // triage
/^[0-9a-f]{8}$/                                    // PHI hash
/^[A-Z]\d{2}(\.\d{1,2})?$/                         // ICD-10
```

---

> 📄 Full specification with ABNF grammar, all examples, and changelog: [`docs/DSL_SPEC.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/DSL_SPEC.md)
