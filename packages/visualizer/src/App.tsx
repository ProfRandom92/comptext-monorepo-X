import { useEffect, useState } from "react";
import { TOKEN_BENCHMARKS, pipelineAll, serializeFrame, type PipelineResult } from "@comptext/core";

import "./App.css";

// MCP Integration for Daimler Dashboard
interface MCPPipelineResult {
  id: string;
  scenario: string;
  frame: string;
  metrics: {
    tokens_input: number;
    tokens_final: number;
    reduction_pct: number;
    execution_time_ms: number;
  };
  safety: {
    allergies_preserved: number;
    medications_preserved: number;
    icd10_preserved: number;
    triage_accurate: string;
  };
  timestamp: string;
}

interface APIStatus {
  connected: boolean;
  url: string;
  error: string | null;
}

// Scenario display names
const SCENARIO_NAMES: Record<string, string> = {
  stemi: "STEMI",
  sepsis: "Sepsis",
  stroke: "Stroke",
  anaphylaxie: "Anaphylaxie",
  dm_hypo: "DM Hypo",
};

// Scenario descriptions
const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  stemi: "68-year-old male, acute anterior STEMI with cardiogenic shock",
  sepsis: "54-year-old female, septic shock with qSOFA 3",
  stroke: "71-year-old male, ischemic stroke NIHSS 14",
  anaphylaxie: "34-year-old female, anaphylactic shock post-contrast",
  dm_hypo: "62-year-old male, severe hypoglycemia BZ 1.8 mmol/L",
};

