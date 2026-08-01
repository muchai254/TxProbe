import { useEffect, useReducer } from 'react'
import { analyzeTx } from '../lib/api'
import type { TxAnalysis as TxAnalysisData, HeuristicId, NavSource } from '../lib/types'
import { HEURISTIC_IDS } from '../lib/heuristics'
import Header from './Header'
import TxGraph from './TxGraph'
import FindingsPanel from './FindingsPanel'
import { TxLoadingState } from './LoadingState'

interface Props {
  txid: string;
  source: NavSource;
  onBack: () => void;
}

type State =
  | { status: 'fetching' }
  | { status: 'analyzing' }
  | { status: 'success'; data: TxAnalysisData; blockHeight: number | null }
  | { status: 'error'; message: string };

type Action =
  | { type: 'fetching' }
  | { type: 'analyzing' }
  | { type: 'success'; data: TxAnalysisData; blockHeight: number | null }
  | { type: 'error'; message: string };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case 'fetching': return { status: 'fetching' }
    case 'analyzing': return { status: 'analyzing' }
    case 'success': return { status: 'success', data: action.data, blockHeight: action.blockHeight }
    case 'error': return { status: 'error', message: action.message }
  }
}

export default function TxAnalysis({ txid, source, onBack }: Props) {
  const [state, dispatch] = useReducer(reducer, { status: 'fetching' })

  useEffect(() => {
    let cancelled = false
    dispatch({ type: 'fetching' })
    const t = setTimeout(() => { if (!cancelled) dispatch({ type: 'analyzing' }) }, 600)

    analyzeTx(txid)
      .then(res => {
        clearTimeout(t)
        if (cancelled) return
        dispatch({ type: 'success', data: res.analysis, blockHeight: res.mempool.block_height })
      })
      .catch(err => {
        clearTimeout(t)
        if (cancelled) return
        dispatch({ type: 'error', message: (err as Error).message })
      })

    return () => { cancelled = true; clearTimeout(t) }
  }, [txid])

  const backLabel = source === 'address' ? 'Address' : undefined

  if (state.status === 'error') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <Header onBack={onBack} backLabel={backLabel} contextId={txid} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', margin: 0 }}>
            {state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
              padding: '6px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', color: 'var(--color-text)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const data = state.status === 'success' ? state.data : null
  const detectedHeuristics: HeuristicId[] = data
    ? HEURISTIC_IDS.filter(id => data.heuristics[id]?.detected)
    : []

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <Header
        onBack={onBack}
        backLabel={backLabel}
        contextId={txid}
        showCopy={true}
        showExternal={true}
        externalUrl={`https://mempool.space/tx/${txid}`}
      />

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(state.status === 'fetching' || state.status === 'analyzing') && (
          <TxLoadingState phase={state.status === 'fetching' ? 'fetching' : 'analyzing'} />
        )}
        {data && (
          <TxGraph
            inputs={data.inputs}
            outputs={data.outputs}
            privacyScore={data.privacy_score}
            heuristics={data.heuristics}
            detectedHeuristics={detectedHeuristics}
          />
        )}
      </div>

      {data && (
        <FindingsPanel
          score={data.privacy_score}
          heuristics={data.heuristics}
          detectedCount={detectedHeuristics.length}
        />
      )}
    </div>
  )
}
