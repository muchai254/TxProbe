import { ChevronRight } from 'lucide-react'
import type { TxSummary, HeuristicId } from '../lib/types'
import { getHeuristic, HEURISTIC_IDS } from '../lib/heuristics'
import { truncateId } from '../lib/format'
import { isLowScore } from '../lib/score'

interface TransactionTimelineProps {
  transactions: TxSummary[];
  activeFilter: HeuristicId | null;
  onFilterChange: (id: HeuristicId | null) => void;
  onTxClick: (txid: string) => void;
  visibleCount: number;
  onLoadMore: () => void;
}

export default function TransactionTimeline({
  transactions,
  activeFilter,
  onFilterChange,
  onTxClick,
  visibleCount,
  onLoadMore,
}: TransactionTimelineProps) {
  const visible = transactions.slice(0, visibleCount)
  const hasMore = transactions.length > visibleCount

  const activeChips = HEURISTIC_IDS.filter(id =>
    transactions.some(tx => tx.detected_heuristics.includes(id))
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: 'var(--space-3) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        {activeChips.map(id => (
          <button
            key={id}
            onClick={() => onFilterChange(activeFilter === id ? null : id)}
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '3px',
              border: `1px solid ${activeFilter === id ? 'var(--color-text)' : 'var(--color-border)'}`,
              backgroundColor: activeFilter === id ? 'var(--color-text)' : 'transparent',
              color: activeFilter === id ? 'var(--color-surface)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              transition: 'all var(--duration-fast)',
            }}
          >
            {getHeuristic(id).chip}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr 100px auto',
        gap: 'var(--space-4)',
        padding: '0 var(--space-6)',
        height: '36px',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {['HEIGHT', 'TXID', 'SCORE', 'FLAGS'].map(h => (
          <span key={h} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>
            {h}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visible.map((tx, idx) => {
          const isFiltered = activeFilter !== null && !tx.detected_heuristics.includes(activeFilter)
          const truncId = truncateId(tx.txid)
          const scoreW = Math.round((tx.privacy_score / 100) * 80)
          const isLow = isLowScore(tx.privacy_score)

          return (
            <div
              key={tx.txid}
              onClick={() => onTxClick(tx.txid)}
              className={idx < 30 ? 'fade-in' : ''}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 100px auto',
                gap: 'var(--space-4)',
                padding: '0 var(--space-6)',
                height: '44px',
                alignItems: 'center',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                opacity: isFiltered ? 0.3 : 1,
                transition: 'opacity var(--duration-fast), background-color var(--duration-fast)',
                animationDelay: `${idx * 20}ms`,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F4F3F1' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {tx.block_height > 0 ? tx.block_height.toLocaleString() : '—'}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                {truncId}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="80" height="6" style={{ flexShrink: 0 }}>
                  <rect x="0" y="0" width="80" height="6" rx="3" fill="var(--color-border)" />
                  <rect x="0" y="0" width={scoreW} height="6" rx="3" fill={isLow ? 'var(--color-signal)' : 'var(--color-text)'} />
                </svg>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end' }}>
                {tx.detected_heuristics.slice(0, 3).map(h => (
                  <span key={h} style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    border: '1px solid var(--color-signal)',
                    color: 'var(--color-signal)',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-signal-low)',
                  }}>
                    {getHeuristic(h).chip}
                  </span>
                ))}
                {tx.detected_heuristics.length === 0 && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>—</span>
                )}
                <ChevronRight size={14} color="var(--color-text-muted)" />
              </div>
            </div>
          )
        })}

        {hasMore && (
          <div style={{ padding: 'var(--space-4) var(--space-6)' }}>
            <button
              onClick={onLoadMore}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Load {Math.min(50, transactions.length - visibleCount)} more
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
