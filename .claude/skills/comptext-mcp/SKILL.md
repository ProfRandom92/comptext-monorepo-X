---
name: comptext-mcp
description: Dieser Skill wird aktiviert, wenn der Benutzer "mcp", "claude desktop", "mcp server", "tools", "mcp integration", "comptext als tool", "fhir mcp", oder "pipeline tool" erwähnt. Er bietet Unterstützung für die MCP (Model Context Protocol) Server Integration der CompText Pipeline.
version: 1.0.0
---

# CompText MCP Server Skill

MCP (Model Context Protocol) Server Integration für CompText. Stellt die CompText Pipeline als Tool für Claude Desktop und andere MCP-Clients zur Verfügung.

## Übersicht

Der MCP Server ermöglicht es Claude und anderen MCP-Clients, die CompText Pipeline direkt aufzurufen:

```
┌──────────────────────────────────────────────────────────────┐
│                     MCP Client (Claude Desktop)              │
└──────────────────────┬───────────────────────────────────────┘
                       │ MCP Protocol
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    CompText MCP Server                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Tools     │  │  Resources  │  │      Prompts        │  │
│  │             │  │             │  │                     │  │
│  │ • pipeline  │  │ • scenarios │  │ • clinical-summary  │  │
│  │ • benchmark │  │ • frame     │  │ • triage-assessment │  │
│  │ • validate  │  │ • metrics   │  │ • safety-check      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  @comptext/core │
              │    Pipeline     │
              └─────────────────┘
```

## Trigger-Phrasen

Der Skill wird automatisch aktiviert bei:

- "mcp"
- "claude desktop"
- "mcp server"
- "tools"
- "mcp integration"
- "comptext als tool"
- "fhir mcp"
- "pipeline tool"

## Verwendung

### MCP Server Starten

```bash
# Entwicklungsmodus
npm run mcp:dev

# Produktion
npm run mcp:start

# Als stdio Server (für Claude Desktop)
npm run mcp:start -- --stdio
```

### Claude Desktop Konfiguration

