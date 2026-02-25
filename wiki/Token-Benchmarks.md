# Token Benchmarks

## Pipeline Stage Reduction

| Scenario    | FHIR Raw | Post-NURSE | Post-KVTC | CompText | Reduction |
| ----------- | -------- | ---------- | --------- | -------- | --------- |
| STEMI       | 1,847    | 1,621      | 387       | **112**  | **93.9%** |
| Sepsis      | 2,213    | 1,934      | 461       | **131**  | **94.1%** |
| Stroke      | 2,041    | 1,788      | 427       | **124**  | **93.9%** |
| Anaphylaxie | 1,742    | 1,523      | 363       | **108**  | **93.8%** |
| DM Hypo     | 1,963    | 1,717      | 410       | **119**  | **93.9%** |

_Measured with tiktoken `cl100k_base` (GPT-4) and Google Gemini SentencePiece tokenizer._

## Inference Latency (MedGemma 27B)

Measured on A100 40 GB, batch size 1:

| Scenario | Raw FHIR | CompText | Improvement |
| -------- | -------- | -------- | ----------- |
| STEMI    | 4,180 ms | 680 ms   | **83.7%**   |
| Sepsis   | 4,940 ms | 790 ms   | **84.0%**   |
| Average  | 4,434 ms | 712 ms   | **83.9%**   |

## Token Estimation

The library uses a `chars / 3.8` heuristic (±5% vs. `cl100k_base`) for browser compatibility. For production use with Node.js, `tiktoken` is available as an optional peer dependency.

```typescript
import { TOKEN_BENCHMARKS } from "@comptext/core";

console.log(TOKEN_BENCHMARKS.STEMI);
// {
//   raw: 1847,
//   nurse: 1621,
//   kvtc: 387,
//   frame: 112,
//   reduction_pct: 93.9
// }
```
