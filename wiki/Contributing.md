# Contributing

> See also: [`docs/CONTRIBUTING.md`](../blob/main/docs/CONTRIBUTING.md) for the full guide.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- TypeScript >= 5.4.0

## Development Setup

```bash
git clone https://github.com/ProfRandom92/comptext-monorepo-X
cd comptext-monorepo-X
npm install

# Build core library
npm run build -w packages/core

# Run tests (33 unit tests)
npm run test -w packages/core

# Start visualizer
npm run dev -w packages/visualizer
```

## Project Structure

```
packages/core/src/compiler/
├── nurse.ts    ← Stage 1: PHI scrubbing
├── kvtc.ts     ← Stage 2: Compression
└── triage.ts   ← Stage 3: Frame assembly + triage
```

## Open Tasks (from CLAUDE.md)

**P2 — Next:**

- Extend NURSE with regex-based PHI detection (German postal codes, phone numbers, IBAN)
- Batch LOINC lookup in KVTC for large bundles

**P3 — Later:**

- MCP Server package (`packages/mcp-server/`)
- Additional FHIR scenarios: TRAUMA, HF_DECOMP, ACS_NSTEMI, ARDS
- Benchmark against tiktoken and Gemini tokenizer

## Code Standards

- All source in TypeScript strict mode
- Tests with Vitest (`npm run test -w packages/core`)
- Linting with ESLint + `@typescript-eslint`
- Formatting with Prettier
- Pre-commit hooks via Husky + lint-staged
