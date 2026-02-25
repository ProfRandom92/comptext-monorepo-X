#!/usr/bin/env node
/**
 * CompText Benchmark Script
 *
 * Runs the full CompText pipeline on all 5 clinical scenarios and
 * generates a token comparison table with reduction percentages.
 *
 * Usage:
 *   tsx scripts/benchmark.ts
 *   tsx scripts/benchmark.ts --json    # Output as JSON
 *   tsx scripts/benchmark.ts --csv     # Output as CSV
 */

import {
  pipeline,
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  ALL_FHIR_BUNDLES,
  serializeFrame,
} from "@comptext/core"
import type { FHIRBundle, PipelineResult } from "@comptext/core"

// CLI arguments
const args = process.argv.slice(2)
const outputJson = args.includes("--json")
const outputCsv = args.includes("--csv")
const outputMarkdown = args.includes("--md") || (!outputJson && !outputCsv)

// Scenario display names
const SCENARIO_NAMES: Record<string, string> = {
  stemi: "STEMI",
  sepsis: "SEPSIS",
  stroke: "STROKE",
  anaphylaxie: "ANAPHYLAXIE",
  dm_hypo: "DM_HYPO",
}

// Interface for benchmark row
interface BenchmarkRow {
  scenario: string
  scenarioId: string
  fhirRaw: number
  postNurse: number
  postKvtc: number
  comptext: number
  reductionPct: number
  reductionAbs: number
  latencyMs: number
}

/**
 * Count tokens using tiktoken (cl100k_base) or fallback to estimation
 */
async function countTokens(text: string): Promise<number> {
  try {
    // Dynamic import to avoid errors if tiktoken is not installed
    const tiktoken = await import("tiktoken").catch(() => null)
    if (tiktoken) {
      const encoding = tiktoken.get_encoding("cl100k_base")
      const tokens = encoding.encode(text)
      encoding.free()
      return tokens.length
    }
  } catch {
    // Fall through to estimation
  }

  // Fallback: heuristic estimation (1 token ≈ 3.8 chars for JSON)
  return Math.ceil(text.length / 3.8)
}

/**
 * Run benchmark on a single scenario
 */
async function benchmarkScenario(
  scenarioId: string,
  bundle: FHIRBundle,
): Promise<BenchmarkRow> {
  const startTime = performance.now()

  // Run the pipeline
  const result = await pipeline(bundle)

  const latencyMs = Math.round(performance.now() - startTime)

  // Calculate additional token metrics using tiktoken if available
  const fhirJson = JSON.stringify(bundle)
  const comptextJson = JSON.stringify(result.frame)

  const fhirRawTokens = await countTokens(fhirJson)
  const comptextTokens = await countTokens(comptextJson)

  // Use pipeline token counts from metadata (_pipe.tok_out) or fall back to tiktoken
  const comptextTokCount = result.frame._pipe?.tok_out ?? comptextTokens

  return {
    scenario: SCENARIO_NAMES[scenarioId] ?? scenarioId.toUpperCase(),
    scenarioId,
    fhirRaw: result.input.token_count,
    postNurse: result.nurse.token_out,
    postKvtc: result.kvtc.token_out,
    comptext: comptextTokCount,
    reductionPct: result.benchmark.reduction_pct,
    reductionAbs: result.input.token_count - comptextTokCount,
    latencyMs,
  }
}

/**
 * Format results as markdown table (simplified view)
 */
function formatMarkdownTable(rows: BenchmarkRow[]): string {
  const lines: string[] = []

  lines.push("")
  lines.push("# CompText Token Benchmark Results")
  lines.push("")
  lines.push("| Scenario | FHIR Raw | CompText | Reduction |")
  lines.push("|----------|----------|----------|----------|")

  for (const row of rows) {
    lines.push(
      `| ${row.scenario.padEnd(8)} | ${String(row.fhirRaw).padStart(8)} | ${String(row.comptext).padStart(8)} | ${row.reductionPct.toFixed(1).padStart(7)}% |`,
    )
  }

  // Calculate average
  const avgReduction =
    rows.reduce((sum, r) => sum + r.reductionPct, 0) / rows.length
  const avgFhirRaw = Math.round(rows.reduce((sum, r) => sum + r.fhirRaw, 0) / rows.length)
  const avgCompText = Math.round(rows.reduce((sum, r) => sum + r.comptext, 0) / rows.length)

  lines.push("|----------|----------|----------|----------|")
  lines.push(`| ${"AVERAGE".padEnd(8)} | ${String(avgFhirRaw).padStart(8)} | ${String(avgCompText).padStart(8)} | ${avgReduction.toFixed(1).padStart(7)}% |`)
  lines.push("")

  return lines.join("\n")
}

