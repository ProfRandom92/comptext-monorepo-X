import { useEffect, useState } from "react"
import {
  TOKEN_BENCHMARKS,
  pipeline,
  FHIR_STEMI,
  FHIR_SEPSIS,
  FHIR_STROKE,
  FHIR_ANAPHYLAXIE,
  FHIR_DM_HYPO,
  ALL_FHIR_BUNDLES,
  pipelineAll,
  serializeFrame,
  type PipelineResult,
  type CompTextFrame,
} from "@comptext/core"

import "./App.css"

// Scenario display names
const SCENARIO_NAMES: Record<string, string> = {
  stemi: "STEMI",
  sepsis: "Sepsis",
  stroke: "Stroke",
  anaphylaxie: "Anaphylaxie",
  dm_hypo: "DM Hypo",
}

// Scenario descriptions
const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  stemi: "68-year-old male, acute anterior STEMI with cardiogenic shock",
  sepsis: "54-year-old female, septic shock with qSOFA 3",
  stroke: "71-year-old male, ischemic stroke NIHSS 14",
  anaphylaxie: "34-year-old female, anaphylactic shock post-contrast",
  dm_hypo: "62-year-old male, severe hypoglycemia BZ 1.8 mmol/L",
}

function App() {
  const [results, setResults] = useState<Record<string, PipelineResult> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "frame">("overview")

  useEffect(() => {
    const runPipeline = async () => {
      try {
        setLoading(true)
        const allResults = await pipelineAll()
        setResults(allResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pipeline failed")
      } finally {
        setLoading(false)
      }
    }

    runPipeline()
  }, [])

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (!results) return null

    const scenarios = Object.keys(results)
    const avgReduction =
      scenarios.reduce((sum, key) => sum + results[key].benchmark.reduction_pct, 0) /
      scenarios.length

    const totalTokensRaw = scenarios.reduce(
      (sum, key) => sum + results[key].input.token_count,
      0
    )
    const totalTokensCompressed = scenarios.reduce(
      (sum, key) => sum + (results[key].frame.tokens ?? 0),
      0
    )

    return {
      avgReduction: avgReduction.toFixed(1),
      totalTokensRaw,
      totalTokensCompressed,
      overallReduction: (
        ((totalTokensRaw - totalTokensCompressed) / totalTokensRaw) *
        100
      ).toFixed(1),
    }
  }

  const stats = getSummaryStats()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Running CompText Pipeline...</p>
        <p className="loading-subtitle">Processing 5 clinical scenarios</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Pipeline Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>CompText Visualizer</h1>
        <p className="subtitle">
          FHIR R4 → CompText Frame Pipeline | v5.0
        </p>
      </header>

      {stats && (
        <div className="summary-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.avgReduction}%</span>
            <span className="stat-label">Avg. Token Reduction</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalTokensRaw.toLocaleString()}</span>
            <span className="stat-label">Total Raw Tokens</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {stats.totalTokensCompressed.toLocaleString()}
            </span>
            <span className="stat-label">Total CompText Tokens</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.overallReduction}%</span>
            <span className="stat-label">Overall Reduction</span>
          </div>
        </div>
      )}

      <nav className="tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "details" ? "active" : ""}
          onClick={() => setActiveTab("details")}
        >
          Pipeline Details
        </button>
        <button
          className={activeTab === "frame" ? "active" : ""}
          onClick={() => setActiveTab("frame")}
        >
          CompText Frames
        </button>
      </nav>

      <main className="content">
        {activeTab === "overview" && (
          <div className="overview-tab">
            <h2>Scenario Comparison</h2>
            <div className="scenario-grid">
              {Object.entries(TOKEN_BENCHMARKS).map(([key, benchmark]) => (
                <div
                  key={key}
                  className={`scenario-card ${selectedScenario === key ? "selected" : ""}`}
                  onClick={() => setSelectedScenario(key === selectedScenario ? null : key)}
                >
                  <div className="scenario-header">
                    <h3>{SCENARIO_NAMES[key]}</h3>
                    <span
                      className={`triage-badge triage-${
                        results?.[key]?.frame.tri.toLowerCase() || "p1"
                      }`}
                    >
                      {results?.[key]?.frame.tri || "P1"}
                    </span>
                  </div>
                  <p className="scenario-desc">{SCENARIO_DESCRIPTIONS[key]}</p>

                  <div className="token-bar">
                    <div
                      className="token-bar-segment raw"
                      style={{
                        width: `${(benchmark.gpt4_raw / 2500) * 100}%`,
                      }}
                      title={`Raw FHIR: ${benchmark.gpt4_raw} tokens`}
                    />
                    <div
                      className="token-bar-segment nurse"
                      style={{
                        width: `${((benchmark.gpt4_nurse - benchmark.gpt4_raw) / 2500) * 100}%`,
                      }}
                    />
                    <div
                      className="token-bar-segment kvtc"
                      style={{
                        width: `${((benchmark.gpt4_kvtc - benchmark.gpt4_nurse) / 2500) * 100}%`,
                      }}
                    />
                    <div
                      className="token-bar-segment final"
                      style={{
                        width: `${(benchmark.gpt4_comptext / 2500) * 100}%`,
                      }}
                      title={`CompText: ${benchmark.gpt4_comptext} tokens`}
                    />
                  </div>

                  <div className="token-stats">
                    <div className="token-stat">
                      <span className="token-label">Raw</span>
                      <span className="token-value raw">
                        {benchmark.gpt4_raw.toLocaleString()}
                      </span>
                    </div>
                    <div className="token-stat">
                      <span className="token-label">NURSE</span>
                      <span className="token-value nurse">
                        {benchmark.gpt4_nurse.toLocaleString()}
                      </span>
                    </div>
                    <div className="token-stat">
                      <span className="token-label">KVTC</span>
                      <span className="token-value kvtc">
                        {benchmark.gpt4_kvtc.toLocaleString()}
                      </span>
                    </div>
                    <div className="token-stat">
                      <span className="token-label">Frame</span>
                      <span className="token-value final">
                        {benchmark.gpt4_comptext.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="reduction-badge">
                    -{benchmark.gpt4_reduction_pct}% tokens
                  </div>

                  {results?.[key] && (
                    <div className="scenario-meta">
                      <span className="gdpr-badge">
                        GDPR: {results[key].benchmark.gdpr_compliant ? "✓" : "✗"}
                      </span>
                      <span className="latency-badge">
                        {results[key].benchmark.total_ms}ms
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedScenario && results?.[selectedScenario] && (
              <div className="detail-panel">
                <h3>{SCENARIO_NAMES[selectedScenario]} Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Bundle ID</span>
                    <span className="detail-value">
                      {results[selectedScenario].input.bundle_id}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Scenario</span>
                    <span className="detail-value">
                      {results[selectedScenario].input.scenario_id}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">PHI Fields Removed</span>
                    <span className="detail-value">
                      {results[selectedScenario].nurse.phi_fields_removed}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">PHI Hash</span>
                    <span className="detail-value mono">
                      {results[selectedScenario].nurse.phi_hash}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && results && (
          <div className="details-tab">
            <h2>Pipeline Stage Details</h2>
            {Object.entries(results).map(([key, result]) => (
              <div key={key} className="pipeline-details">
                <h3>{SCENARIO_NAMES[key]}</h3>

                <div className="stage-section">
                  <h4>Stage 1: NURSE (PHI Scrubbing)</h4>
                  <div className="stage-stats">
                    <div className="stage-stat">
                      <span>Input Tokens</span>
                      <strong>{result.nurse.token_in.toLocaleString()}</strong>
                    </div>
                    <div className="stage-stat">
                      <span>Output Tokens</span>
                      <strong>{result.nurse.token_out.toLocaleString()}</strong>
                    </div>
                    <div className="stage-stat">
                      <span>PHI Fields Removed</span>
                      <strong>{result.nurse.phi_fields_removed}</strong>
                    </div>
                    <div className="stage-stat">
                      <span>Scrubbed</span>
                      <strong>{result.nurse.scrubbed ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>

                <div className="stage-section">
                  <h4>Stage 2: KVTC (4-Layer Compression)</h4>
                  <div className="kvtc-layers">
                    <div className="layer">
                      <span className="layer-name">K-Layer (Key Extraction)</span>
                      <span className="layer-saved">
                        -{result.kvtc.layer_k.token_saved} tokens
                      </span>
                    </div>
                    <div className="layer">
                      <span className="layer-name">V-Layer (Value Normalization)</span>
                      <span className="layer-saved">
                        -{result.kvtc.layer_v.token_saved} tokens
                      </span>
                    </div>
                    <div className="layer">
                      <span className="layer-name">T-Layer (Type Encoding)</span>
                      <span className="layer-saved">
                        -{result.kvtc.layer_t.token_saved} tokens
                      </span>
                    </div>
                    <div className="layer">
                      <span className="layer-name">C-Layer (Context Compression)</span>
                      <span className="layer-saved">
                        -{result.kvtc.layer_c.token_saved} tokens
                      </span>
                    </div>
                  </div>
                  <div className="stage-stats">
                    <div className="stage-stat">
                      <span>Input Tokens</span>
                      <strong>{result.kvtc.token_in.toLocaleString()}</strong>
                    </div>
                    <div className="stage-stat">
                      <span>Output Tokens</span>
                      <strong>{result.kvtc.token_out.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="stage-section">
                  <h4>Final Results</h4>
                  <div className="stage-stats">
                    <div className="stage-stat highlight">
                      <span>Total Reduction</span>
                      <strong>{result.benchmark.reduction_pct}%</strong>
                    </div>
                    <div className="stage-stat">
                      <span>Processing Time</span>
                      <strong>{result.benchmark.total_ms}ms</strong>
                    </div>
                    <div className="stage-stat">
                      <span>GDPR Compliant</span>
                      <strong>{result.benchmark.gdpr_compliant ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "frame" && results && (
          <div className="frame-tab">
            <h2>CompText Frames (DSL Output)</h2>
            {Object.entries(results).map(([key, result]) => (
              <div key={key} className="frame-section">
                <h3>{SCENARIO_NAMES[key]}</h3>
                <div className="frame-info">
                  <div className="frame-meta">
                    <span>Version: {result.frame.v}</span>
                    <span>Scenario: {result.frame.sc}</span>
                    <span>Triage: {result.frame.tri}</span>
                    <span>Tokens: {result.frame.tokens}</span>
                  </div>
                </div>

                <div className="frame-content">
                  <h4>Frame Data</h4>
                  <pre className="frame-json">{JSON.stringify(result.frame, null, 2)}</pre>
                </div>

                <div className="frame-content">
                  <h4>Serialized DSL</h4>
                  <pre className="frame-dsl">{serializeFrame(result.frame)}</pre>
                </div>

                {result.frame.alg.length > 0 && (
                  <div className="safety-section">
                    <h4>Allergies (Safety-Critical)</h4>
                    <ul>
                      {result.frame.alg.map((alg, idx) => (
                        <li key={idx}>
                          <strong>{alg.ag}</strong> (Severity: {alg.sev})
                          {alg.rx && alg.rx.length > 0 && (
                            <span> — Contraindicated: {alg.rx.join(", ")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.frame.rx.length > 0 && (
                  <div className="safety-section">
                    <h4>Medications (Safety-Critical)</h4>
                    <ul>
                      {result.frame.rx.map((med, idx) => (
                        <li key={idx}>
                          <strong>{med.name}</strong> ({med.atc}) — {med.dose} {med.freq}
                          {med.ki && med.ki.length > 0 && (
                            <span> — Alerts: {med.ki.join(", ")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          CompText v5 | Deterministic FHIR Compression for Clinical AI |
          {" "}
          <a
            href="https://github.com/akoellnberger/comptext"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
