# CompText DSL v5 — Spezifikation

> **Version:** 5.0.0
> **Status:** Stable
> **Letzte Aktualisierung:** 2024-03-15

---

## Inhaltsverzeichnis

1. [Überblick](#1-überblick)
2. [Syntax-Spezifikation](#2-syntax-spezifikation)
3. [Feld-Referenz](#3-feld-referenz)
4. [Szenario-Codes](#4-szenario-codes)
5. [Vitalzeichen](#5-vitalzeichen)
6. [Laborwerte](#6-laborwerte)
7. [Kritikalitäts-Flags](#7-kritikalitäts-flags)
8. [Allergie-Schweregrade](#8-allergie-schweregrade)
9. [Parsing-Regeln](#9-parsing-regeln)
10. [Beispiele](#10-beispiele)
11. [Validierung](#11-validierung)
12. [Änderungshistorie](#12-änderungshistorie)

---

## 1. Überblick

### Was ist CompText DSL?

Die CompText Domain-Specific Language (DSL) ist ein kompaktes, maschinenlesbares Format für die Darstellung klinischer Patientendaten. Sie reduziert FHIR R4 Bundles um 93-94% bei vollständiger Erhaltung sicherheitskritischer Informationen.

### Design-Prinzipien

```
┌─────────────────────────────────────────────────────────────────┐
│                   CompText DSL Design Principles                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Kompakt      → Minimale Token für LLM-Effizienz            │
│  2. Deterministisch → Gleiche Eingabe → gleiche Ausgabe        │
│  3. Typisiert    → Klare Feld-Typen mit Validierung             │
│  4. Sicher       → Safety-Critical Fields nie abgekürzt         │
│  5. Versioniert  → Explizite Versionsnummer im Frame            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Token-Vergleich

| Format | Tokens | Bytes | Reduktion |
|--------|--------|-------|-----------|
| FHIR R4 JSON | 1,847 | 4,820 | Baseline |
| CompText DSL | **112** | **438** | **93.9%** |

---

## 2. Syntax-Spezifikation

### Gesamtstruktur

```
CT:v{VERSION} SC:{Szenario} TRI:{Triage}
VS[{vital}:{value}{unit}{flag} ...]
LAB[{lab}:{value}{unit}{flag} ...]
ALG:{allergen} SEV:{grade} [KI:[{atc},...]]
RX:{name} ATC:{code} DOSE:{dose} FREQ:{freq} [KI:[{flags},...]]
ICD:[{code1},{code2},...]
CTX:{narrative}
GDPR:ART9 PHI:{hash} TS:{epoch}
```

### ABNF-Grammatik

```abnf
; CompText DSL v5 ABNF Grammar

frame           = header CRLF
                  [vitals CRLF]
                  [labs CRLF]
                  *allergy CRLF
                  *medication CRLF
                  icd CRLF
                  [context CRLF]
                  gdpr

header          = "CT:v" version " " scenario " " triage
version         = "5"
scenario        = "SC:" scenario-code
triage          = "TRI:" triage-class

vitals          = "VS[" vital *(SP vital) "]"
vital           = vital-key ":" vital-value
vital-key       = "hr" / "sbp" / "dbp" / "spo2" / "rr" / "temp" / "gcs" / "map"
vital-value     = number [unit] [flag]

labs            = "LAB[" lab *(SP lab) "]"
lab             = lab-key ":" lab-value
lab-key         = "hs_tni" / "ckmb" / "lactate" / "pct" / "crp"
                / "glucose" / "egfr" / "creatinine" / "inr" / "aptt"
                / "hb" / "wbc" / "plt"
lab-value       = number [unit] [flag]

allergy         = "ALG:" allergen SP "SEV:" severity [SP contraindications]
allergen        = 1*20(VCHAR / SP)
severity        = "I" / "II" / "III" / "IV"
contraindications = "KI:[" atc *("," atc) "]"
atc             = 1*7(ALPHA / DIGIT)

medication      = "RX:" name SP "ATC:" atc SP "DOSE:" dose SP "FREQ:" freq
                  [SP med-contraindications]
name            = 1*20(VCHAR)
dose            = 1*20(VCHAR)
freq            = 1*20(VCHAR)
med-contraindications = "KI:[" ki-flag *("," ki-flag) "]"
ki-flag         = "LYSE-KI:NOAC<48h" / "HYPO-RISK:SHT-Rebound-24h"

icd             = "ICD:[" icd-code *("," icd-code) "]"
icd-code        = ALPHA DIGIT DIGIT ["." 1*2(ALPHA / DIGIT)]

context         = "CTX:" narrative
narrative       = 1*200(VCHAR / SP)

gdpr            = "GDPR:ART9 SP PHI:" hash SP TS:" epoch
hash            = 8*8(HEXDIG)
epoch           = 1*10(DIGIT)

; Basic types
number          = ["-"] 1*DIGIT ["." 1*DIGIT]
unit            = 1*10(VCHAR)
flag            = "↑↑" / "↑" / "n" / "↓" / "↓↓"

CRLF            = CR LF
CR              = %x0D
LF              = %x0A
SP              = %x20
VCHAR           = %x21-7E
ALPHA           = %x41-5A / %x61-7A
DIGIT           = %x30-39
HEXDIG          = DIGIT / "a" / "b" / "c" / "d" / "e" / "f"
```

---

## 3. Feld-Referenz

### Header-Felder

| Feld | Beispiel | Beschreibung |
|------|----------|--------------|
| `v` | `v5` | Schema-Version (Major-Version) |
| `sc` | `SC:STEMI` | Szenario-Code |
| `tri` | `TRI:P1` | Triage-Klasse |

### Vitalzeichen-Felder (VS[...])

| Feld | Beispiel | Einheit | Bereich |
|------|----------|---------|---------|
| `hr` | `hr:118` | /min | 30-200 |
| `sbp` | `sbp:82` | mmHg | 50-250 |
| `dbp` | `dbp:60` | mmHg | 30-150 |
| `spo2` | `spo2:91` | % | 50-100 |
| `rr` | `rr:22` | /min | 4-60 |
| `temp` | `temp:37.8` | °C | 30-45 |
| `gcs` | `gcs:14` | pts | 3-15 |
| `map` | `map:75` | mmHg | 40-150 |

### Labor-Felder (LAB[...])

| Feld | Beispiel | Einheit | Referenz |
|------|----------|---------|----------|
| `hs_tni` | `hs_tni:4847` | ng/L | <16 |
| `ckmb` | `ckmb:48.7` | µg/L | <5 |
| `lactate` | `lactate:4.8` | mmol/L | 0.5-2.0 |
| `pct` | `pct:38.4` | µg/L | <0.5 |
| `crp` | `crp:287` | mg/L | <5 |
| `glucose` | `glucose:1.8` | mmol/L | 4.0-6.1 |
| `egfr` | `egfr:38` | ml/min/1.73m² | >60 |
| `creatinine` | `creatinine:150` | µmol/L | 60-110 |
| `inr` | `inr:1.2` | - | 0.8-1.2 |
| `aptt` | `aptt:35` | s | 25-35 |
| `hb` | `hb:8.5` | g/dL | 12-16 |
| `wbc` | `wbc:12.5` | 10^9/L | 4-10 |
| `plt` | `plt:180` | 10^9/L | 150-400 |

### Allergie-Felder (ALG:...)

| Feld | Beispiel | Beschreibung |
|------|----------|--------------|
| `ALG` | `ALG:Jodkontrastmittel` | Allergen-Name (max 20 Zeichen) |
| `SEV` | `SEV:II` | WAO/AWMF-Schweregrad |
| `KI` | `KI:[V08,V09]` | Kontraindizierte ATC-Codes |

### Medikamenten-Felder (RX:...)

| Feld | Beispiel | Beschreibung |
|------|----------|--------------|
| `RX` | `RX:Aspirin` | Medikamenten-Name (max 20 Zeichen) |
| `ATC` | `ATC:1191` | ATC/RxNorm-Code |
| `DOSE` | `DOSE:500mg` | Dosis (kompakt) |
| `FREQ` | `FREQ:1x iv` | Frequenz (kompakt) |
| `KI` | `KI:[LYSE-KI:NOAC<48h]` | Klinische Kontraindikationen |

### ICD-Felder

| Feld | Beispiel | Beschreibung |
|------|----------|--------------|
| `ICD` | `ICD:[I21.09]` | ICD-10-GM Codes (max 10) |

### Kontext-Feld

| Feld | Beispiel | Beschreibung |
|------|----------|--------------|
| `CTX` | `CTX:Ak. transm. MI VW KS` | Klinischer Kontext (max 200 Zeichen) |

### GDPR-Felder

| Feld | Beispiel | Beschreibung |
|------|----------|--------------|
| `GDPR` | `GDPR:ART9` | DSGVO-Artikel 9 Marker |
| `PHI` | `PHI:3f8a1c2d` | FNV-1a Hash (8 Hex-Zeichen) |
| `TS` | `TS:1710509000` | Unix-Zeitstempel (Sekunden) |

---

## 4. Szenario-Codes

### Übersicht

| Code | Vollname | ICD-10-Cluster | P1-Trigger |
|------|----------|----------------|------------|
| `STEMI` | ST-Elevation Myocardial Infarction | I21.x, I22.x | I21.x, sBP<90 |
| `SEPSIS` | Sepsis / Septischer Schock | A40.x, A41.x | A41.x, Laktat>4 |
| `STROKE` | Ischämischer Schlaganfall | I63.x, I64 | I63.x, NIHSS>4 |
| `ANAPH` | Anaphylaxie | T78.2, T80.5 | T78.2, sBP<90 |
| `DM-HYPO` | Diabetische Hypoglykämie | E10.64, E11.64 | E11.64, BZ<2.5 |
| `TRAUMA` | Polytrauma | S00-T14 | ISS>16 |
| `HF-DECOMP` | Dekompensierte Herzinsuffizienz | I50.x | I50.x, SpO2<90 |
| `ACS` | Akutes Koronarsyndrom | I20.0, I21.4 | I20.0, hsTnI>52 |

### Szenario-Details

#### STEMI (SC:STEMI)

**Kritische Werte:**
- hsTnI > 52 ng/L (ESC 2023)
- sBP < 90 mmHg (kardiogener Schock)
- CK-MB > 10 µg/L

**Typische Labor:**
```
LAB[hs_tni:4847ng/L↑↑ ckmb:48.7µg/L↑↑]
```

**Typische Vitalzeichen:**
```
VS[hr:118 sbp:82↓↓ spo2:91↓]
```

---

#### SEPSIS (SC:SEPSIS)

**Kritische Werte:**
- Laktat > 4.0 mmol/L (SSC 2021)
- PCT > 10 µg/L (septischer Schock)
- sBP < 90 mmHg

**Typische Labor:**
```
LAB[lactate:4.8mmol/L↑↑ pct:38.4µg/L↑↑ crp:287mg/L↑]
```

---

#### STROKE (SC:STROKE)

**Kritische Werte:**
- NIHSS > 4 (AHA/ASA 2019)
- BZ < 2.5 oder > 20 mmol/L
- Onset-to-door < 4.5h (Lyse-Fenster)

**Typische Labor:**
```
LAB[glucose:6.4mmol/L]
```

**NOAC-Kontraindikation:**
```
RX:Rivaroxaban ATC:B01AF01 DOSE:20mg FREQ:1x/d KI:[LYSE-KI:NOAC<48h]
```

---

#### ANAPH (SC:ANAPH)

**Kritische Werte:**
- sBP < 90 mmHg (WAO Grad III)
- SpO2 < 90%
- Stridor/Bronchospasmus

**Typische Vitalzeichen:**
```
VS[sbp:64↓↓ spo2:87↓↓]
```

---

#### DM-HYPO (SC:DM-HYPO)

**Kritische Werte:**
- BZ < 2.5 mmol/L (ADA Level 3)
- GCS < 9
- eGFR < 30 (Glibenclamid-Akkumulation)

**Typische Labor:**
```
LAB[glucose:1.8mmol/L↓↓ egfr:38ml/min/1.73m²↓]
```

**Sulfonylharnstoff-Risiko:**
```
RX:Glibenclamid ATC:A10BB01 DOSE:3.5mg FREQ:2x/d KI:[HYPO-RISK:SHT-Rebound-24h]
```

---

## 5. Vitalzeichen

### LOINC-Mapping

| Key | LOINC | Display | Einheit |
|-----|-------|---------|---------|
| `hr` | 8867-4 | Heart rate | /min |
| `sbp` | 8480-6 | Systolic BP | mmHg |
| `dbp` | 8462-4 | Diastolic BP | mmHg |
| `spo2` | 59408-5 | O2 saturation | % |
| `rr` | 9279-1 | Respiratory rate | /min |
| `temp` | 8310-5 | Body temperature | °C |
| `gcs` | — | Glasgow Coma Scale | pts |
| `map` | 55284-4* | Mean arterial pressure | mmHg |

*calculated from systolic/diastolic

### P1-Grenzwerte

| Vital | P1 wenn | Quelle |
|-------|---------|--------|
| sBP | < 90 mmHg | ESC 2023 |
| SpO2 | < 90% | ERC Guidelines |
| HR | > 150 /min | AHA ACLS |
| GCS | < 9 | TBI Guidelines |
| MAP | < 65 mmHg | Surviving Sepsis |

### P2-Grenzwerte

| Vital | P2 wenn |
|-------|---------|
| sBP | 90-100 oder >180 mmHg |
| SpO2 | 90-94% |
| HR | 120-150 oder <50 /min |
| GCS | 9-12 |

### Beispiele

```
; Normal
VS[hr:72 spo2:98 sbp:125 dbp:80]

; STEMI mit Schock
VS[hr:118↑ sbp:82↓↓ spo2:91↓]

; Anaphylaxie
VS[hr:135↑ sbp:64↓↓ spo2:87↓↓]

; Hypoglykämie
VS[hr:95 spo2:97 sbp:110 gcs:10]
```

---

## 6. Laborwerte

### LOINC-Mapping

| Key | LOINC | Display | Einheit |
|-----|-------|---------|---------|
| `hs_tni` | 89579-7 | Troponin I | ng/L |
| `ckmb` | 13969-1 | CK-MB | µg/L |
| `lactate` | 2519-7 | Lactate | mmol/L |
| `pct` | 33959-8 | Procalcitonin | µg/L |
| `crp` | 1988-5 | CRP | mg/L |
| `glucose` | 15074-8 | Glucose | mmol/L |
| `egfr` | 62238-1 | eGFR (CKD-EPI) | ml/min/1.73m² |
| `creatinine` | 2160-0 | Creatinine | µmol/L |
| `inr` | 34714-6 | INR | - |
| `aptt` | 3173-2 | aPTT | s |
| `hb` | 718-7 | Hemoglobin | g/dL |
| `wbc` | 6690-2 | WBC | 10^9/L |
| `plt` | 777-3 | Platelets | 10^9/L |

### P1-Grenzwerte

| Labor | P1 wenn | Quelle |
|-------|---------|--------|
| hsTnI | > 52 ng/L | ESC 2023 |
| Laktat | > 4.0 mmol/L | SSC 2021 |
| PCT | > 10 µg/L | SSC 2021 |
| Glukose | < 2.5 mmol/L | ADA 2024 |
| eGFR | < 15 ml/min/1.73m² | KDIGO |
| Hb | < 7.0 g/dL | DGKL 2023 |
| INR | > 3.0 | - |

### Beispiele

```
; STEMI
LAB[hs_tni:4847ng/L↑↑ ckmb:48.7µg/L↑↑]

; Sepsis
LAB[lactate:4.8mmol/L↑↑ pct:38.4µg/L↑↑ crp:287mg/L↑]

; Hypoglykämie
LAB[glucose:1.8mmol/L↓↓ egfr:38ml/min/1.73m²↓]

; Normal
LAB[hs_tni:12ng/L ckmb:3.2µg/L crp:2mg/L]
```

---

## 7. Kritikalitäts-Flags

### Interpretation-Codes

| Flag | Unicode | Bedeutung | Interpretation |
|------|---------|-----------|----------------|
| `↑↑` | U+2191 U+2191 | Kritisch erhöht | HH (Critical High) |
| `↑` | U+2191 | Erhöht | H (High) |
| `n` | n | Normal | N (Normal) |
| `↓` | U+2193 | Erniedrigt | L (Low) |
| `↓↓` | U+2193 U+2193 | Kritisch erniedrigt | LL (Critical Low) |

### FHIR-zu-CompText Mapping

| FHIR Code | CompText | Bedeutung |
|-----------|----------|-----------|
| `HH` | `↑↑` | Critical High |
| `H` | `↑` | High |
| `N` | `n` | Normal |
| `L` | `↓` | Low |
| `LL` | `↓↓` | Critical Low |

### Beispiele

```
; Kritisch erhöht (STEMI)
hs_tni:4847ng/L↑↑

; Erhöht (Sepsis)
crp:287mg/L↑

; Kritisch erniedrigt (Anaphylaxie)
sbp:64mmHg↓↓

; Normal
glucose:5.4mmol/Ln
```

---

## 8. Allergie-Schweregrade

### WAO/AWMF-Graduierung

| Grad | Code | Symptome | Klinische Relevanz |
|------|------|----------|-------------------|
| I | `SEV:I` | Haut (Urtikaria, Pruritus) | Beobachten |
| II | `SEV:II` | Moderate systemische Reaktion | Antihistaminikum |
| III | `SEV:III` | Lebensbedrohlich (Bronchospasmus, Schock) | Adrenalin, ICU |
| IV | `SEV:IV` | Herz-Kreislauf-Stillstand | CPR |

### SNOMED-zu-CompText Mapping

| SNOMED CT | Allergen | Default SEV | KI (ATC) |
|-----------|----------|-------------|----------|
| 418425009 | Jodkontrastmittel | II | V08, V09 |
| 416098002 | Penicillin | III | J01CA, J01CE, J01CF |
| 241929008 | Hymenoptera | III | — |
| 372687004 | Amoxicillin | II | J01CA04 |
| 372903009 | Cephalosporine | II | J01DB, J01DC |
| 387173000 | NSAR | II | M01A |

### Beispiele

```
; Kontrastmittel-Allergie Grad II
ALG:Jodkontrastmittel SEV:II KI:[V08,V09]

; Penicillin-Allergie Grad III
ALG:Penicillin SEV:III KI:[J01CA,J01CE,J01CF,J01CR]

; Hymenoptera-Allergie
ALG:Hymenoptera SEV:III

; Amoxicillin-Allergie
ALG:Amoxicillin SEV:II KI:[J01CA04]
```

---

## 9. Parsing-Regeln

### Zeichenkodierung

- **Encoding:** UTF-8
- **Zeilenumbruch:** CRLF (\r\n) oder LF (\n)
- **Leerzeichen:** SP (0x20) für Trennung, keine Tabs

### Reihenfolge

Die Reihenfolge der Zeilen ist strikt definiert:

1. Header (CT:v5 SC:... TRI:...)
2. Vitalzeichen (VS[...])
3. Laborwerte (LAB[...])
4. Allergien (ALG:... SEV:...)
5. Medikamente (RX:... ATC:...)
6. ICD-Codes (ICD:[...])
7. Kontext (CTX:...)
8. GDPR-Marker (GDPR:ART9...)

### Optionale Felder

- VS[...] — optional
- LAB[...] — optional
- CTX:... — optional
- KI:[...] in ALG/RX — optional

### Pflichtfelder

- CT:v{VERSION}
- SC:{scenario}
- TRI:{class}
- ICD:[...] (mindestens leer: ICD:[])
- GDPR:ART9 PHI:{hash} TS:{epoch}

### Whitespace-Regeln

```
; ✓ GUT: Keine extra Leerzeichen
VS[hr:118 sbp:82 spo2:91]

; ✗ SCHLECHT: Extra Leerzeichen
VS[ hr : 118  sbp : 82 ]

; ✓ GUT: Keine Tabs
ALG:Jodkontrastmittel SEV:II

; ✗ SCHLECHT: Tabs statt Spaces
ALG:Jodkontrastmittel\tSEV:II
```

### Escape-Regeln

Folgende Zeichen müssen in Textfeldern escaped werden:

| Zeichen | Escape | Kontext |
|---------|--------|---------|
| `\n` | `\\n` | CTX-Feld |
| `;` | `\\;` | CTX-Feld |
| `[` | `\\[` | Alle Felder |
| `]` | `\\]` | Alle Felder |
| `:` | `\\:` | Alle Felder |

### Längenbeschränkungen

| Feld | Max. Länge | Beschreibung |
|------|------------|--------------|
| Allergen (ALG) | 20 Zeichen | INN oder Allergen-Name |
| Medikament (RX) | 20 Zeichen | INN |
| Dosis (DOSE) | 20 Zeichen | Kompakt-Notation |
| Frequenz (FREQ) | 20 Zeichen | Kompakt-Notation |
| Narrative (CTX) | 200 Zeichen | Klinischer Kontext |
| ICD-Codes | 10 Codes | Max. 10 pro Frame |
| PHI-Hash | 8 Hex-Zeichen | FNV-1a Output |

### Validierungsregeln

```typescript
// Version muss "5" sein
/^CT:v5$/

// Szenario-Code muss gültig sein
/^(STEMI|SEPSIS|STROKE|ANAPH|DM-HYPO|TRAUMA|HF-DECOMP|ACS)$/

// Triage-Klasse
/^(P1|P2|P3|P4)$/

// PHI-Hash (8 Hex-Zeichen)
/^[0-9a-f]{8}$/

// Unix-Zeitstempel (10 Ziffern)
/^\d{10}$/

// ICD-10-Format
/^[A-Z]\d{2}(\.\d{1,2})?$/

// ATC-Format (4-7 alphanumerisch)
/^[A-Z]\d{2}[A-Z]{0,2}\d{0,2}$/
```

---

## 10. Beispiele

### Beispiel 1: STEMI (Vollständig)

**Input:** FHIR R4 Bundle mit STEMI, kardiogenem Schock, Kontrastmittel-Allergie

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

**Token-Count:** 89 Tokens

---

### Beispiel 2: Sepsis (Vollständig)

**Input:** FHIR R4 Bundle mit septischem Schock, Penicillin-Allergie

**Output:**
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

**Token-Count:** 97 Tokens

---

### Beispiel 3: Stroke (Vollständig)

**Input:** FHIR R4 Bundle mit ischämischem Schlaganfall, Rivaroxaban

**Output:**
```
CT:v5 SC:STROKE TRI:P1
VS[hr:95 sbp:145 spo2:97]
LAB[glucose:6.4mmol/Ln]
RX:Rivaroxaban ATC:B01AF01 DOSE:20mg FREQ:1x/d KI:[LYSE-KI:NOAC<48h]
ICD:[I63.3]
CTX:Ak. isch. Stroke li. MCA; NIHSS 14; Onset 2h
GDPR:ART9 PHI:9e4f1b8c TS:1710509200
```

**Token-Count:** 78 Tokens

---

### Beispiel 4: Anaphylaxie (Vollständig)

**Input:** FHIR R4 Bundle mit Anaphylaxie Grad III, Insekten-Allergie

**Output:**
```
CT:v5 SC:ANAPH TRI:P1
VS[hr:142↑ sbp:64↓↓ spo2:87↓↓]
ALG:Hymenoptera SEV:III
ICD:[T78.2]
CTX:AnaphS Grad III (WAO) nach Wespenstich; Urtikaria+Bronchospasmus
GDPR:ART9 PHI:2a5d8e1f TS:1710509300
```

**Token-Count:** 58 Tokens

---

### Beispiel 5: DM Hypoglykämie (Vollständig)

**Input:** FHIR R4 Bundle mit schwerer Hypoglykämie, Glibenclamid

**Output:**
```
CT:v5 SC:DM-HYPO TRI:P2
VS[hr:95 spo2:97 sbp:110]
LAB[glucose:1.8mmol/L↓↓ egfr:38ml/min/1.73m²↓]
RX:Glibenclamid ATC:A10BB01 DOSE:3.5mg FREQ:2x/d KI:[HYPO-RISK:SHT-Rebound-24h]
ICD:[E11.64]
CTX:Schwere Hypoglykämie BZ 1.8; GCS 10; CKD 3b; SHT-Therapie
GDPR:ART9 PHI:8c2a4d9e TS:1710509400
```

**Token-Count:** 86 Tokens

---

### Beispiel 6: Minimaler Frame

```
CT:v5 SC:STEMI TRI:P3
ICD:[]
GDPR:ART9 PHI:00000000 TS:1710509000
```

---

### Beispiel 7: Komplexer Frame (maximale Felder)

```
CT:v5 SC:SEPSIS TRI:P1
VS[hr:135 sbp:76 dbp:50 spo2:93 rr:28 temp:38.5]
LAB[lactate:4.8mmol/L↑ pct:38.4µg/L↑ crp:287mg/L↑ glucose:7.2mmol/L↑
    egfr:45ml/min/1.73m² creatinine:120µmol/L↑ hb:10.5g/dL↓ wbc:15.2/L↑
    plt:180/L inr:1.1]
ALG:Penicillin SEV:III KI:[J01CA,J01CE,J01CF,J01CR]
RX:Ceftriaxon ATC:J01DD04 DOSE:2g FREQ:1x iv
RX:Norepinephrin ATC:C01CA03 DOSE:0.4µg/kg/min FREQ:continuous
ICD:[A41.9,J18.9]
CTX:SepS bei CAP; qSOFA 3/3; Noradrenalin
GDPR:ART9 PHI:a1b2c3d4 TS:1710509500
```

---

## 11. Validierung

### Parser-Beispiel (TypeScript)

```typescript
interface ParseResult {
  success: boolean
  frame?: CompTextFrame
  errors?: ValidationError[]
}

function parseCompText(dsl: string): ParseResult {
  const errors: ValidationError[] = []
  const lines = dsl.split(/\r?\n/)

  // Version prüfen
  const headerMatch = lines[0]?.match(/^CT:v(\d+) SC:(\S+) TRI:(\S+)$/)
  if (!headerMatch) {
    errors.push({ line: 1, message: "Invalid header format" })
    return { success: false, errors }
  }

  const [, version, scenario, triage] = headerMatch

  if (version !== "5") {
    errors.push({ line: 1, message: `Unsupported version: ${version}` })
  }

  // Szenario validieren
  const validScenarios = ["STEMI", "SEPSIS", "STROKE", "ANAPH", "DM-HYPO"]
  if (!validScenarios.includes(scenario)) {
    errors.push({ line: 1, message: `Invalid scenario: ${scenario}` })
  }

  // Triage validieren
  if (!/^(P1|P2|P3|P4)$/.test(triage)) {
    errors.push({ line: 1, message: `Invalid triage: ${triage}` })
  }

  // ... weitere Validierung

  return errors.length === 0
    ? { success: true, frame: buildFrame(lines) }
    : { success: false, errors }
}
```

### Validierungs-Checkliste

| Check | Beschreibung |
|-------|--------------|
| Version | Muss "5" sein |
| Szenario | Muss in erlaubter Liste sein |
| Triage | Muss P1/P2/P3/P4 sein |
| PHI-Hash | Muss 8 Hex-Zeichen sein |
| Zeistempel | Muss 10 Ziffern sein |
| ICD-Codes | Müssen gültiges Format haben |
| ATC-Codes | Müssen gültiges Format haben |
| Allergie-SEV | Muss I/II/III/IV sein |

---

## 12. Änderungshistorie

### v5.0.0 (2024-03-15)

**Neu:**
- Initiale Version
- Unterstützung für 5 klinische Szenarien
- 4-Layer KVTC-Kompression
- GDPR-konformes PHI-Hashing

### Geplante Änderungen

**v5.1.0 (geplant):**
- Neue Szenarien: TRAUMA, HF-DECOMP, ACS
- Erweiterte LOINC-Mappings
- Batch-Validierung

**v6.0.0 (geplant):**
- JSON-Format als Alternative zu DSL
- Streaming-Parser
- Erweiterte Medikamenten-Interaktionen

---

## Anhänge

### A. Komplette LOINC-zu-Key Tabelle

| Key | LOINC | Display | Einheit | P1-Threshold |
|-----|-------|---------|---------|--------------|
| hsTnI | 89579-7 | Troponin I | ng/L | >52 |
| CKMB | 13969-1 | CK-MB | µg/L | >10 |
| LAC | 2519-7 | Lactate | mmol/L | >4.0 |
| PCT | 33959-8 | Procalcitonin | µg/L | >10 |
| CRP | 1988-5 | CRP | mg/L | - |
| BZ | 15074-8 | Glucose | mmol/L | <2.5 |
| eGFR | 62238-1 | eGFR | ml/min/1.73m² | <15 |
| BP | 55284-4 | Blood Pressure | mmHg | Panel |
| sBP | 8480-6 | Systolic BP | mmHg | <90 |
| dBP | 8462-4 | Diastolic BP | mmHg | <60 |
| HR | 8867-4 | Heart Rate | /min | >150 |
| SpO2 | 59408-5 | O2 Saturation | % | <90 |
| AF | 9279-1 | Respiratory Rate | /min | >30 |
| Temp | 8310-5 | Temperature | °C | <35 oder >40 |
| NIHSS | 72107-6 | NIH Stroke Scale | pts | >4 |

### B. Einheits-Normalisierung

| Eingabe | Ausgabe | Konversion |
|---------|---------|------------|
| mm[Hg] | mmHg | 1:1 |
| ug/L | µg/L | 1:1 |
| mL/min/{1.73_m2} | ml/min/1.73m² | 1:1 |
| {score} | pts | 1:1 |

### C. Klinische Abkürzungen

| Original | Abkürzung |
|----------|-----------|
| Akuter | Ak. |
| transmuraler | transm. |
| Myokardinfarkt | MI |
| Vorderwand | VW |
| kardiogener Schock | KS |
| nicht näher bezeichnet | n.n.b. |
| Pneumonie | PNA |
| septischer Schock | SepS |
| ambulant erworben | CAP |
| Hirninfarkt | Stroke |
| zerebraler Arterien | zer.Art. |
| Thrombose | Thrombose |
| Anaphylaktischer Schock | AnaphS |
| Diabetes mellitus | DM |
| Typ 2 | T2 |
| Hypoglykämie | Hypo |
| mit Koma | +Koma |
| bekannt | bekannt |
| Eingeschränkte Nierenfunktion | NI |
| Kontrastmittel-Allergie | KM-ALG |
| Penicillin-Allergie | Pen-ALG |
| Wespenstich | Hymenoptera |
| Insekten-Hymenoptera-Allergie | Insekt-ALG |
| Asthma bronchiale | Asthma |

---

**Referenzen:**
- FHIR R4: https://hl7.org/fhir/R4/
- LOINC: https://loinc.org
- ICD-10-GM: https://www.bfarm.de
- ESC 2023: 10.1093/eurheartj/ehad191
- SSC 2021: 10.1097/CCM.0000000000005337

**Autor:** Alex Köllnberger
**Lizenz:** MIT
