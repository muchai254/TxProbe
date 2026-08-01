import PrivacyScoreRing from './PrivacyScoreRing'
import { ArrowUpRight } from 'lucide-react'
import type { AddressStats } from '../lib/types'
import { getHeuristic } from '../lib/heuristics'

interface AddressSummaryProps {
  address: string;
  stats: AddressStats;
  onWorstLeakClick: (txid: string) => void;
}

export default function AddressSummary({ address, stats, onWorstLeakClick }: AddressSummaryProps) {
  const chipLabel = getHeuristic(stats.most_frequent_heuristic).chip
  const worstTxShort = stats.worst_tx
    ? `${stats.worst_tx.slice(0, 8)}...${stats.worst_tx.slice(-6)}`
    : null

  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      borderRight: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      padding: 'var(--space-6)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
    }}>
      {/* Score ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <PrivacyScoreRing score={stats.overall_score} size={80} animate={true} />
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Privacy Score
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            0 = traceable · 100 = opaque
          </div>
        </div>
      </div>

      {/* Address (truncated) */}
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Address
        </div>
        <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', wordBreak: 'break-all', lineHeight: 1.6 }}>
          {address}
        </div>
      </div>

      <StatRow label="Transactions found" value={String(stats.tx_count)} />
      <StatRow label="Analyzed" value={`${stats.analyzed_count} of ${stats.tx_count}`} />

      {worstTxShort && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Worst privacy leak
          </div>
          <button
            onClick={() => onWorstLeakClick(stats.worst_tx)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
              color: 'var(--color-signal)', textDecoration: 'underline',
              padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {worstTxShort}
            <ArrowUpRight size={12} />
          </button>
        </div>
      )}

      {chipLabel && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Most frequent heuristic
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontSize: 'var(--text-xs)', fontWeight: 700,
              padding: '2px 8px', borderRadius: '3px',
              border: '1px solid var(--color-signal)',
              backgroundColor: 'var(--color-signal-low)',
              color: 'var(--color-signal)',
            }}>
              {chipLabel}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {stats.heuristic_counts[stats.most_frequent_heuristic] ?? 0} of {stats.analyzed_count} txs
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
