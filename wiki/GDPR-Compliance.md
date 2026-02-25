# GDPR Compliance

CompText implements GDPR Art. 5(1)(c) (data minimisation) and Art. 25 (data protection by design) in the NURSE stage.

## What Gets Removed (PHI)

| Field                            | Action                                     |
| -------------------------------- | ------------------------------------------ |
| `Patient.name`                   | Removed                                    |
| `Patient.birthDate`              | Replaced with decade approximation ("60s") |
| `Patient.address`                | Removed                                    |
| `Patient.telecom`                | Removed                                    |
| `identifier.value`               | Replaced with FNV-1a hash                  |
| Free-text narratives > 100 chars | Removed                                    |

## What Gets Preserved

All coded fields are preserved: LOINC codes, SNOMED CT, ICD-10-GM, ATC codes, observation values and units, medication doses and frequencies, allergy severity grades.

## PHI Hashing

Patient ID is replaced with a FNV-1a 32-bit hash. This is:

- **Non-reversible** — satisfies GDPR Art. 5 and 17
- **Deterministic** — same patient ID always produces the same hash across sessions (audit trail)
- **Fast** — no crypto library dependency, runs in browser

```typescript
frame.gdpr = {
  art9: true, // Special category health data (Art. 9)
  phi_hash: "3f8a1c2d", // FNV-1a of original patient identifiers
  scrubbed_at: 1710509000,
  minimized: true,
};
```

## GDPR Articles Addressed

| Article      | How                                                           |
| ------------ | ------------------------------------------------------------- |
| Art. 5(1)(c) | Data minimisation — only clinically necessary fields retained |
| Art. 9       | Explicit marker for special-category health data processing   |
| Art. 17      | PHI not stored — one-way hash only                            |
| Art. 25      | Privacy by design — scrubbing happens before any LLM call     |

> ⚠️ CompText handles PHI scrubbing for LLM input preparation. It does not replace a full GDPR compliance program. Consult your DPO before deploying in production.
