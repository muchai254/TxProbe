import { useState } from 'react'
import type { HeuristicId, HeuristicResult } from '../lib/types'
import { HEURISTIC_LIST } from '../lib/heuristics'
import HeuristicRow from './HeuristicRow'
import PrivacyScoreRing, { getScoreLabel } from './PrivacyScoreRing'

interface FindingsPanelProps {
  score: number;
  heuristics: Record<HeuristicId, HeuristicResult>;
  detectedCount: number;
}

export default function FindingsPanel({ score, heuristics, detectedCount }: FindingsPanelProps) {
  const [expanded, setExpanded] = useState<HeuristicId | null>(null)

  const severityCounts = HEURISTIC_LIST.reduce<{ high: number; medium: number; low: number }>(
    (acc, h) => {
      const r = heuristics[h.id]
      if (r?.detected) {
        const sev = h.severity as 'high' | 'medium' | 'low' | 'info'
        if (sev === 'high' || sev === 'medium' || sev === 'low') acc[sev]++
      }
      return acc
    },
    { high: 0, medium: 0, low: 0 }
  )

  const severityLabel = [
    severityCounts.high > 0 ? `${severityCounts.high} serious` : '',
    severityCounts.medium > 0 ? `${severityCounts.medium} notable` : '',
    severityCounts.low > 0 ? `${severityCounts.low} minor` : '',
  ].filter(Boolean).join(' · ')

  const isClean = score >= 80

  return (
    <div
      className="slide-up"
      style={{
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'auto',
        flexShrink: 0,
        height: '320px',
      }}
    >
      {/* Score summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '0 var(--space-6)',
        height: '72px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <PrivacyScoreRing score={score} size={48} animate={true} />
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
            Privacy Score
          </div>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
            {score}
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> / 100</span>
            <span style={{ fontSize: 'var(--text-xs)', color: isClean ? 'var(--color-text-muted)' : 'var(--color-signal)', fontWeight: 400 }}>
              {' '}· {getScoreLabel(score)}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {detectedCount === 0
              ? 'No privacy issues detected'
              : `${detectedCount} issue${detectedCount !== 1 ? 's' : ''} detected${severityLabel ? ` · ${severityLabel}` : ''}`
            }
          </div>
        </div>
      </div>

      {/* Severity legend */}
      <div style={{
        padding: 'var(--space-2) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
      }}>
        Severity reflects how much an observer learns from each flagged pattern.
      </div>

      {HEURISTIC_LIST.map(h => (
        <HeuristicRow
          key={h.id}
          id={h.id}
          result={heuristics[h.id] ?? { detected: false }}
          expanded={expanded === h.id}
          onToggle={() => setExpanded(expanded === h.id ? null : h.id)}
        />
      ))}
    </div>
  )
}
