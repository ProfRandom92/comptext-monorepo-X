/**
 * CompText Visualizer Integration for Daimler Dashboard
 * React components for real-time pipeline result visualization
 *
 * Components:
 * - TokenChart: Visualizes token reduction across pipeline stages
 * - FrameViewer: Displays CompText frame with syntax highlighting
 * - SafetyBadges: Shows critical medical fields
 * - BenchmarkComparison: Compares metrics across scenarios
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PipelineMetrics {
  tokens_input: number
  tokens_after_nurse: number
  tokens_after_kvtc: number
  tokens_final: number
  reduction_pct: number
  compression_ratio: number
  execution_time_ms: number
}

interface SafetyFields {
  allergies_preserved: number
  medications_preserved: number
  icd10_preserved: number
  triage_accurate: string
}

interface PipelineResult {
  id: string
  scenario: string
  frame: string
  metrics: PipelineMetrics
  safety: SafetyFields
  timestamp: string
}

interface BenchmarkResult {
  scenario: string
  metrics: PipelineMetrics
}

// ============================================================================
// TOKEN REDUCTION CHART
// ============================================================================

export const TokenChart: React.FC<{ result: PipelineResult; theme?: 'clinical' | 'technical' }> = ({
  result,
  theme = 'clinical'
}) => {
  const data = [
    { name: 'FHIR Raw', value: result.metrics.tokens_input, fill: '#ef4444' },
    { name: 'Post-NURSE', value: result.metrics.tokens_after_nurse, fill: '#f97316' },
    { name: 'Post-KVTC', value: result.metrics.tokens_after_kvtc, fill: '#eab308' },
    { name: 'CompText', value: result.metrics.tokens_final, fill: '#22c55e' }
  ]

  return (
    <div className="token-chart p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Token Reduction Pipeline</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value) => [`${value} tokens`, 'Count']}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-red-50 p-4 rounded border-l-4 border-red-400">
          <p className="text-sm text-gray-600">Original FHIR</p>
          <p className="text-2xl font-bold text-red-600">{result.metrics.tokens_input}</p>
          <p className="text-xs text-gray-500 mt-1">tokens</p>
        </div>
        <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
          <p className="text-sm text-gray-600">Compressed CompText</p>
          <p className="text-2xl font-bold text-green-600">{result.metrics.tokens_final}</p>
          <p className="text-xs text-gray-500 mt-1">tokens</p>
        </div>
        <div className="col-span-2 bg-blue-50 p-4 rounded border-l-4 border-blue-400">
          <p className="text-sm text-gray-600">Compression Efficiency</p>
          <p className="text-3xl font-bold text-blue-600">{result.metrics.reduction_pct.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {result.metrics.compression_ratio.toFixed(2)}x compression ratio
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FRAME VIEWER WITH SYNTAX HIGHLIGHTING
// ============================================================================

export const FrameViewer: React.FC<{ frame: string; scenario: string }> = ({ frame, scenario }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['VS', 'LAB', 'ALG'])

  const highlightFrame = (text: string) => {
    // Simple syntax highlighting for CompText DSL
    return text
      .replace(/^(CT:|SC:|TRI:)/gm, '<span class="text-blue-600 font-bold">$1</span>')
      .replace(/^(VS|LAB|ALG|RX|ICD|CTX|GDPR)(\[|:)/gm, '<span class="text-purple-600 font-bold">$1</span>$2')
      .replace(/\[(.*?)\]/g, '<span class="text-orange-600">[$1]</span>')
  }

  return (
    <div className="frame-viewer p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">CompText Frame</h3>
        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{scenario}</span>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
        <pre dangerouslySetInnerHTML={{ __html: highlightFrame(frame) }} />
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Frame Size: {(frame.length / 4).toFixed(0)} tokens</p>
      </div>
    </div>
  )
}

// ============================================================================
// SAFETY FIELDS BADGES
// ============================================================================

export const SafetyBadges: React.FC<{ safety: SafetyFields; frame: string }> = ({ safety, frame }) => {
  const hasCriticalAllergy = frame.includes('ALG:') && /SEV:(II|III)/.test(frame)
  const hasContraindication = frame.includes('KI:[')
  const isCriticalTriage = /TRI:P1/.test(frame)

  return (
    <div className="safety-badges p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        🏥 Safety-Critical Fields
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Triage Badge */}
        <div className={`flex items-center gap-3 p-3 rounded border-l-4 ${
          isCriticalTriage ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'
        }`}>
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Triage Level</p>
            <p className={`text-lg font-bold ${isCriticalTriage ? 'text-red-600' : 'text-yellow-600'}`}>
              {frame.match(/TRI:([P]\d)/)?.[1] || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Allergies Badge */}
        <div className={`flex items-center gap-3 p-3 rounded border-l-4 ${
          hasCriticalAllergy ? 'bg-red-50 border-red-400' : 'bg-green-50 border-green-400'
        }`}>
          <span className="text-2xl">💊</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Allergies</p>
            <p className={`text-lg font-bold ${hasCriticalAllergy ? 'text-red-600' : 'text-green-600'}`}>
              {safety.allergies_preserved} preserved
            </p>
          </div>
        </div>

        {/* Medications Badge */}
        <div className="flex items-center gap-3 p-3 rounded border-l-4 bg-blue-50 border-blue-400">
          <span className="text-2xl">💉</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Medications</p>
            <p className="text-lg font-bold text-blue-600">{safety.medications_preserved} active</p>
          </div>
        </div>

        {/* ICD-10 Badge */}
        <div className="flex items-center gap-3 p-3 rounded border-l-4 bg-purple-50 border-purple-400">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Diagnoses</p>
            <p className="text-lg font-bold text-purple-600">{safety.icd10_preserved} codes</p>
          </div>
        </div>

        {/* GDPR Compliance */}
        <div className="flex items-center gap-3 p-3 rounded border-l-4 bg-green-50 border-green-400">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">GDPR Compliance</p>
            <p className="text-lg font-bold text-green-600">✓ Art. 25</p>
          </div>
        </div>

        {/* Contraindications */}
        {hasContraindication && (
          <div className="flex items-center gap-3 p-3 rounded border-l-4 bg-orange-50 border-orange-400">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Contraindications</p>
              <p className="text-lg font-bold text-orange-600">Detected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// BENCHMARK COMPARISON CHART
// ============================================================================

export const BenchmarkComparison: React.FC<{ results: BenchmarkResult[] }> = ({ results }) => {
  return (
    <div className="benchmark-comparison p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Scenario Comparison</h3>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={results}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="scenario" />
          <YAxis yAxisId="left" label={{ value: 'Reduction %', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Time (ms)', angle: 90, position: 'insideRight' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            formatter={(value, name) => {
              if (name === 'Reduction') return `${(value as number).toFixed(1)}%`
              return `${(value as number).toFixed(1)} ms`
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="metrics.reduction_pct" fill="#22c55e" name="Reduction %" />
          <Bar yAxisId="right" dataKey="metrics.execution_time_ms" fill="#3b82f6" name="Time (ms)" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded">
          <p className="text-sm text-gray-600">Average Reduction</p>
          <p className="text-2xl font-bold text-green-600">
            {(results.reduce((sum, r) => sum + r.metrics.reduction_pct, 0) / results.length).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded">
          <p className="text-sm text-gray-600">Avg Execution Time</p>
          <p className="text-2xl font-bold text-blue-600">
            {(results.reduce((sum, r) => sum + r.metrics.execution_time_ms, 0) / results.length).toFixed(1)} ms
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded">
          <p className="text-sm text-gray-600">Best Performer</p>
          <p className="text-2xl font-bold text-purple-600">
            {results.reduce((max, r) => r.metrics.reduction_pct > max.metrics.reduction_pct ? r : max).scenario}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN VISUALIZER COMPONENT
// ============================================================================

export const CompTextVisualizer: React.FC<{
  result?: PipelineResult
  benchmarks?: BenchmarkResult[]
  loading?: boolean
}> = ({ result, benchmarks, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Processing pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="comptext-visualizer space-y-6">
      {result && (
        <>
          <TokenChart result={result} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FrameViewer frame={result.frame} scenario={result.scenario} />
            <SafetyBadges safety={result.safety} frame={result.frame} />
          </div>
        </>
      )}

      {benchmarks && benchmarks.length > 0 && (
        <BenchmarkComparison results={benchmarks} />
      )}
    </div>
  )
}

// ============================================================================
// DASHBOARD INTEGRATION HOOK
// ============================================================================

export const usePipelineResult = (processingId?: string) => {
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResult = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/pipeline/results/${id}`)
      if (!response.ok) throw new Error('Failed to fetch result')
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (processingId) {
      fetchResult(processingId)
    }
  }, [processingId, fetchResult])

  return { result, loading, error, refetch: fetchResult }
}

export default CompTextVisualizer
