#!/usr/bin/env node

/**
 * CompText MCP Server
 *
 * Provides MCP tools for clinical AI token preprocessing:
 * - comptext_pipeline: Run full pipeline on FHIR bundle
 * - comptext_scenarios: Get available clinical scenarios
 * - comptext_benchmark: Run token reduction benchmarks
 *
 * @example
 * ```json
 * {
 *   "mcpServers": {
 *     "comptext": {
 *       "command": "npx",
 *       "args": ["-y", "@comptext/mcp-server"]
 *     }
 *   }
 * }
 * ```
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js"

import {
  pipeline,
  pipelineAll,
  serializeFrame,
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  ALL_FHIR_BUNDLES,
  TOKEN_BENCHMARKS,
} from "@comptext/core"

const TOOLS: Tool[] = [
  {
    name: "comptext_pipeline",
    description: "Run CompText pipeline on a FHIR R4 bundle to reduce tokens by 93-94% while preserving safety-critical information",
    inputSchema: {
      type: "object",
      properties: {
        bundle: {
          type: "object",
          description: "FHIR R4 Bundle with Patient, Observations, Conditions, Medications",
        },
        scenario: {
          type: "string",
          enum: ["STEMI", "SEPSIS", "STROKE", "ANAPHYLAXIE", "DM_HYPO"],
          description: "Optional: Use built-in clinical scenario instead of custom bundle",
        },
        includeDsl: {
          type: "boolean",
          description: "Include compact DSL string output",
          default: true,
        },
      },
    },
  },
  {
    name: "comptext_scenarios",
    description: "Get list of available built-in clinical scenarios with their metadata",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "comptext_benchmark",
    description: "Run token reduction benchmark on all clinical scenarios",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["json", "markdown"],
          description: "Output format",
          default: "json",
        },
      },
    },
  },
  {
    name: "comptext_analyze",
    description: "Analyze a CompText frame for safety-critical alerts and clinical relevance",
    inputSchema: {
      type: "object",
      properties: {
        frame: {
          type: "object",
          description: "CompText frame object from pipeline output",
        },
      },
      required: ["frame"],
    },
  },
]

const server = new Server(
  {
    name: "comptext-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "comptext_pipeline": {
        let bundle: typeof FHIR_STEMI

        // Use built-in scenario if specified
        if (args?.scenario && typeof args.scenario === "string") {
          const scenarios: Record<string, typeof FHIR_STEMI> = {
            STEMI: FHIR_STEMI,
            SEPSIS: FHIR_SEPSIS,
            STROKE: FHIR_STROKE,
            ANAPHYLAXIE: FHIR_ANAPHYLAXIE,
            DM_HYPO: FHIR_DM_HYPO,
          }
          bundle = scenarios[args.scenario as string]
          if (!bundle) {
            throw new Error(`Unknown scenario: ${args.scenario}`)
          }
        } else if (args?.bundle && typeof args.bundle === "object") {
          bundle = args.bundle as typeof FHIR_STEMI
        } else {
          throw new Error("Either 'bundle' or 'scenario' must be provided")
        }

        const result = await pipeline(bundle)

        const output: Record<string, unknown> = {
          frame: result.frame,
          benchmark: result.benchmark,
          input: result.input,
        }

        if (args?.includeDsl !== false) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output.dsl = serializeFrame(result.frame as any)
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(output, null, 2),
            },
          ],
        }
      }

      case "comptext_scenarios": {
        const scenarios = [
          {
            id: "STEMI",
            name: "ST-Elevation Myocardial Infarction",
            icd10: "I21.09",
            triage: "P1",
            keyValues: ["hsTnI 4847 ng/L", "sBP 82 mmHg"],
            alerts: ["Jodkontrastmittel allergy"],
            tokenReduction: "93.9%",
          },
          {
            id: "SEPSIS",
            name: "Severe Sepsis",
            icd10: "A41.9",
            triage: "P1",
            keyValues: ["Laktat 4.8 mmol/L", "PCT 38.4 µg/L", "sBP 76 mmHg"],
            alerts: ["Penicillin Grade III allergy"],
            tokenReduction: "94.1%",
          },
          {
            id: "STROKE",
            name: "Ischemic Stroke",
            icd10: "I63.3",
            triage: "P1",
            keyValues: ["NIHSS 14", "Onset 2h"],
            alerts: ["Rivaroxaban - thrombolysis contraindicated"],
            tokenReduction: "93.9%",
          },
          {
            id: "ANAPHYLAXIE",
            name: "Anaphylaxis",
            icd10: "T78.2",
            triage: "P1",
            keyValues: ["sBP 64 mmHg", "SpO2 87%"],
            alerts: ["Hymenoptera venom + Asthma"],
            tokenReduction: "93.8%",
          },
          {
            id: "DM_HYPO",
            name: "Diabetes Hypoglycemia",
            icd10: "E11.64",
            triage: "P1/P2",
            keyValues: ["BZ 1.8 mmol/L", "eGFR 38"],
            alerts: ["Glibenclamid + CKD - rebound risk"],
            tokenReduction: "93.9%",
          },
        ]

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ scenarios }, null, 2),
            },
          ],
        }
      }

      case "comptext_benchmark": {
        const results = await pipelineAll()

        const format = args?.format || "json"

        if (format === "markdown") {
          const lines: string[] = []
          lines.push("# CompText Token Benchmarks")
          lines.push("")
          lines.push("| Scenario | FHIR Raw | CompText | Reduction | Triage |")
          lines.push("|----------|----------|----------|-----------|--------|")

          for (const [id, result] of Object.entries(results)) {
            lines.push(
              `| ${id} | ${result.input.token_count} | ${result.frame.tokens || "N/A"} | ${result.benchmark.reduction_pct.toFixed(1)}% | ${result.frame.tri} |`
            )
          }

          lines.push("")

          return {
            content: [
              {
                type: "text",
                text: lines.join("\n"),
              },
            ],
          }
        }

        // JSON format
        const summary = Object.entries(results).map(([id, result]) => ({
          scenario: id,
          inputTokens: result.input.token_count,
          outputTokens: result.frame.tokens,
          reductionPct: result.benchmark.reduction_pct,
          triage: result.frame.tri,
          gdprCompliant: result.benchmark.gdpr_compliant,
        }))

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ benchmarks: summary }, null, 2),
            },
          ],
        }
      }

      case "comptext_analyze": {
        const { frame } = args as { frame: { tri: string; alg: unknown[]; rx: unknown[]; vs: Record<string, number>; lab: Record<string, number> } }

        const analysis: Record<string, unknown> = {
          triage: {
            class: frame.tri,
            urgency: frame.tri === "P1" ? "Immediate" : frame.tri === "P2" ? "Urgent" : "Standard",
          },
          safetyAlerts: {
            allergies: frame.alg?.length || 0,
            medications: frame.rx?.length || 0,
            alerts: [],
          },
          criticalValues: [],
        }

        // Check for critical vital signs
        if (frame.vs) {
          if (frame.vs.sbp !== undefined && frame.vs.sbp < 90) {
            (analysis.criticalValues as string[]).push(`Hypotension: sBP ${frame.vs.sbp} mmHg`)
          }
          if (frame.vs.spo2 !== undefined && frame.vs.spo2 < 90) {
            (analysis.criticalValues as string[]).push(`Hypoxemia: SpO2 ${frame.vs.spo2}%`)
          }
          if (frame.vs.hr !== undefined && frame.vs.hr > 150) {
            (analysis.criticalValues as string[]).push(`Tachycardia: HR ${frame.vs.hr} bpm`)
          }
        }

        // Check for critical lab values
        if (frame.lab) {
          if (frame.lab.hs_tni !== undefined && frame.lab.hs_tni > 50) {
            (analysis.criticalValues as string[]).push(`Elevated hsTroponin: ${frame.lab.hs_tni} ng/L`)
          }
          if (frame.lab.lactate !== undefined && frame.lab.lactate > 4) {
            (analysis.criticalValues as string[]).push(`Elevated lactate: ${frame.lab.lactate} mmol/L`)
          }
          if (frame.lab.glucose !== undefined && frame.lab.glucose < 2.5) {
            (analysis.criticalValues as string[]).push(`Severe hypoglycemia: ${frame.lab.glucose} mmol/L`)
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    }
  }
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)

console.error("CompText MCP Server running on stdio")
