import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, useState, useLayoutEffect } from 'react'
import type { HeuristicId, HeuristicResult } from '../lib/types'
import { getHeuristic } from '../lib/heuristics'

interface HeuristicRowProps {
  id: HeuristicId;
  result: HeuristicResult;
  expanded: boolean;
  onToggle: () => void;
}

const SEVERITY_COLORS: Record<string, { text: string; bg: string }> = {
  high: { text: 'var(--color-signal)', bg: 'var(--color-signal-low)' },
  medium: { text: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  low: { text: 'var(--color-text-muted)', bg: 'transparent' },
  info: { text: 'var(--color-text-muted)', bg: 'transparent' },
}

const SEVERITY_LABELS: Record<string, string> = {
  high: 'Serious',
  medium: 'Notable',
  low: 'Minor',
  info: 'Noted',
}

function truncateTeaser(text: string, max = 68): string {
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

export default function HeuristicRow({ id, result, expanded, onToggle }: HeuristicRowProps) {
  const meta = getHeuristic(id)
  const detailRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    if (!detailRef.current) return
    setHeight(expanded ? detailRef.current.scrollHeight : 0)
  }, [expanded])

  const isDetected = result.detected
  const colors = SEVERITY_COLORS[meta.severity] || SEVERITY_COLORS.info

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: isDetected ? 'flex-start' : 'center',
          gap: 'var(--space-3)',
          padding: isDetected ? 'var(--space-3) var(--space-6)' : '0 var(--space-6)',
          minHeight: '48px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Chip */}
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: '3px',
          border: `1px solid ${isDetected ? 'var(--color-signal)' : 'var(--color-border)'}`,
          backgroundColor: isDetected ? 'var(--color-signal-low)' : 'transparent',
          color: isDetected ? 'var(--color-signal)' : 'var(--color-text-muted)',
          flexShrink: 0,
          minWidth: '46px',
          textAlign: 'center',
          marginTop: isDetected ? '1px' : 0,
        }}>
          {meta.chip}
        </span>

        {/* Name + teaser */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 'var(--text-sm)',
            color: isDetected ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontWeight: isDetected ? 500 : 400,
            lineHeight: 1.4,
          }}>
            {meta.name}
          </div>
          {isDetected && (
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginTop: '3px',
              lineHeight: 1.4,
            }}>
              {truncateTeaser(meta.observerLearns)}
            </div>
          )}
        </div>

        {/* Severity badge */}
        {isDetected ? (
          <span style={{
            fontSize: 'var(--text-xs)',
            padding: '2px 8px',
            borderRadius: '3px',
            backgroundColor: colors.bg,
            color: colors.text,
            fontWeight: 600,
            letterSpacing: '0.03em',
            flexShrink: 0,
            marginTop: '1px',
          }}>
            {SEVERITY_LABELS[meta.severity] || meta.severity}
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', flexShrink: 0 }}>—</span>
        )}

        {/* Chevron */}
        {isDetected && (
          <span style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '2px' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      {isDetected && (
        <div
          style={{
            height: `${height}px`,
            overflow: 'hidden',
            transition: 'height 200ms ease-out',
          }}
        >
          <div ref={detailRef}>
            <div style={{
              padding: 'var(--space-4) var(--space-6) var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              backgroundColor: '#FAFAFA',
            }}>
              <Section label="What was detected" text={meta.detected} />
              <Section label="What an observer learns" text={meta.observerLearns} />
              <Section label="Next time" text={meta.nextTime} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  )
}
