import { truncateId } from '../../lib/format'

interface SampleChipsProps {
  loading: boolean;
  samples: string[] | undefined;
  onSampleClick: (sample: string) => void;
}

export default function SampleChips({ loading, samples, onSampleClick }: SampleChipsProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-3)',
      minHeight: '26px',
    }}>
      {(loading || samples) && (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          marginRight: '2px',
        }}>
          Try:
        </span>
      )}
      {loading
        ? [0, 1, 2].map(i => (
            <div key={i} style={{
              width: 112,
              height: 22,
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-border)',
              opacity: 0.5,
            }} />
          ))
        : samples?.map(s => (
            <button
              key={s}
              onClick={() => onSampleClick(s)}
              title={s}
              style={{
                padding: '3px 8px',
                fontSize: 'var(--text-xs)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all var(--duration-fast)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-text)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              {truncateId(s, 8, 6)}
            </button>
          ))
      }
    </div>
  )
}
