# GDPR Compliance

CompText implements **GDPR Art. 5(1)(c)** (data minimisation) and **Art. 25** (data protection by design and by default) for processing special-category health data (Art. 9).

---

## What CompText Does with PHI

The NURSE stage removes or transforms all personally identifiable information **before** any compression or storage:

| PHI Field | Treatment | Result |
|-----------|-----------|--------|
| `Patient.name` | Removed | Not present in output |
| `Patient.birthDate` | Removed + approximated | Age decade ("60s") preserved |
| `Patient.address` | Removed | Not present in output |
| `Patient.telecom` | Removed | Not present in output |
| `Patient.identifier.value` | Replaced with FNV-1a hash | `PHI:3f8a1c2d` (8 hex chars) |
| Free-text narrative > 100 chars | Truncated | Only coded values preserved |

---

## FNV-1a Hash

Patient identity is replaced with a **one-way FNV-1a 32-bit hash**:

```typescript
// Input: "patient-uuid-123"
// Output: "3f8a1c2d"  ← 8 hex characters, NOT reversible
```

**Properties:**
- **Deterministic**: same patient ID always produces the same hash across sessions
- **Non-reversible**: the original ID cannot be reconstructed from the hash
- **Audit-trail-compatible**: allows correlation of frames from the same patient without exposing the original ID

> **Note**: FNV-1a is not a cryptographic hash. It provides sufficient non-reversibility for GDPR purposes without requiring `crypto` module dependencies (browser compatibility). See ADR-001 in [[Architecture]].

---

## GDPR Marker

Every CompText frame contains an explicit GDPR compliance marker:

```
GDPR:ART9 PHI:3f8a1c2d TS:1710509000
```

```typescript
frame.gdpr = {
  art9: true,             // Art. 9 GDPR — special category health data
  phi_hash: "3f8a1c2d",  // FNV-1a of original patient identifiers
  scrubbed_at: 1710509000, // Unix timestamp of PHI removal
  minimized: true,        // data minimisation applied
}
```

| Field | GDPR Article | Description |
|-------|-------------|-------------|
| `art9: true` | Art. 9 | Explicit marker that special-category health data was processed |
| `phi_hash` | Art. 5(1)(f) | Pseudonymisation — patient identifiable only via hash |
| `scrubbed_at` | Art. 5(1)(e) | Storage limitation — when PHI was removed |
| `minimized: true` | Art. 5(1)(c) | Data minimisation — only necessary data retained |

---

## What Is Preserved

CompText retains **only** the data necessary for clinical AI inference:

✅ **Always preserved**:
- Triage classification (P1/P2/P3/P4)
- Safety-critical allergies (allergen, severity, contraindicated ATC codes)
- Medications with clinical flags
- Key vital signs and lab values
- ICD-10 diagnosis codes
- Patient sex and age decade (not exact birth date)

❌ **Always removed**:
- Patient name (all name components)
- Exact birth date → only decade approximation
- Address (street, city, postal code, country)
- Phone, email, other contact information
- Insurance and administrative identifiers

---

## Compliance Summary

| GDPR Requirement | Implementation |
|-----------------|----------------|
| Art. 5(1)(a) — Lawfulness | Frames carry Art. 9 processing marker for downstream audit |
| Art. 5(1)(c) — Data minimisation | Only clinically necessary fields retained after NURSE stage |
| Art. 5(1)(e) — Storage limitation | `scrubbed_at` timestamp records when PHI was removed |
| Art. 5(1)(f) — Integrity/confidentiality | PHI replaced with one-way hash, not stored in plaintext |
| Art. 17 — Right to erasure | Original PHI is not stored — only non-reversible hash |
| Art. 25 — Privacy by design | PHI removal is mandatory step 1 of the pipeline |

---

## Important Limitations

> ⚠️ CompText is a **research tool**. While it implements technical GDPR measures, it does not by itself constitute a complete GDPR compliance solution. Organisations processing real patient data must additionally:
> - Conduct a Data Protection Impact Assessment (DPIA)
> - Maintain records of processing activities (Art. 30)
> - Obtain appropriate legal basis for processing health data (Art. 9(2))
> - Implement appropriate organisational measures alongside technical measures
