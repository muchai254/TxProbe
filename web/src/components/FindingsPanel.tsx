import { useState } from 'react'
import type { HeuristicId, HeuristicResult } from '../lib/types'
import { HEURISTICS } from '../lib/heuristics'
import HeuristicRow from './HeuristicRow'
import PrivacyScoreRing from './PrivacyScoreRing'

interface FindingsPanelProps {
  score: number;
  heuristics: Record<HeuristicId, HeuristicResult>;
  detectedCount: number;
}

export default function FindingsPanel({ score, heuristics, detectedCount }: FindingsPanelProps) {
  const [expanded, setExpanded] = useState<HeuristicId | null>(null)

  const severityCounts = HEURISTICS.reduce<{ high: number; medium: number; low: number }>(
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
    severityCounts.high > 0 ? `${severityCounts.high} high` : '',
    severityCounts.medium > 0 ? `${severityCounts.medium} medium` : '',
    severityCounts.low > 0 ? `${severityCounts.low} low` : '',
  ].filter(Boolean).join(' · ')

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
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
            {score} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>/ 100</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {detectedCount === 0
              ? 'No privacy issues detected'
              : `${detectedCount} issue${detectedCount !== 1 ? 's' : ''} detected${severityLabel ? ` · ${severityLabel}` : ''}`
            }
          </div>
        </div>
      </div>

      {HEURISTICS.map(h => (
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
