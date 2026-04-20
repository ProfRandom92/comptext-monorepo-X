#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// Termux smoke test.
//
// Runs the full CompText pipeline on all 5 built-in scenarios and asserts:
//   - each produces a non-empty frame
//   - triage class is set
//   - token reduction is >= 85%
//   - PHI has been scrubbed (no patient name / birthDate / id leaks)
//
// Exit 0 on success, non-zero on failure. No network. No GPU. ~100 ms total.
// ──────────────────────────────────────────────────────────────────────────────

import { pipelineAll, serializeFrame } from "../packages/core/dist/index.mjs";

const MIN_REDUCTION_PCT = 85;
const PHI_NEEDLES = [
  "Mustermann",
  "Müller",
  "Schmidt",
  "1956-",
  "1970-",
  "1953-",
  "1990-",
  "1962-",
  "pat-stemi-001",
  "pat-sepsis-001",
];

let failed = 0;
const t0 = Date.now();

try {
  const results = await pipelineAll();
  const scenarios = Object.keys(results);

  if (scenarios.length < 5) {
    console.error(`✗ expected 5 scenarios, got ${scenarios.length}`);
    process.exit(1);
  }

  for (const id of scenarios) {
    const r = results[id];
    const errors = [];

    if (!r.frame || typeof r.frame !== "object") errors.push("no frame");
    if (!r.frame?.tri) errors.push("no triage class");
    if (!r.frame?.icd || r.frame.icd.length === 0) errors.push("no ICD-10 codes");
    if (r.benchmark.reduction_pct < MIN_REDUCTION_PCT) {
      errors.push(`reduction ${r.benchmark.reduction_pct.toFixed(1)}% < ${MIN_REDUCTION_PCT}%`);
    }
    if (!r.benchmark.gdpr_compliant) errors.push("gdpr flag not set");

    const dsl = serializeFrame(r.frame);
    for (const needle of PHI_NEEDLES) {
      if (dsl.includes(needle)) {
        errors.push(`PHI leak: "${needle}" found in serialized frame`);
      }
    }

    if (errors.length > 0) {
      console.error(`✗ ${id}: ${errors.join(", ")}`);
      failed += 1;
    } else {
      const tokOut = r.frame._pipe?.tok_out ?? r.frame.tokens ?? "?";
      console.log(
        `✓ ${id.padEnd(12)} TRI=${r.frame.tri}  reduction=${r.benchmark.reduction_pct.toFixed(1)}%  ` +
          `(${r.input.token_count} → ${tokOut} tokens)`,
      );
    }
  }
} catch (err) {
  console.error("✗ pipeline threw:", err?.stack ?? err);
  process.exit(1);
}

const ms = Date.now() - t0;
if (failed > 0) {
  console.error(`\n${failed} scenario(s) failed after ${ms} ms.`);
  process.exit(1);
}
console.log(`\nAll 5 scenarios OK in ${ms} ms.`);
