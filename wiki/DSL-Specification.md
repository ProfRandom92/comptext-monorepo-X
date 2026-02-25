# DSL Specification

> See also: [`docs/DSL_SPEC.md`](../blob/main/docs/DSL_SPEC.md) for the full specification.

## CompText DSL v5 Overview

The CompText DSL is a compact, machine-readable format for clinical patient data. It reduces FHIR R4 bundles by 93–94% while preserving all safety-critical information.

## Example Output

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

## Field Reference

| Field       | Type     | Description                                   |
| ----------- | -------- | --------------------------------------------- |
| `CT:v5`     | Header   | CompText version                              |
| `SC:`       | String   | Clinical scenario code                        |
| `TRI:`      | P1/P2/P3 | Triage level                                  |
| `VS[...]`   | Object   | Vital signs                                   |
| `LAB[...]`  | Object   | Laboratory values                             |
| `ALG:`      | Array    | Allergies with severity and contraindications |
| `RX:`       | Array    | Medications                                   |
| `ICD:[...]` | Array    | ICD-10-GM codes                               |
| `CTX:`      | String   | Clinical context (compressed free text)       |
| `GDPR:`     | Object   | GDPR compliance markers                       |

## Vital Sign Keys

| Key    | Meaning                  | Unit |
| ------ | ------------------------ | ---- |
| `hr`   | Heart rate               | bpm  |
| `sbp`  | Systolic blood pressure  | mmHg |
| `dbp`  | Diastolic blood pressure | mmHg |
| `spo2` | Oxygen saturation        | %    |
| `temp` | Temperature              | °C   |
| `rr`   | Respiratory rate         | /min |

## Triage Thresholds (P1)

| Criterion       | Threshold                       |
| --------------- | ------------------------------- |
| Systolic BP     | < 90 mmHg                       |
| SpO2            | < 90%                           |
| Heart rate      | > 150 bpm                       |
| Lactate         | > 4.0 mmol/L                    |
| hsTroponin I    | > 52 ng/L                       |
| Blood glucose   | < 2.5 mmol/L                    |
| P1 ICD-10 codes | I21.x, I63.x, A41.x, T78.2, ... |
