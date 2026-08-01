import { useEffect, useState } from 'react'
import { HEURISTIC_IDS } from '../lib/heuristics'

interface TxLoadingProps {
  phase: 'fetching' | 'analyzing';
}

export function TxLoadingState({ phase }: TxLoadingProps) {
  const [checkedCount, setCheckedCount] = useState(0)

  useEffect(() => {
    if (phase !== 'analyzing') { setCheckedCount(0); return }
    let i = 0
    const iv = setInterval(() => {
      i++
      setCheckedCount(i)
      if (i >= HEURISTIC_IDS.length) clearInterval(iv)
    }, 80)
    return () => clearInterval(iv)
  }, [phase])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-muted)',
      padding: 'var(--space-8)',
    }}>
      {phase === 'fetching' && (
        <p style={{ margin: 0, color: 'var(--color-text)' }}>Fetching transaction from mainnet...</p>
      )}
      {phase === 'analyzing' && (
        <>
          <p style={{ margin: 0, color: 'var(--color-text)' }}>Running heuristics...</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {HEURISTIC_IDS.map((id, idx) => (
              <div key={id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span style={{
                  color: idx < checkedCount ? 'var(--color-signal)' : 'var(--color-text-muted)',
                  fontWeight: idx < checkedCount ? 600 : 400,
                }}>
                  {idx < checkedCount ? '[!]' : '[ ]'}
                </span>
                <span style={{ color: idx < checkedCount ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {id}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface WalletLoadingProps {
  phase: 'fetching' | 'analyzing';
  fetchProgress?: { done: number; total: number };
  analysisProgress?: { done: number; total: number };
}

export function WalletLoadingState({ phase, fetchProgress, analysisProgress }: WalletLoadingProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 'var(--space-4)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      padding: 'var(--space-8)',
    }}>
      {phase === 'fetching' && fetchProgress && (
        <>
          <p style={{ margin: 0, color: 'var(--color-text)' }}>Fetching transaction history...</p>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            {fetchProgress.done} / {fetchProgress.total} transactions
          </p>
        </>
      )}
      {phase === 'analyzing' && analysisProgress && (
        <>
          <p style={{ margin: 0, color: 'var(--color-text)' }}>Analyzing privacy...</p>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            {analysisProgress.done} / {analysisProgress.total} complete
          </p>
        </>
      )}
    </div>
  )
}
