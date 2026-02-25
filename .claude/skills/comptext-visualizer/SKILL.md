---
name: comptext-visualizer
description: Dieser Skill wird aktiviert, wenn der Benutzer den "visualizer", "react app", "demo", "clinical visualization", "token reduction visualisieren", "pipeline ergebnisse anzeigen", "comptext demo", oder "fhir viewer" erwähnt. Er bietet Unterstützung für die React-basierte Visualisierung von CompText Pipeline-Ergebnissen.
version: 1.0.0
---

# CompText Visualizer Skill

React-basierte Visualisierungskomponente für CompText Pipeline-Ergebnisse. Zeigt Token-Reduktion, Sicherheitskritische Felder und klinische Szenarien interaktiv an.

## Übersicht

Der Visualizer ist eine Standalone-React-Applikation, die die CompText Pipeline demonstriert und visualisiert:

```
FHIR Bundle (1847 tokens)
    ↓ NURSE Stage
    → 1621 tokens (-12%)
    ↓ KVTC Stage
    → 387 tokens (-79%)
    ↓ Frame Assembly
    → 112 tokens (-94%)
    ↓ Visualisierung
    → Interaktive Dashboard-Ansicht
```

## Features

- **Token-Reduction-Chart**: Visualisiert die Reduktion über alle Pipeline-Stages
- **Frame-Vergleich**: Side-by-Side Vergleich von FHIR vs. CompText
- **Szenario-Selektor**: Umschalten zwischen STEMI, SEPSIS, STROKE, ANAPHYLAXIE, DM_HYPO
- **Safety-Highlight**: Sicherheitskritische Felder (ALG, RX, TRI) visuell hervorgehoben
- **GDPR-Compliance-Indikator**: Zeigt Datenschutz-Status an

## Trigger-Phrasen

Der Skill wird automatisch aktiviert bei:

- "visualizer"
- "react app"
- "demo"
- "clinical visualization"
- "token reduction visualisieren"
- "pipeline ergebnisse anzeigen"
- "comptext demo"
- "fhir viewer"

## Verwendung

### Visualizer Starten

```bash
# Entwicklungsmodus
npm run dev -w packages/visualizer

# Produktions-Build
npm run build -w packages/visualizer
```

### Als Komponente Importieren

```typescript
import { CompTextVisualizer } from "@comptext/visualizer"

function App() {
  return (
    <CompTextVisualizer
      scenario="STEMI"
      showTokenChart={true}
      showSafetyHighlight={true}
    />
  )
}
```

### Programmatischer Zugriff

```typescript
import { pipeline, serializeFrame } from "@comptext/core"

// Pipeline ausführen
const result = await pipeline(FHIR_STEMI)

// Für Visualizer aufbereiten
const visualizerData = {
  input: result.input,
  frame: result.frame,
  benchmark: result.benchmark,
  stages: [
    { name: "FHIR Raw", tokens: result.input.token_count },
    { name: "Post-NURSE", tokens: result.benchmark.tokens_after_nurse },
    { name: "Post-KVTC", tokens: result.benchmark.tokens_after_kvtc },
    { name: "CompText", tokens: result.benchmark.tokens_final }
  ]
}
```

## Verzeichnisstruktur

```
packages/visualizer/
├── src/
│   ├── App.tsx              # Hauptkomponente
│   ├── components/
│   │   ├── TokenChart.tsx   # Token-Reduktions-Diagramm
│   │   ├── FrameView.tsx    # CompText Frame Anzeige
│   │   ├── FHIRView.tsx     # Original FHIR Bundle Anzeige
│   │   ├── SafetyBadge.tsx  # ALG/RX/TRI Indikatoren
│   │   └── ScenarioSelector.tsx
│   ├── hooks/
│   │   └── usePipeline.ts   # Pipeline-Ausführung Hook
│   └── styles/
│       └── visualizer.css
├── index.html
└── package.json
```

## Visualisierungs-Komponenten

### TokenChart

Zeigt die Token-Reduktion als gestapeltes Balkendiagramm:

```typescript
interface TokenChartProps {
  stages: PipelineStage[]
  showPercentages?: boolean
  colorScheme?: "clinical" | "technical"
}
```

### FrameView

Zeigt den CompText Frame mit Syntax-Highlighting:

```typescript
interface FrameViewProps {
  frame: CompTextFrame
  highlightSafety?: boolean
  expandSections?: string[]
}
```

### SafetyBadge

Visualisiert Sicherheitskritische Informationen:

| Badge | Bedeutung | Farbe |
|-------|-----------|-------|
| ALG | Allergie vorhanden | Rot |
| RX | Medikation aktiv | Blau |
| TRI:P1 | Kritische Triage | Rot |
| TRI:P2 | Moderate Triage | Orange |

## Unterstützte Szenarien

| Szenario | Visualizer-Ansicht | Besondere Features |
|----------|-------------------|-------------------|
| STEMI | I21.09, hsTnI 4847 | Kontrastmittel-ALG Highlight |
| SEPSIS | A41.9, Laktat 4.8 | PCT-Trend-Indikator |
| STROKE | I63.3, NIHSS 14 | Zeitfenster-Anzeige |
| ANAPHYLAXIE | T78.2, sBP 64 | Notfall-Modus |
| DM_HYPO | E11.64, BZ 1.8 | Hypoglykämie-Warnung |

## Integration mit @comptext/core

Der Visualizer verwendet die Pipeline aus `@comptext/core`:

```typescript
// packages/visualizer/src/hooks/usePipeline.ts
import { pipeline, pipelineAll } from "@comptext/core"

export function usePipeline(scenario: string) {
  const [result, setResult] = useState<PipelineResult | null>(null)

  useEffect(() => {
    pipeline(getScenarioBundle(scenario))
      .then(setResult)
  }, [scenario])

  return result
}
```

## Responsive Design

- **Desktop**: Side-by-Side FHIR/CompText Vergleich
- **Tablet**: Gestapelte Ansicht mit Charts
- **Mobile**: Kompakte Frame-Ansicht, ausklappbare Details

## Beispiele

### Demo für Kliniker

```typescript
// Zeige STEMI-Szenario mit Safety-Highlights
<Visualizer
  scenario="STEMI"
  mode="clinical"
  highlightAllergies={true}
  highlightContraindications={true}
/>
```

### Technische Demo

```typescript
// Zeige alle Pipeline-Stages detailliert
<Visualizer
  scenario="SEPSIS"
  mode="technical"
  showIntermediateStages={true}
  showTokenCalculation={true}
/>
```

### Vergleichsansicht

```typescript
// Vergleiche zwei Szenarien
<ComparisonView
  scenarios={["STEMI", "SEPSIS"]}
  metrics={["token_reduction", "safety_score", "gdpr_compliance"]}
/>
```

## Weitere Ressourcen

### Referenz-Dateien
- **`packages/visualizer/src/App.tsx`** - Hauptkomponente
- **`packages/core/src/index.ts`** - Pipeline API
- **`docs/DSL_SPEC.md`** - CompText DSL Spezifikation

### Konfiguration

```typescript
// vite.config.ts
export default {
  resolve: {
    alias: {
      "@comptext/core": path.resolve(__dirname, "../core/src")
    }
  }
}
```