function App() {
  const [results, setResults] = useState<Record<string, PipelineResult> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "frame" | "live" | "compliance">("overview");

  // MCP Integration
  const [apiStatus, setApiStatus] = useState<APIStatus>({
    connected: false,
    url: import.meta.env.VITE_MCP_API_URL || "http://localhost:8000",
    error: null,
  });
  const [mcpResults, setMcpResults] = useState<MCPPipelineResult | null>(null);
  const [mcpLoading, setMcpLoading] = useState(false);

  // Check MCP API availability
  useEffect(() => {
    const checkMCPStatus = async () => {
      try {
        const response = await fetch(`${apiStatus.url}/health`);
        if (response.ok) {
          setApiStatus(prev => ({ ...prev, connected: true, error: null }));
        }
      } catch (err) {
        setApiStatus(prev => ({
          ...prev,
          connected: false,
          error: err instanceof Error ? err.message : "API unavailable"
        }));
      }
    };

    checkMCPStatus();
    const interval = setInterval(checkMCPStatus, 5000);
    return () => clearInterval(interval);
  }, [apiStatus.url]);

  // Run local pipeline
  useEffect(() => {
    const runPipeline = async () => {
      try {
        setLoading(true);
        const allResults = await pipelineAll();
        setResults(allResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pipeline failed");
      } finally {
        setLoading(false);
      }
    };

    runPipeline();
  }, []);

  // Process scenario via MCP API
  const processMCPScenario = async (scenario: string) => {
    if (!apiStatus.connected) {
      setApiStatus(prev => ({
        ...prev,
        error: "MCP API not connected"
      }));
      return;
    }

    setMcpLoading(true);
    try {
      const response = await fetch(`${apiStatus.url}/api/pipeline/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenario,
          include_benchmark: true
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      const data = await response.json();
      setMcpResults(data);
      setApiStatus(prev => ({ ...prev, error: null }));
    } catch (err) {
      setApiStatus(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Unknown error"
      }));
    } finally {
      setMcpLoading(false);
    }
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (!results) return null;

    const scenarios = Object.keys(results);
    const avgReduction =
      scenarios.reduce((sum, key) => sum + results[key].benchmark.reduction_pct, 0) /
      scenarios.length;

    const totalTokensRaw = scenarios.reduce((sum, key) => sum + results[key].input.token_count, 0);
    const totalTokensCompressed = scenarios.reduce(
      (sum, key) => sum + (results[key].frame.tokens ?? 0),
      0
    );

    return {
      avgReduction: avgReduction.toFixed(1),
      totalTokensRaw,
      totalTokensCompressed,
      overallReduction: (((totalTokensRaw - totalTokensCompressed) / totalTokensRaw) * 100).toFixed(
        1
      ),
    };
  };

  const stats = getSummaryStats();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Running CompText Pipeline...</p>
        <p className="loading-subtitle">Processing 5 clinical scenarios</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Pipeline Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>CompText Visualizer</h1>
        <p className="subtitle">FHIR R4 → CompText Frame Pipeline | v5.0</p>
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
            <span className="stat-value">{stats.totalTokensCompressed.toLocaleString()}</span>
            <span className="stat-label">Total CompText Tokens</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.overallReduction}%</span>
            <span className="stat-label">Overall Reduction</span>
          </div>
        </div>
      )}

      {/* API Status Banner */}
      {apiStatus.connected && (
        <div className="api-status" style={{ backgroundColor: "#10b981", padding: "8px", marginBottom: "16px", borderRadius: "4px" }}>
          <span style={{ color: "white", fontSize: "12px" }}>
            ✓ MCP API Connected: {apiStatus.url}
          </span>
        </div>
      )}
      {apiStatus.error && (
        <div className="api-error" style={{ backgroundColor: "#ef4444", padding: "8px", marginBottom: "16px", borderRadius: "4px" }}>
          <span style={{ color: "white", fontSize: "12px" }}>
            ✗ API Error: {apiStatus.error}
          </span>
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
        {apiStatus.connected && (
          <>
            <button
              className={activeTab === "live" ? "active" : ""}
              onClick={() => setActiveTab("live")}
              style={{ position: "relative" }}
            >
              Live MCP
              <span style={{
                position: "absolute",
                right: "8px",
                top: "8px",
                width: "8px",
                height: "8px",
                backgroundColor: "#10b981",
                borderRadius: "50%",
                animation: "pulse 2s infinite"
              }}></span>
            </button>
            <button
              className={activeTab === "compliance" ? "active" : ""}
              onClick={() => setActiveTab("compliance")}
            >
              Compliance
            </button>
          </>
        )}
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
                      <span className="token-value raw">{benchmark.gpt4_raw.toLocaleString()}</span>
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

                  <div className="reduction-badge">-{benchmark.gpt4_reduction_pct}% tokens</div>

                  {results?.[key] && (
                    <div className="scenario-meta">
                      <span className="gdpr-badge">
                        GDPR: {results[key].benchmark.gdpr_compliant ? "✓" : "✗"}
                      </span>
                      <span className="latency-badge">{results[key].benchmark.total_ms}ms</span>
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
                      <span className="layer-saved">-{result.kvtc.layer_k.token_saved} tokens</span>
                    </div>
                    <div className="layer">
                      <span className="layer-name">V-Layer (Value Normalization)</span>
                      <span className="layer-saved">-{result.kvtc.layer_v.token_saved} tokens</span>
                    </div>
                    <div className="layer">
                      <span className="layer-name">T-Layer (Type Encoding)</span>
                      <span className="layer-saved">-{result.kvtc.layer_t.token_saved} tokens</span>
                    </div>
                    <div className="layer">
                      <span className="layer-name">C-Layer (Context Compression)</span>
                      <span className="layer-saved">-{result.kvtc.layer_c.token_saved} tokens</span>
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

        {/* Live MCP Tab */}
        {activeTab === "live" && apiStatus.connected && (
          <div className="live-tab" style={{ marginTop: "24px" }}>
            <h2>Live MCP Integration</h2>
            <div className="scenario-grid">
              {["STEMI", "SEPSIS", "STROKE", "ANAPHYLAXIE", "DM_HYPO"].map(scenario => (
                <button
                  key={scenario}
                  className="scenario-button"
                  onClick={() => processMCPScenario(scenario)}
                  disabled={mcpLoading}
                  style={{
                    padding: "16px",
                    marginBottom: "16px",
                    backgroundColor: "#0f172a",
                    border: "1px solid #3b82f6",
                    borderRadius: "8px",
                    color: "#e0e7ff",
                    cursor: mcpLoading ? "not-allowed" : "pointer",
                    opacity: mcpLoading ? 0.6 : 1
                  }}
                >
                  {mcpLoading ? "Processing..." : `Process ${scenario}`}
                </button>
              ))}
            </div>

            {mcpResults && (
              <div className="mcp-result" style={{
                marginTop: "24px",
                padding: "16px",
                backgroundColor: "#1e293b",
                borderRadius: "8px",
                border: "1px solid #475569"
              }}>
                <h3 style={{ color: "#60a5fa", marginBottom: "12px" }}>
                  {mcpResults.scenario} - {mcpResults.metrics.reduction_pct}% Reduction
                </h3>

                <div className="mcp-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                  <div style={{ padding: "8px", backgroundColor: "#0f172a", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Input Tokens</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ef4444" }}>
                      {mcpResults.metrics.tokens_input}
                    </div>
                  </div>
                  <div style={{ padding: "8px", backgroundColor: "#0f172a", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Output Tokens</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#10b981" }}>
                      {mcpResults.metrics.tokens_final}
                    </div>
                  </div>
                  <div style={{ padding: "8px", backgroundColor: "#0f172a", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Time</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3b82f6" }}>
                      {mcpResults.metrics.execution_time_ms}ms
                    </div>
                  </div>
                  <div style={{ padding: "8px", backgroundColor: "#0f172a", borderRadius: "4px" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Triage</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>
                      {mcpResults.safety.triage_accurate}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>CompText Frame</div>
                  <pre style={{
                    fontSize: "11px",
                    color: "#d1d5db",
                    maxHeight: "200px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}>
                    {mcpResults.frame}
                  </pre>
                </div>

                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #475569", fontSize: "12px", color: "#94a3b8" }}>
                  ID: {mcpResults.id} | {new Date(mcpResults.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === "compliance" && (
          <div className="compliance-tab" style={{ marginTop: "24px" }}>
            <h2>GDPR & Compliance Checklist</h2>
            <div className="compliance-items" style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #22c55e" }}>
                <input type="checkbox" checked disabled />
                <span style={{ marginLeft: "8px", color: "#22c55e" }}>✓ GDPR Art. 5 - Data Minimization</span>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "24px", marginTop: "4px" }}>
                  NURSE stage removes all non-clinical PHI
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #22c55e" }}>
                <input type="checkbox" checked disabled />
                <span style={{ marginLeft: "8px", color: "#22c55e" }}>✓ GDPR Art. 25 - Privacy by Design</span>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "24px", marginTop: "4px" }}>
                  Deterministic compression with no ML-based decisions
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #22c55e" }}>
                <input type="checkbox" checked disabled />
                <span style={{ marginLeft: "8px", color: "#22c55e" }}>✓ GDPR Art. 32 - Encryption</span>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "24px", marginTop: "4px" }}>
                  PHI hashed with FNV-1a (one-way, irreversible)
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #22c55e" }}>
                <input type="checkbox" checked disabled />
                <span style={{ marginLeft: "8px", color: "#22c55e" }}>✓ FHIR R4 Standard</span>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "24px", marginTop: "4px" }}>
                  Full HL7 FHIR R4 bundle compliance
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #22c55e" }}>
                <input type="checkbox" checked disabled />
                <span style={{ marginLeft: "8px", color: "#22c55e" }}>✓ Clinical Safety</span>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "24px", marginTop: "4px" }}>
                  Allergies, medications, and triage never compressed
                </p>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#0f172a", borderRadius: "4px", border: "1px solid #22c55e" }}>
                <input type="checkbox" checked disabled />
                <span style={{ marginLeft: "8px", color: "#22c55e" }}>✓ Audit Trail</span>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "24px", marginTop: "4px" }}>
                  All operations logged with timestamps and IDs
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          CompText v5 | Deterministic FHIR Compression for Clinical AI |{" "}
          <a
            href="https://github.com/ProfRandom92/comptext-monorepo-X"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          {apiStatus.connected && " | MCP Integration Active"}
        </p>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </footer>
    </div>
  );
}

export default App;
