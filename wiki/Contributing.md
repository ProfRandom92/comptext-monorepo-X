# Contributing

> Full contributing guide: [`docs/CONTRIBUTING.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/CONTRIBUTING.md)

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Clone & Install

```bash
git clone https://github.com/ProfRandom92/comptext-monorepo-X.git
cd comptext-monorepo-X
npm install
```

### Build & Test

```bash
# Build @comptext/core
npm run build -w packages/core

# Run tests (31 unit tests)
npm run test -w packages/core

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

---

## Code Standards

### Key Principles

1. **Determinism** — all functions must produce the same output for the same input
2. **Safety-first** — safety-critical fields (`alg`, `rx`, `tri`) must never be compressed
3. **GDPR** — never log or store PHI in plaintext
4. **Performance** — pipeline must complete in < 10 ms for standard bundles

### TypeScript Style

```typescript
// ✓ GOOD: Explicit types, JSDoc comments
/**
 * Run the full CompText pipeline on a FHIR R4 bundle.
 * @throws CompTextError if bundle is invalid
 */
export async function pipeline(bundle: FHIRBundle): Promise<PipelineResult> { ... }

// ✗ BAD: Implicit types, no documentation
export async function pipeline(bundle) { ... }
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Functions | camelCase | `runNURSE`, `assembleFrame` |
| Classes | PascalCase | `CompTextError` |
| Interfaces | PascalCase | `PipelineResult` |
| Constants | UPPER_SNAKE | `LOINC_TO_KEY` |
| Private fields | `_prefix` | `_meta`, `_pipe` |

---

## Commit Messages

Format: `<type>(<scope>): <subject>`

| Type | Use for |
|------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `refactor:` | Refactoring (no behaviour change) |
| `perf:` | Performance improvement |
| `test:` | Adding/changing tests |
| `chore:` | Build, tooling |

**Examples:**
```
feat(nurse): add IBAN detection regex pattern
fix(kvtc): handle missing LOINC code gracefully
docs(api): add JSDoc for all exported functions
```

---

## Branch Strategy

```
main         ← stable releases
develop      ← integration branch
feature/*    ← new features
fix/*        ← bug fixes
docs/*       ← documentation
```

---

## Pre-PR Checklist

```bash
npm run test -w packages/core      # all tests pass
npm run typecheck -w packages/core  # no type errors
npm run build -w packages/core     # build succeeds
npm run lint                        # no lint errors
```

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Docs updated (if applicable)
- [ ] Breaking changes documented

---

## Testing Guidelines

```typescript
// ✓ GOOD: Descriptive, active test names
it("removes PHI fields from Patient resource", () => { })
it("returns P1 triage for STEMI with cardiogenic shock", () => { })

// Use built-in test data
import { FHIR_STEMI } from "../src/index.js"
const result = await pipeline(FHIR_STEMI)
```

| Module | Min. Coverage |
|--------|--------------|
| NURSE | 90% |
| KVTC | 85% |
| Triage | 90% |
| Pipeline | 95% |

---

> 📄 Full contributing guide: [`docs/CONTRIBUTING.md`](https://github.com/ProfRandom92/comptext-monorepo-X/blob/main/docs/CONTRIBUTING.md)