/**
 * Format results as detailed markdown table (all stages)
 */
function formatDetailedMarkdownTable(rows: BenchmarkRow[]): string {
  const lines: string[] = []

  lines.push("")
  lines.push("# CompText Token Benchmark Results (Detailed)")
  lines.push("")
  lines.push("| Scenario | FHIR Raw | Post-NURSE | Post-KVTC | CompText | Reduction |")
  lines.push("|----------|----------|------------|-----------|----------|----------|")

  for (const row of rows) {
    lines.push(
      `| ${row.scenario.padEnd(8)} | ${String(row.fhirRaw).padStart(8)} | ${String(row.postNurse).padStart(10)} | ${String(row.postKvtc).padStart(9)} | ${String(row.comptext).padStart(8)} | ${row.reductionPct.toFixed(1).padStart(7)}% |`,
    )
  }

  // Calculate averages
  const avgReduction =
    rows.reduce((sum, r) => sum + r.reductionPct, 0) / rows.length
  const avgFhirRaw = Math.round(rows.reduce((sum, r) => sum + r.fhirRaw, 0) / rows.length)
  const avgNurse = Math.round(rows.reduce((sum, r) => sum + r.postNurse, 0) / rows.length)
  const avgKvtc = Math.round(rows.reduce((sum, r) => sum + r.postKvtc, 0) / rows.length)
  const avgCompText = Math.round(rows.reduce((sum, r) => sum + r.comptext, 0) / rows.length)

  lines.push("|----------|----------|------------|-----------|----------|----------|")
  lines.push(`| ${"AVERAGE".padEnd(8)} | ${String(avgFhirRaw).padStart(8)} | ${String(avgNurse).padStart(10)} | ${String(avgKvtc).padStart(9)} | ${String(avgCompText).padStart(8)} | ${avgReduction.toFixed(1).padStart(7)}% |`)
  lines.push("")

  return lines.join("\n")
}

/**
 * Format results as CSV
 */
function formatCsv(rows: BenchmarkRow[]): string {
  const header = "scenario,fhir_raw,post_nurse,post_kvtc,comptext,reduction_pct,reduction_abs,latency_ms"
  const lines = rows.map(
    (r) =>
      `${r.scenarioId},${r.fhirRaw},${r.postNurse},${r.postKvtc},${r.comptext},${r.reductionPct},${r.reductionAbs},${r.latencyMs}`,
  )
  return [header, ...lines].join("\n")
}

/**
 * Format results as JSON
 */
function formatJson(rows: BenchmarkRow[]): string {
  const avgReduction = rows.reduce((sum, r) => sum + r.reductionPct, 0) / rows.length
  const totalTime = rows.reduce((sum, r) => sum + r.latencyMs, 0)

  const output = {
    timestamp: new Date().toISOString(),
    summary: {
      scenarios: rows.length,
      averageReduction: Math.round(avgReduction * 10) / 10,
      totalTimeMs: totalTime,
    },
    results: rows,
  }

  return JSON.stringify(output, null, 2)
}

/**
 * Main benchmark runner
 */
async function runBenchmark(): Promise<void> {
  console.error("Running CompText Benchmark...\n")

  const scenarios = [
    { id: "stemi", bundle: FHIR_STEMI },
    { id: "sepsis", bundle: FHIR_SEPSIS },
    { id: "stroke", bundle: FHIR_STROKE },
    { id: "anaphylaxie", bundle: FHIR_ANAPHYLAXIE },
    { id: "dm_hypo", bundle: FHIR_DM_HYPO },
  ]

  const results: BenchmarkRow[] = []

  for (const { id, bundle } of scenarios) {
    process.stderr.write(`  Processing ${SCENARIO_NAMES[id]}... `)
    const row = await benchmarkScenario(id, bundle)
    results.push(row)
    process.stderr.write(`OK (${row.latencyMs}ms, ${row.reductionPct.toFixed(1)}% reduction)\n`)
  }

  // Output based on format flag
  if (outputJson) {
    console.log(formatJson(results))
  } else if (outputCsv) {
    console.log(formatCsv(results))
  } else {
    // Default: markdown tables
    console.log(formatMarkdownTable(results))
    console.log(formatDetailedMarkdownTable(results))

    // Also show a sample output frame
    console.log("\n## Sample CompText Output (STEMI)")
    console.log("\n```")
    const stemiResult = await pipeline(FHIR_STEMI)
    console.log(serializeFrame(stemiResult.frame))
    console.log("```\n")
  }
}

// Run the benchmark
runBenchmark().catch((error) => {
  console.error("Benchmark failed:", error)
  process.exit(1)
})
