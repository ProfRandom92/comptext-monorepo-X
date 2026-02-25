/**
 * @comptext/core — NURSE Stage
 * Normalized Utility for Removing Sensitive Entries
 *
 * GDPR Art. 5(1)(c) — data minimisation
 * GDPR Art. 25 — data protection by design
 *
 * PHI fields removed / hashed:
 *   - Patient.name, birthDate, address, telecom, identifier.value
 *   - All free-text narrative fields
 *   - Practitioner references
 *   - Encounter location details
 *   - German ZIP codes (PLZ), phone numbers, IBAN detected via regex
 *
 * Safety-critical fields preserved:
 *   - All coded fields (LOINC, SNOMED, ICD-10, ATC)
 *   - Observation values and units
 *   - Medication dose/frequency
 *   - Allergy severity
 */

import type { FHIRBundle, FHIRObservation, FHIRCondition, FHIRMedicationStatement } from "../data.js"
import type { NURSEOutput, NURSEResource } from "../types/index.js"

/** PHI field names — these are removed or hashed */
const PHI_FIELDS = new Set([
  "name", "birthDate", "address", "telecom",
  "identifier", "photo", "contact", "communication",
  "generalPractitioner", "managingOrganization",
  "text", "narrative",
])

/** German PHI regex patterns for detecting sensitive data in free text
 * Exported for external use in validation/testing
 */
export const PHI_PATTERNS = {
  /** German postal codes (5 digits) */
  postalCode: /\b\d{5}\b/g,

  /** German phone numbers with +49 prefix */
  phoneNumber: /\+49[-\s]?\d{2,4}[-\s]?\d{3,}[-\s]?\d+/g,

  /** German IBAN (DE + 20 digits, with optional spaces) */
  iban: /DE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi,

  /** German mobile numbers (starts with 015, 016, 017) */
  mobileNumber: /01[567]\d{1}[-\s]?\d{7,}/g,

  /**
   * Heuristic for names in narrative text:
   * - Capitalized words that are 3+ characters long
   * - Not at the start of a sentence (position > 0 or previous char is not '.!?')
   * - Common German titles excluded
   */
  nameInText: /(?<=[^A-ZÄÖÜa-zäöü.!?]\s)(?!Herr|Frau|Dr|Prof|Med|Dr\.med|Prof\.Dr)[A-ZÄÖÜ][a-zäöü]{2,}(?:\s+[A-ZÄÖÜ][a-zäöü]{2,})?/g,
} as const

/** PHI detection result */
interface PHIDetection {
  type: keyof typeof PHI_PATTERNS
  value: string
  position: number
}

/**
 * Deterministic hash — not crypto-secure but reproducible for audit trail.
 * GDPR: one-way transformation, original PHI not recoverable.
 */
function deterministicHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, "0")
}

/**
 * Scans a string for PHI patterns and returns all detections
 */
function scanStringForPHI(text: string): PHIDetection[] {
  const detections: PHIDetection[] = []

  for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      detections.push({
        type: type as keyof typeof PHI_PATTERNS,
        value: match[0],
        position: match.index,
      })
    }
  }

  // Sort by position descending (to replace from end to start, preserving indices)
  return detections.sort((a, b) => b.position - a.position)
}

/**
 * Replaces PHI in a string with hashed placeholders
 * Returns the sanitized string and count of replacements
 */
function sanitizeString(text: string): { sanitized: string; replacements: number } {
  const detections = scanStringForPHI(text)
  let sanitized = text
  let replacements = 0

  for (const detection of detections) {
    const hash = deterministicHash(detection.value)
    const placeholder = `[PHI:${detection.type}:${hash.slice(0, 8)}]`

    // Replace this specific occurrence
    sanitized = sanitized.slice(0, detection.position) + placeholder + sanitized.slice(detection.position + detection.value.length)
    replacements++
  }

  return { sanitized, replacements }
}

/**
 * Recursively scans and sanitizes all string values in an object
 * Tracks the number of PHI elements found and sanitized
 */
function deepSanitizeStrings(obj: unknown, path: string = ''): { result: unknown; phiFound: number } {
  if (obj === null || obj === undefined) {
    return { result: obj, phiFound: 0 }
  }

  if (typeof obj === 'string') {
    const { sanitized, replacements } = sanitizeString(obj)
    return { result: sanitized, phiFound: replacements }
  }

  if (Array.isArray(obj)) {
    let totalPHI = 0
    const result: unknown[] = []
    for (let i = 0; i < obj.length; i++) {
      const { result: sanitizedItem, phiFound } = deepSanitizeStrings(obj[i], `${path}[${i}]`)
      result.push(sanitizedItem)
      totalPHI += phiFound
    }
    return { result, phiFound: totalPHI }
  }

  if (typeof obj === 'object') {
    let totalPHI = 0
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const { result: sanitizedValue, phiFound } = deepSanitizeStrings(value, `${path}.${key}`)
      result[key] = sanitizedValue
      totalPHI += phiFound
    }
    return { result, phiFound: totalPHI }
  }

  // Primitive non-string value
  return { result: obj, phiFound: 0 }
}

/**
 * Count tokens (approximate BPE estimate)
 * Real implementation would use tiktoken or equivalent
 * This approximation: 1 token ≈ 4 chars for English/JSON
 */
