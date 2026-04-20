---
name: comptext-benchmark
description: Dieser Skill wird aktiviert, wenn der Benutzer "benchmark", "token count", "performance test", "vergleich", "token reduktion messen", "performance analyse", "pipeline benchmark", oder "efficiency test" erwähnt. Er bietet Unterstützung für Token-Reduktion Benchmarks und Performance-Analyse der CompText Pipeline.
version: 1.0.0
---

# CompText Benchmark Skill

Token-Reduktion Benchmarks und Performance-Analyse für die CompText Pipeline. Misst und vergleicht Token-Zahlen über alle Pipeline-Stages für alle klinischen Szenarien.

## Übersicht

Das Benchmarking-System misst die Effektivität der CompText Kompression:

```
┌─────────────────────────────────────────────────────────────┐
│ CompText Benchmark Results                                  │
├─────────────┬───────────┬───────────┬───────────┬───────────┤
│ Scenario    │ FHIR Raw  │ CompText  │ Reduction │  Time     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤
│ STEMI       │   1,847   │   112     │   93.9%   │  2.1ms    │
│ SEPSIS      │   2,213   │   131     │   94.1%   │  2.3ms    │
│ STROKE      │   2,041   │   124     │   93.9%   │  2.2ms    │
│ ANAPHYLAXIE │   1,742   │   108     │   93.8%   │  1.9ms    │
│ DM_HYPO     │   1,963   │   119     │   93.9%   │  2.0ms    │
├─────────────┼───────────┼───────────┼───────────┼───────────┤
│ Average     │   1,961   │   119     │   93.9%   │  2.1ms    │
└─────────────┴───────────┴───────────┴───────────┴───────────┘
```

## Trigger-Phrasen

Der Skill wird automatisch aktiviert bei:

- "benchmark"
- "token count"
- "performance test"
- "vergleich"
- "token reduktion messen"
- "performance analyse"
- "pipeline benchmark"
- "efficiency test"

## Verwendung

### Benchmark Ausführen

```bash
# Alle Szenarien benchmarken
npm run benchmark

# Spezifisches Szenario
npm run benchmark -- --scenario=STEMI

# Mit Tokenizer-Vergleich
npm run benchmark -- --compare-tokenizers

# Ausführlicher Output
npm run benchmark -- --verbose
```

### Programmatische Verwendung

```typescript
import { benchmark, benchmarkAll } from "@comptext/core";
import { FHIR_STEMI } from "@comptext/core";

// Einzelnes Szenario
const result = await benchmark(FHIR_STEMI);
console.log(result.reduction_pct); // 93.9
console.log(result.tokens.saved); // 1735

// Alle Szenarien
const allResults = await benchmarkAll();
Object.entries(allResults).forEach(([name, data]) => {
  console.log(`${name}: ${data.reduction_pct}% reduction`);
});
```

## Benchmark-Metriken

### Token-Metriken

| Metrik               | Beschreibung              | Berechnung              |
| -------------------- | ------------------------- | ----------------------- |
| `tokens.input`       | Originale FHIR Token-Zahl | cl100k_base             |
| `tokens.after_nurse` | Nach PHI-Scrubbing        | -                       |
| `tokens.after_kvtc`  | Nach Kompression          | -                       |
| `tokens.final`       | Finaler CompText Frame    | -                       |
| `reduction_pct`      | Prozentuale Reduktion     | (1 - final/input) × 100 |
| `compression_ratio`  | Kompressionsverhältnis    | input / final           |

### Performance-Metriken

| Metrik           | Beschreibung              | Zielwert |
| ---------------- | ------------------------- | -------- |
| `time.total_ms`  | Gesamtausführungszeit     | < 5ms    |
| `time.nurse_ms`  | NURSE Stage Zeit          | < 1ms    |
| `time.kvtc_ms`   | KVTC Stage Zeit           | < 3ms    |
| `time.triage_ms` | Triage Stage Zeit         | < 1ms    |
| `memory.peak_mb` | Spitzen-Speicherverbrauch | < 10MB   |

## Tokenizer-Vergleiche

Das Benchmark-System unterstützt mehrere Tokenizer:

| Tokenizer   | Provider        | Befehl                 |
| ----------- | --------------- | ---------------------- |
| cl100k_base | OpenAI (GPT-4)  | `--tokenizer=cl100k`   |
| o200k_base  | OpenAI (GPT-4o) | `--tokenizer=o200k`    |
| Gemini      | Google          | `--tokenizer=gemini`   |
| estimate    | Heuristik       | `--tokenizer=estimate` |

### Vergleich ausführen

```bash
# Vergleiche alle Tokenizer
npm run benchmark -- --compare-tokenizers --scenario=STEMI
```

Beispiel-Output:

```
Tokenizer Comparison: STEMI
┌─────────────┬───────────┬───────────┬─────────┐
│ Tokenizer   │ FHIR      │ CompText  │ Reduct% │
├─────────────┼───────────┼───────────┼─────────┤
│ cl100k_base │   1,847   │   112     │  93.9%  │
│ o200k_base  │   1,823   │   111     │  93.9%  │
│ gemini      │   1,891   │   115     │  93.9%  │
│ estimate    │   1,850   │   113     │  93.9%  │
└─────────────┴───────────┴───────────┴─────────┘
```

## Stage-spezifische Benchmarks

### NURSE Stage Benchmark

```typescript
import { benchmarkNurse } from "@comptext/core";

const nurseResult = await benchmarkNurse(fhirBundle);
// Zeigt PHI-Entfernungs-Statistiken
```

### KVTC Stage Benchmark

```typescript
import { benchmarkKVTC } from "@comptext/core";

const kvtcResult = await benchmarkKVTC(scrubbedBundle);
// Zeigt Kompressions-Details pro Layer
```

### Triage Stage Benchmark

```typescript
import { benchmarkTriage } from "@comptext/core";

const triageResult = await benchmarkTriage(compactBundle);
// Zeigt Triage-Engine Performance
```

## Ergebnis-Export

### Markdown-Tabelle

```bash
npm run benchmark -- --format=markdown --output=benchmark-results.md
```

### JSON Export

```bash
npm run benchmark -- --format=json --output=benchmark-results.json
```

### CSV Export

```bash
npm run benchmark -- --format=csv --output=benchmark-results.csv
```

## Beispiele

### Minimaler Benchmark

```typescript
import { benchmark } from "@comptext/core";
import { FHIR_SEPSIS } from "@comptext/core";

const result = await benchmark(FHIR_SEPSIS);

console.log(`
  Input:     ${result.tokens.input} tokens
  Output:    ${result.tokens.final} tokens
  Saved:     ${result.tokens.saved} tokens
  Reduction: ${result.reduction_pct.toFixed(1)}%
`);
```

### Detaillierter Benchmark

```typescript
import { benchmarkDetailed } from "@comptext/core";

const detailed = await benchmarkDetailed(FHIR_STEMI);

console.log("Stage Breakdown:");
detailed.stages.forEach((stage) => {
  console.log(`  ${stage.name}: ${stage.tokens} tokens (${stage.time_ms}ms)`);
});

console.log("\nSafety Fields Preserved:", detailed.safety.preserved_count);
console.log("PHI Fields Removed:", detailed.privacy.phi_removed);
```

### Vergleichende Analyse

```typescript
import { benchmarkAll, compareResults } from "@comptext/core";

const results = await benchmarkAll();
const comparison = compareResults(results);

console.log("Best Compression:", comparison.best_compression.scenario);
console.log("Fastest:", comparison.fastest.scenario);
console.log("Average Reduction:", comparison.average.reduction_pct);
```

## Benchmark-Konfiguration

```typescript
// benchmark.config.ts
export default {
  scenarios: ["STEMI", "SEPSIS", "STROKE", "ANAPHYLAXIE", "DM_HYPO"],
  iterations: 100,
  warmupRuns: 10,
  tokenizers: ["cl100k_base", "o200k_base"],
  output: {
    formats: ["console", "json", "markdown"],
    savePath: "./benchmarks",
  },
};
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Benchmark
on: [push]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run benchmark -- --format=json
      - uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: "customSmallerIsBetter"
          output-file-path: benchmark-results.json
```

### Performance Regression

```typescript
// tests/benchmark-regression.test.ts
import { benchmarkAll } from "@comptext/core";

test("Token reduction above 93%", async () => {
  const results = await benchmarkAll();
  Object.values(results).forEach((result) => {
    expect(result.reduction_pct).toBeGreaterThan(93);
  });
});

test("Pipeline execution under 5ms", async () => {
  const results = await benchmarkAll();
  Object.values(results).forEach((result) => {
    expect(result.time.total_ms).toBeLessThan(5);
  });
});
```

## Historische Vergleiche

### Trend-Analyse

```bash
# Vergleiche mit vorherigem Run
npm run benchmark -- --compare-with=benchmarks/history/main.json

# Zeige Trend über letzte 10 Runs
npm run benchmark -- --trend=10
```

## Weitere Ressourcen

### Referenz-Dateien

- **`scripts/benchmark.ts`** - Hauptbenchmark-Skript
- **`packages/core/src/benchmark.ts`** - Benchmark-Utilities
- **`docs/ARCHITECTURE.md`** - Performance-Architektur

### Benchmark-Daten

- **`benchmarks/`** - Historische Benchmark-Ergebnisse
- **`benchmarks/latest.json`** - Aktuellste Ergebnisse
- **`benchmarks/trends.csv`** - Trend-Daten über Zeit