Füge den CompText MCP Server zu deiner Claude Desktop Konfiguration hinzu:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "comptext": {
      "command": "node",
      "args": [
        "C:/Users/contr/comptext-monorepo/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Verfügbare Tools

### comptext_pipeline

Führt die CompText Pipeline auf einem FHIR Bundle aus.

```json
{
  "name": "comptext_pipeline",
  "description": "Run CompText compression pipeline on FHIR R4 bundle",
  "inputSchema": {
    "type": "object",
    "properties": {
      "bundle": {
        "type": "object",
        "description": "FHIR R4 Bundle object"
      },
      "scenario": {
        "type": "string",
        "enum": ["STEMI", "SEPSIS", "STROKE", "ANAPHYLAXIE", "DM_HYPO"],
        "description": "Use built-in scenario instead of bundle"
      },
      "options": {
        "type": "object",
        "properties": {
          "skipNurse": { "type": "boolean" },
          "skipKVTC": { "type": "boolean" },
          "includeBenchmark": { "type": "boolean" }
        }
      }
    }
  }
}
```

### comptext_benchmark

Führt Benchmark-Tests auf Szenarien aus.

```json
{
  "name": "comptext_benchmark",
  "description": "Run token reduction benchmarks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "scenarios": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["STEMI", "SEPSIS", "STROKE", "ANAPHYLAXIE", "DM_HYPO", "ALL"]
        }
      },
      "includeDetails": {
        "type": "boolean",
        "description": "Include stage-by-stage token counts"
      }
    }
  }
}
```

### comptext_validate

Validiert einen CompText Frame.

```json
{
  "name": "comptext_validate",
  "description": "Validate CompText frame structure and content",
  "inputSchema": {
    "type": "object",
    "properties": {
      "frame": {
        "type": "string",
        "description": "CompText frame string to validate"
      },
      "checks": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["syntax", "safety", "gdpr", "completeness"]
        }
      }
    }
  }
}
```

### comptext_scenarios

Listet verfügbare klinische Szenarien auf.

```json
{
  "name": "comptext_scenarios",
  "description": "List available clinical scenarios",
  "inputSchema": {
    "type": "object",
    "properties": {
      "filter": {
        "type": "string",
        "enum": ["critical", "all"]
      }
    }
  }
}
```

## Verfügbare Ressourcen

### scenarios://list

Liste aller verfügbaren Szenarien.

```
resource://scenarios/list
```

Returns:
```json
[
  {
    "id": "STEMI",
    "name": "ST-Elevation Myocardial Infarction",
    "icd10": ["I21.09"],
    "triage": "P1",
    "tokenCount": 1847
  },
  {
    "id": "SEPSIS",
    "name": "Severe Sepsis",
    "icd10": ["A41.9"],
    "triage": "P1",
    "tokenCount": 2213
  }
]
```

### frame://{scenario}

CompText Frame für ein Szenario.

```
resource://frame/STEMI
```

Returns:
```
CT:v5 SC:STEMI TRI:P1
VS[hr:118 sbp:82 spo2:91]
LAB[hsTnI:4847 ckmb:48.7]
ALG:Jodkontrastmittel SEV:II KI:[V08,V09]
RX:Aspirin ATC:1191 DOSE:500mg FREQ:Einmalgabe
ICD:[I21.09]
CTX:Ak. transm. MI VW KS; KM-ALG Grad II
GDPR:ART9 PHI:3f8a1c2d TS:1710509000
```

### metrics://benchmark

Aktuelle Benchmark-Metriken.

```
resource://metrics/benchmark
```

## Verfügbare Prompts

### clinical_summary

Generiert eine klinische Zusammenfassung aus einem CompText Frame.

```
prompt://clinical_summary
```

Input:
```json
{
  "frame": "CT:v5 SC:STEMI TRI:P1...",
  "language": "de",
  "detail": "brief"
}
```

### triage_assessment

Bewertet die Triage-Klassifikation.

```
prompt://triage_assessment
```

### safety_check

Überprüft sicherheitskritische Informationen.

```
prompt://safety_check
```

## Beispiel-Interaktionen

### Pipeline Ausführen

```
User: "Führe die CompText Pipeline auf dem STEMI-Szenario aus"

Claude: Ich werde die CompText Pipeline auf das STEMI-Szenario anwenden.

<tool name="comptext_pipeline">
{"scenario": "STEMI"}
</tool>

Ergebnis:
- Input: 1,847 Tokens (FHIR Bundle)
- Output: 112 Tokens (CompText Frame)
- Reduktion: 93.9%
- Triage: P1 (kritisch)
- Safety: Kontrastmittel-Allergie erkannt
```

### Benchmark Vergleich

```
User: "Vergleiche die Token-Reduktion aller Szenarien"

Claude: Ich führe Benchmarks für alle verfügbaren Szenarien durch.

<tool name="comptext_benchmark">
{"scenarios": ["ALL"], "includeDetails": true}
</tool>

Ergebnisse:
| Szenario    | Reduktion | Final Tokens |
|-------------|-----------|--------------|
| STEMI       | 93.9%     | 112          |
| SEPSIS      | 94.1%     | 131          |
| STROKE      | 93.9%     | 124          |
| ANAPHYLAXIE | 93.8%     | 108          |
| DM_HYPO     | 93.9%     | 119          |

Durchschnittliche Reduktion: 93.9%
```

### Frame Validierung

```
User: "Validiere diesen CompText Frame: CT:v5 SC:SEPSIS..."

Claude: Ich validiere den CompText Frame auf Syntax, Safety und GDPR-Compliance.

<tool name="comptext_validate">
{"frame": "CT:v5 SC:SEPSIS TRI:P1...", "checks": ["syntax", "safety", "gdpr"]}
</tool>

Validierungsergebnis:
✓ Syntax: Valide
✓ Safety: Kritische Felder vorhanden (ALG, TRI)
✓ GDPR: PHI korrekt gehasht
```

## Verzeichnisstruktur

```
packages/mcp-server/
├── src/
│   ├── index.ts           # MCP Server Entry Point
│   ├── server.ts          # Server Konfiguration
│   ├── tools/
│   │   ├── pipeline.ts    # comptext_pipeline Tool
│   │   ├── benchmark.ts   # comptext_benchmark Tool
│   │   ├── validate.ts    # comptext_validate Tool
│   │   └── scenarios.ts   # comptext_scenarios Tool
│   ├── resources/
│   │   ├── scenarios.ts   # scenarios:// Ressourcen
│   │   ├── frame.ts       # frame:// Ressourcen
│   │   └── metrics.ts     # metrics:// Ressourcen
│   └── prompts/
│       ├── clinicalSummary.ts
│       ├── triageAssessment.ts
│       └── safetyCheck.ts
├── package.json
└── README.md
```

## Installation

```bash
# Dependencies installieren
npm install -w packages/mcp-server

# Bauen
npm run build -w packages/mcp-server

# MCP Server testen
npm run test:mcp
```

## Konfiguration

### Umgebungsvariablen

```bash
# .env
COMPTE_MCP_LOG_LEVEL=info
COMPTE_MCP_TRANSPORT=stdio
COMPTE_MCP_PORT=3000
```

### Server-Optionen

```typescript
// mcp.config.ts
export default {
  name: "comptext-mcp-server",
  version: "1.0.0",
  transport: "stdio", // oder "sse"
  tools: {
    pipeline: { enabled: true },
    benchmark: { enabled: true },
    validate: { enabled: true },
    scenarios: { enabled: true }
  },
  resources: {
    scenarios: { enabled: true },
    frame: { enabled: true },
    metrics: { enabled: true }
  },
  prompts: {
    clinicalSummary: { enabled: true },
    triageAssessment: { enabled: true },
    safetyCheck: { enabled: true }
  }
}
```

## Weitere Ressourcen

### Referenz-Dateien
- **`packages/mcp-server/src/index.ts`** - Server Entry Point
- **`packages/core/src/index.ts`** - Pipeline API
- **`CLAUDE.md`** - CompText Handoff-Dokumentation

### MCP Dokumentation
- Model Context Protocol Spec: https://modelcontextprotocol.io
- Claude Desktop MCP: https://claude.ai/docs/mcp
