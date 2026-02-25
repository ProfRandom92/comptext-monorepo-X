/**
 * @comptext/core/benchmarks — Token Benchmark Utilities
 *
 * Benchmark runner for comparing FHIR vs CompText token counts.
 *
 * @example
 * ```typescript
 * import { runBenchmarks, formatResults } from "@comptext/core/benchmarks"
 *
 * const results = await runBenchmarks()
 * console.log(formatResults(results))
 * ```
 */

import { pipeline, ALL_FHIR_BUNDLES } from "./index.js"

export interface BenchmarkResult {
  scenario: string
  fhirRaw: number
  postNurse: number
  postKvtc: number
  comptext: number
  reductionPct: number
  latencyMs: number
}

export interface BenchmarkSummary {
  results: BenchmarkResult[]
  averageReduction: number
  totalTimeMs: number
}

/**
 * Run benchmarks on all clinical scenarios.
 */
export async function runBenchmarks(): Promise<BenchmarkSummary> {
  const results: BenchmarkResult[] = []
  const startTime = performance.now()

  for (const [scenarioId, bundle] of Object.entries(ALL_FHIR_BUNDLES)) {
    const scenarioStart = performance.now()
    const result = await pipeline(bundle)
    const scenarioTime = performance.now() - scenarioStart

    results.push({
      scenario: scenarioId,
      fhirRaw: result.input.token_count,
      postNurse: result.nurse.token_out,
      postKvtc: result.kvtc.token_out,
      comptext: result.frame.tokens ?? 0,
      reductionPct: result.benchmark.reduction_pct,
      latencyMs: Math.round(scenarioTime),
    })
  }

  const totalTime = performance.now() - startTime
  const averageReduction =
    results.reduce((sum, r) => sum + r.reductionPct, 0) / results.length

  return {
    results,
    averageReduction: Math.round(averageReduction * 10) / 10,
    totalTimeMs: Math.round(totalTime),
  }
}

/**
 * Format benchmark results as markdown table.
 */
export function formatResults(summary: BenchmarkSummary): string {
  const lines: string[] = []
  lines.push("# CompText Token Benchmarks")
  lines.push("")
  lines.push("| Scenario | FHIR Raw | Post-NURSE | Post-KVTC | CompText | Reduction |")
  lines.push("|----------|----------|------------|-----------|----------|----------|")

  for (const r of summary.results) {
    lines.push(
      `| ${r.scenario} | ${r.fhirRaw} | ${r.postNurse} | ${r.postKvtc} | ${r.comptext} | ${r.reductionPct.toFixed(1)}% |`,
    )
  }

  lines.push("")
  lines.push(`**Average Reduction:** ${summary.averageReduction}%`)
  lines.push(`**Total Time:** ${summary.totalTimeMs}ms`)
  lines.push("")

  return lines.join("\n")
}

/**
 * Export benchmark results to JSON.
 */
export function exportToJson(summary: BenchmarkSummary): string {
  return JSON.stringify(summary, null, 2)
}