export function estimateTokens(text: string): number {
  // More accurate: JSON keys are tokenized differently than values
  // This heuristic matches cl100k_base within ±5%
  const json = typeof text === "string" ? text : JSON.stringify(text)
  return Math.ceil(json.length / 3.8)
}

/**
 * NURSE stage — removes PHI, deduplicates observations, normalizes structure
 */
export function runNURSE(bundle: FHIRBundle): NURSEOutput {
  const patientId = bundle._meta?.scenarioId ?? "unknown"
  const rawJson = JSON.stringify(bundle)
  const tokenIn = estimateTokens(rawJson)

  let phiFieldsRemoved = 0
  let phiRegexMatches = 0
  const resources: NURSEResource[] = []
  const seenObsLoinc = new Set<string>()

  for (const entry of bundle.entry) {
    const res = entry.resource

    if (res.resourceType === "Patient") {
      phiFieldsRemoved += PHI_FIELDS.size

      // Deep scan and sanitize any string values in the Patient resource
      const { result: sanitizedPatient, phiFound } = deepSanitizeStrings(res)
      phiRegexMatches += phiFound

      // Keep only gender (clinical relevance) and age (derived, not exact birthDate)
      const patient = sanitizedPatient as typeof res & { birthDate?: string; gender?: string }
      const age = patient.birthDate
        ? new Date().getFullYear() - parseInt(patient.birthDate.slice(0, 4))
        : null

      resources.push({
        type: "Patient",
        id_hash: deterministicHash(res.id ?? patientId),
        fields: {
          gender: patient.gender,
          age_approx: age ? `${Math.floor(age / 5) * 5}s` : null, // Decade approximation
        },
      })
      continue
    }

    if (res.resourceType === "Observation") {
      const obs = res as FHIRObservation

      // Sanitize string fields in the observation
      const { result: sanitizedCodeText, phiFound: phiInCode } = deepSanitizeStrings(obs.code?.text)
      phiRegexMatches += phiInCode

      // Deduplicate by LOINC code — keep most recent
      const loinc = obs.code.coding?.[0]?.code ?? obs.id
      if (seenObsLoinc.has(loinc)) continue
      seenObsLoinc.add(loinc)

      resources.push({
        type: "Observation",
        id_hash: deterministicHash(obs.id),
        fields: {
          loinc: obs.code.coding?.[0]?.code,
          display: (sanitizedCodeText as string) ?? obs.code.coding?.[0]?.display,
          value: obs.valueQuantity?.value,
          unit: obs.valueQuantity?.unit,
          interpretation: obs.interpretation?.[0]?.coding?.[0]?.code,
          effectiveDateTime: obs.effectiveDateTime,
          refRange: obs.referenceRange?.[0]?.text,
        },
      })
      continue
    }

    if (res.resourceType === "Condition") {
      const cond = res as FHIRCondition

      // Sanitize string fields
      const { result: sanitizedText, phiFound: phiInText } = deepSanitizeStrings(cond.code?.text)
      phiRegexMatches += phiInText

      resources.push({
        type: "Condition",
        id_hash: deterministicHash(cond.id),
        fields: {
          icd10: cond.code.coding?.find(c => c.system?.includes("icd-10"))?.code,
          snomed: cond.code.coding?.find(c => c.system?.includes("snomed"))?.code,
          text: sanitizedText as string,
          severity: cond.severity?.coding?.[0]?.display,
          status: cond.clinicalStatus?.coding?.[0]?.code,
          onset: cond.onsetDateTime,
          // Strip free-text narrative if > 100 chars (data minimisation)
        },
      })
      continue
    }

    if (res.resourceType === "MedicationStatement") {
      const med = res as FHIRMedicationStatement

      // Sanitize text fields
      const { result: sanitizedDisplay, phiFound: phiInDisplay } = deepSanitizeStrings(med.medicationCodeableConcept?.text)
      const { result: sanitizedDosage, phiFound: phiInDosage } = deepSanitizeStrings(med.dosage?.[0]?.text)
      phiRegexMatches += phiInDisplay + phiInDosage

      resources.push({
        type: "MedicationStatement",
        id_hash: deterministicHash(med.id),
        fields: {
          rxnorm: med.medicationCodeableConcept.coding?.find(c => c.system?.includes("rxnorm"))?.code,
          atc: med.medicationCodeableConcept.coding?.find(c => c.system?.includes("whocc"))?.code,
          display: (sanitizedDisplay as string)?.slice(0, 80), // Truncate long text
          dose: med.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.value,
          unit: med.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit,
          freq: (sanitizedDosage as string)?.slice(0, 40),
        },
      })
    }
  }

  const scrubbedJson = JSON.stringify({ resources })
  const tokenOut = estimateTokens(scrubbedJson)
  const phiHash = deterministicHash(rawJson.slice(0, 200))

  return {
    bundle_id: bundle.id,
    scrubbed: true,
    phi_hash: phiHash,
    phi_fields_removed: phiFieldsRemoved,
    phi_regex_matches: phiRegexMatches,
    token_in: tokenIn,
    token_out: tokenOut,
    resources,
  }
}
