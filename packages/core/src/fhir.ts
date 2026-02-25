/**
 * @comptext/core/fhir — FHIR R4 Types and Utilities
 *
 * Re-exports all FHIR-related types and utilities for direct import.
 *
 * @example
 * ```typescript
 * import { FHIR_STEMI, type FHIRBundle } from "@comptext/core/fhir"
 * ```
 */

export {
  ALL_FHIR_BUNDLES,
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  TOKEN_BENCHMARKS,
} from "./data.js"

export type {
  FHIRBundle,
  FHIRPatient,
  FHIRObservation,
  FHIRCondition,
} from "./data.js"
