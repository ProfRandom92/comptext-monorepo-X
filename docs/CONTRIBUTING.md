# CompText — Beitragsrichtlinien

> **Willkommen beim CompText-Projekt!** Dieses Dokument beschreibt wie Sie zum Projekt beitragen können.

---

## Inhaltsverzeichnis

- [Entwicklungs-Setup](#entwicklungs-setup)
- [Projektstruktur](#projektstruktur)
- [Code-Standards](#code-standards)
- [Testing-Guidelines](#testing-guidelines)
- [Pull-Request-Prozess](#pull-request-prozess)
- [Release-Prozess](#release-prozess)
- [Kontakt](#kontakt)

---

## Entwicklungs-Setup

### Voraussetzungen

- **Node.js:** >= 18.0.0
- **npm:** >= 9.0.0
- **Git:** >= 2.30.0
- **TypeScript:** >= 5.4.0

### Repository klonen

```bash
git clone https://github.com/akoellnberger/comptext.git
cd comptext
```

### Dependencies installieren

```bash
# Root-Level Dependencies
npm install

# Core Package Dependencies
cd packages/core
npm install
cd ../..
```

### Entwicklungs-Build

```bash
# Core Library bauen
npm run build -w packages/core

# Im Watch-Modus
npm run dev -w packages/core
```

### Tests ausführen

```bash
# Alle Tests
npm run test -w packages/core

# Mit Coverage
npm run test -w packages/core -- --coverage

# Einzelne Test-Datei
npm run test -w packages/core -- --run tests/pipeline.test.ts

# Watch-Modus
npm run test -w packages/core -- --watch
```

### Type-Checking

```bash
# Alle Packages
npm run typecheck

# Nur Core
npm run typecheck -w packages/core
```

### Benchmarks ausführen

```bash
# Alle Szenarien benchmarken
npm run benchmark

# Manuelles Benchmarking
npx tsx scripts/benchmark.ts
```

---

## Projektstruktur

```
comptext-monorepo/
├── packages/
│   ├── core/                    # @comptext/core npm Library
│   │   ├── src/
│   │   │   ├── index.ts         # Public API
│   │   │   ├── data.ts          # FHIR Testdaten
│   │   │   ├── types/
│   │   │   │   └── index.ts     # TypeScript-Typen
│   │   │   └── compiler/
│   │   │       ├── nurse.ts     # PHI-Scrubbing
│   │   │       ├── kvtc.ts      # Kompression
│   │   │       └── triage.ts    # Triage-Engine
│   │   ├── tests/
│   │   │   └── pipeline.test.ts  # Unit Tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── vitest.config.ts
│   │
│   └── visualizer/              # React Visualizer (Demo/Docs)
│       └── src/
│           └── App.tsx
│
├── docs/                        # Dokumentation
│   ├── API.md                   # API-Referenz
│   ├── ARCHITECTURE.md          # Systemarchitektur
│   ├── CONTRIBUTING.md          # Diese Datei
│   └── DSL_SPEC.md              # DSL-Spezifikation
│
├── scripts/                     # Build-Skripte
│   └── benchmark.ts             # Benchmark-Runner
│
├── package.json                 # Root-Package
└── README.md                    # Projekt-Übersicht
```

---

## Code-Standards

### Allgemeine Prinzipien

1. **Determinismus:** Alle Funktionen müssen bei gleichem Input gleichen Output produzieren
2. **Safety-First:** Sicherheitskritische Felder (ALG, RX, TRI) nie komprimieren
3. **GDPR:** PHI niemals im Klartext speichern oder loggen
4. **Performance:** Pipeline < 10ms für Standard-Bundles

### TypeScript-Stil

```typescript
// ✓ GUT: Explizite Typen, JSDoc-Kommentare

/**
 * Run the full CompText pipeline on a FHIR R4 bundle.
 *
 * @param bundle - FHIR R4 Bundle
 * @returns PipelineResult with CompTextFrame
 * @throws CompTextError if bundle is invalid
 */
export async function pipeline(bundle: FHIRBundle): Promise<PipelineResult> {
  // Validierung
  if (!bundle.entry?.length) {
    throw new CompTextError(
      "Bundle has no entries",
      "NO_RESOURCES",
      { bundle_id: bundle.id }
    )
  }
  // ...
}

// ✗ SCHLECHT: Implizite Typen, keine Kommentare
export async function pipeline(bundle) {
  if (!bundle.entry.length) {
    throw new Error("no entries")
  }
  // ...
}
```

### Namenskonventionen

| Element | Konvention | Beispiel |
|---------|------------|----------|
| Funktionen | camelCase | `runNURSE`, `assembleFrame` |
| Klassen | PascalCase | `CompTextError` |
| Interfaces | PascalCase | `PipelineResult` |
| Typen | PascalCase | `TriageClass` |
| Konstanten | UPPER_SNAKE | `LOINC_TO_KEY`, `PHI_PATTERNS` |
| Enums | PascalCase | `ScenarioCode` |
| Private | _präfix | `_meta`, `_pipe` |

### Import-Reihenfolge

```typescript
// 1. Built-ins (node:*)
import { readFile } from "node:fs/promises"

// 2. Externals
import { describe, it, expect } from "vitest"

// 3. Internals (absolute)
import type { FHIRBundle } from "./data.js"
import type { PipelineResult } from "./types/index.js"

// 4. Internals (relative)
import { runNURSE } from "./compiler/nurse.js"
import { runKVTC } from "./compiler/kvtc.js"
```

### Fehlerbehandlung

```typescript
// ✓ GUT: Typisierter Fehler mit Kontext
if (bundle.resourceType !== "Bundle") {
  throw new CompTextError(
    `Expected resourceType 'Bundle', got '${bundle.resourceType}'`,
    "INVALID_FHIR",
    { received: bundle.resourceType }
  )
}

// ✗ SCHLECHT: Generischer Fehler ohne Kontext
if (bundle.resourceType !== "Bundle") {
  throw new Error("invalid bundle")
}
```

### String-Interpolation

```typescript
// ✓ GUT: Template-Literals
const compact = `${pair.display}:${value}${targetUnit}${pair.interp ?? ""}`

// ✗ SCHLECHT: String-Konkatenation
const compact = pair.display + ":" + value + targetUnit + (pair.interp || "")
```

### Null-Checks

```typescript
// ✓ GUT: Optional chaining + nullish coalescing
const loinc = obs.code.coding?.[0]?.code ?? obs.id
const display = (sanitizedCodeText as string) ?? obs.code.coding?.[0]?.display

// ✗ SCHLECHT: Potenzielle Null-Pointer
const loinc = obs.code.coding[0].code
```

---

## Testing-Guidelines

### Test-Struktur

```typescript
describe("Feature Name", () => {
  // Setup (wenn nötig)
  beforeEach(() => {
    // Reset state
  })

  describe("Sub-Feature", () => {
    it("sollte erwartetes Verhalten zeigen", () => {
      // Arrange
      const input = createTestInput()

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toBe(expected)
    })

    it("sollte Fehler bei ungültigem Input werfen", () => {
      // Arrange
      const invalidInput = null

      // Act + Assert
      expect(() => functionUnderTest(invalidInput))
        .toThrow(CompTextError)
        .toHaveProperty("code", "INVALID_FHIR")
    })
  })
})
```

### Test-Namenskonventionen

```typescript
// ✓ GUT: Beschreibend, aktive Form
it("removes PHI fields from Patient resource", () => { })
it("returns P1 triage for STEMI with cardiogenic shock", () => { })
it("flags Rivaroxaban with LYSE-KI annotation", () => { })

// ✗ SCHLECHT: Vage, passiv
it("works correctly", () => { })
it("should do something", () => { })
it("test 1", () => { })
```

### Test-Abdeckung

Mindestanforderungen:

| Modul | Minimale Coverage |
|-------|-------------------|
| NURSE | 90% |
| KVTC | 85% |
| Triage | 90% |
| Pipeline | 95% |

### Test-Kategorien

```typescript
// 1. Unit Tests (isoliert)
describe("NURSE Stage", () => {
  it("removes PHI fields", () => {
    const result = runNURSE(FHIR_STEMI)
    expect(result.resources.find(r => r.type === "Patient")).not.toHaveProperty("name")
  })
})

// 2. Integration Tests (Stage-Kombination)
describe("Full Pipeline", () => {
  it("runs all stages correctly", async () => {
    const result = await pipeline(FHIR_STEMI)
    expect(result.frame.tri).toBe("P1")
    expect(result.benchmark.gdpr_compliant).toBe(true)
  })
})

// 3. Edge Cases
describe("Edge Cases", () => {
  it("handles empty bundle", () => {
    expect(() => pipeline({ resourceType: "Bundle", entry: [] }))
      .toThrow(CompTextError)
  })

  it("handles duplicate LOINC codes", () => {
    // ...
  })
})
```

### Test-Daten

Verwenden Sie eingebaute Test-Daten:

```typescript
import { FHIR_STEMI, FHIR_SEPSIS, FHIR_STROKE } from "../src/index.js"

// Oder kopieren für Modifikationen
const customBundle = JSON.parse(JSON.stringify(FHIR_STEMI))
customBundle.entry[0].resource.name[0].given = ["Custom"]
```

### Mocking

```typescript
// Datum mocken für deterministische Tests
const originalDate = Date.now
beforeEach(() => {
  Date.now = () => 1710509000000 // Festes Datum
})

afterEach(() => {
  Date.now = originalDate
})
```

---

## Pull-Request-Prozess

### 1. Branch-Strategie

```bash
# Neue Feature-Branch erstellen
git checkout -b feature/neue-loinc-codes

# Oder Bugfix-Branch
git checkout -b fix/nurse-phi-detection

# Oder Docs-Branch
git checkout -b docs/api-verbesserung
```

**Branch-Namen:**
- `feature/*` — Neue Features
- `fix/*` — Bugfixes
- `docs/*` — Dokumentation
- `refactor/*` — Refactoring
- `perf/*` — Performance-Verbesserungen

### 2. Commits

**Commit-Message-Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Typen:**
- `feat:` — Neue Feature
- `fix:` — Bugfix
- `docs:` — Dokumentation
- `style:` — Formatierung (keine Code-Änderung)
- `refactor:` — Refactoring
- `perf:` — Performance
- `test:` — Tests hinzufügen/ändern
- `chore:` — Build/Tooling

**Beispiele:**

```bash
feat(nurse): add IBAN detection regex pattern

Add German IBAN regex to PHI_PATTERNS for detecting
bank account numbers in free text fields.

Closes #123
```

```bash
fix(kvtc): handle missing LOINC code gracefully

When LOINC code is not found in LOINC_TO_KEY, use
display name as fallback instead of throwing error.

Fixes #456
```

```bash
docs(api): add JSDoc for all exported functions

Complete API documentation with examples for:
- pipeline()
- serializeFrame()
- pipelineAll()
```

### 3. Pre-PR Checkliste

Vor dem Erstellen eines PR:

```bash
# 1. Tests ausführen
npm run test -w packages/core

# 2. Type-Checking
npm run typecheck -w packages/core

# 3. Build testen
npm run build -w packages/core

# 4. Benchmarks (wenn Performance-relevant)
npm run benchmark
```

**Checkliste:**
- [ ] Alle Tests bestehen
- [ ] Keine Type-Errors
- [ ] Build erfolgreich
- [ ] Dokumentation aktualisiert (falls nötig)
- [ ] CHANGELOG.md aktualisiert (falls nötig)
- [ ] Breaking Changes dokumentiert

### 4. PR-Template

```markdown
## Beschreibung
Kurze Beschreibung der Änderungen.

## Änderungstyp
- [ ] Bugfix
- [ ] Feature
- [ ] Breaking Change
- [ ] Dokumentation
- [ ] Refactoring
- [ ] Performance

## Tests
- [ ] Tests hinzugefügt/aktualisiert
- [ ] Alle Tests bestehen
- [ ] Coverage eingehalten

## Checkliste
- [ ] Code folgt Style-Guide
- [ ] Dokumentation aktualisiert
- [ ] CHANGELOG.md aktualisiert
- [ ] Keine Breaking Changes (oder dokumentiert)

## Breaking Changes
Falls ja, beschreiben:
```

### 5. Review-Prozess

**Reviewer-Checkliste:**
- [ ] Code-Qualität OK
- [ ] Tests ausreichend
- [ ] Dokumentation verständlich
- [ ] Performance-Impact geprüft
- [ ] GDPR-Compliance geprüft (bei PHI-Änderungen)
- [ ] Safety-Critical Fields erhalten (bei Kompression)

**Review-Zyklen:**
1. Autor erstellt PR
2. Reviewer prüft (max. 48h)
3. Feedback-Loop
4. Approval
5. Merge durch Maintainer

### 6. Merge-Strategie

```bash
# Squash-Merge für Feature-Branches
git merge --squash feature/branch-name

# Merge-Commit für Release-Branches
git merge --no-ff release/x.x.x
```

---

## Release-Prozess

### Versionsnummern

Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Inkompatible API-Änderungen
- **MINOR:** Neue Features, rückwärtskompatibel
- **PATCH:** Bugfixes, rückwärtskompatibel

### Release-Checkliste

1. **Version bump:**
   ```bash
   npm version [major|minor|patch]
   ```

2. **Changelog aktualisieren:**
   ```markdown
   ## [5.1.0] - 2024-03-20
   ### Added
   - Neue LOINC-Codes für Trauma
   ### Fixed
   - PHI-Regex für Mobilnummern verbessert
   ```

3. **Tag erstellen:**
   ```bash
   git tag -a v5.1.0 -m "Release 5.1.0"
   git push origin v5.1.0
   ```

4. **NPM publishen:**
   ```bash
   cd packages/core
   npm publish --access public
   ```

5. **GitHub Release erstellen** mit Release-Notes

---

## Code-Review-Richtlinien

### Reviewer-Verantwortungen

1. **Funktionale Korrektheit**
   - Logik verstehen und validieren
   - Edge Cases identifizieren
   - Testabdeckung prüfen

2. **Code-Qualität**
   - Einhaltung der Style-Guide
   - Lesbarkeit und Wartbarkeit
   - Performance-Impact

3. **Sicherheit**
   - PHI-Handling korrekt?
   - Keine hartkodierten Secrets
   - GDPR-Compliance

4. **Dokumentation**
   - JSDoc vorhanden?
   - README aktualisiert?
   - Breaking Changes dokumentiert?

### Konstruktives Feedback

```markdown
// ✓ GUT: Spezifisch, konstruktiv
"Die Regex für Telefonnummern könnte auch +49 mit
Leerzeichen erfassen: `/\+49\s*\d+/`. Was meinst du?"

// ✗ SCHLECHT: Vage, destruktiv
"Das ist falsch."
```

---

## Debugging

### Lokales Debuggen

```bash
# Mit VS Code
code packages/core

# Debugging aktivieren
DEBUG=comptext:* npm run test -w packages/core

# Einzelner Test
debug() {
  node --inspect-brk node_modules/.bin/vitest run --reporter verbose tests/pipeline.test.ts
}
```

### Logging

```typescript
// In Entwicklung
if (process.env.DEBUG?.includes("comptext:")) {
  console.log("[NURSE] Processing bundle:", bundle.id)
}

// Nie PHI loggen!
// ✗ SCHLECHT:
console.log("Patient:", patient.name) // NEVER!

// ✓ GUT:
console.log("Patient hash:", patientHash) // OK
```

---

## Performance-Profiling

```typescript
// Manuelles Timing
const start = performance.now()
const result = runNURSE(bundle)
console.log(`NURSE: ${performance.now() - start}ms`)

// Node.js Profiling
node --prof node_modules/.bin/vitest run
node --prof-process isolate-0x*.log > profile.txt
```

---

## Häufige Probleme

### Problem: Tests schlagen fehl

```bash
# Lösung: Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
npm run build -w packages/core
npm run test -w packages/core
```

### Problem: Type-Errors

```bash
# Lösung: TypeScript neu bauen
cd packages/core
npx tsc --noEmit

# Oder: Incremental build löschen
rm -rf dist
npm run build
```

### Problem: Circular Dependencies

```bash
# Löszen: Dependency-Graph prüfen
npx madge packages/core/src --circular
```

---

## Danksagung

Vielen Dank für Ihr Interesse an CompText! Wir freuen uns über:

- Bug Reports
- Feature Requests
- Code-Beiträge
- Dokumentations-Verbesserungen
- Klinische Validierungsdaten

**Medical Disclaimer:** CompText ist ein Forschungs-Tool. Es ist kein zertifiziertes Medizinprodukt und darf ohne entsprechende Validierung und behördliche Zulassung nicht in der klinischen Entscheidungsfindung eingesetzt werden.

---

## Kontakt

- **Autor:** Alex Köllnberger
- **E-Mail:** alex@example.com
- **GitHub:** https://github.com/akoellnberger/comptext
- **Issues:** https://github.com/akoellnberger/comptext/issues

---

**Lizenz:** MIT — Siehe [LICENSE](../LICENSE) für Details.
