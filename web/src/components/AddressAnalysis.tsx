import { useEffect, useState, useRef } from 'react'
import type { HeuristicId, TxSummary, AddressStats } from '../lib/types'
import { fetchAddressTxs, analyzeTx } from '../lib/api'
import Header from './Header'
import AddressSummary from './AddressSummary'
import TransactionTimeline from './TransactionTimeline'
import { WalletLoadingState } from './LoadingState'

interface Props {
  address: string;
  onBack: () => void;
  onTxClick: (txid: string) => void;
}

type State =
  | { status: 'fetching' }
  | { status: 'analyzing'; transactions: TxSummary[]; analyzedCount: number }
  | { status: 'success'; transactions: TxSummary[]; stats: AddressStats }
  | { status: 'error'; message: string };

function computeStats(transactions: TxSummary[], analyzedCount: number): AddressStats {
  const analyzed = transactions.filter(t => t.privacy_score > 0 || t.detected_heuristics.length > 0)
  const scores = analyzed.map(t => t.privacy_score).filter(s => s > 0)
  const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50

  const heuristic_counts: Record<string, number> = {}
  for (const tx of analyzed) {
    for (const h of tx.detected_heuristics) {
      heuristic_counts[h] = (heuristic_counts[h] ?? 0) + 1
    }
  }

  let most_frequent_heuristic = ''
  let maxCount = 0
  for (const [h, count] of Object.entries(heuristic_counts)) {
    if (count > maxCount) { most_frequent_heuristic = h; maxCount = count }
  }

  const worst = analyzed.sort((a, b) => a.privacy_score - b.privacy_score)[0]
  const worst_tx = worst?.txid ?? ''

  return {
    overall_score: overall,
    tx_count: transactions.length,
    analyzed_count: analyzedCount,
    worst_tx,
    most_frequent_heuristic,
    heuristic_counts,
  }
}

export default function AddressAnalysis({ address, onBack, onTxClick }: Props) {
  const [state, setState] = useState<State>({ status: 'fetching' })
  const [activeFilter, setActiveFilter] = useState<HeuristicId | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)
  const abortRef = useRef(false)

  useEffect(() => {
    abortRef.current = false
    setState({ status: 'fetching' })

    async function run() {
      let txSummaries: TxSummary[]
      try {
        txSummaries = await fetchAddressTxs(address)
      } catch (err) {
        if (!abortRef.current) {
          setState({ status: 'error', message: (err as Error).message || 'Failed to fetch transactions.' })
        }
        return
      }

      if (txSummaries.length === 0) {
        const stats = computeStats([], 0)
        if (!abortRef.current) setState({ status: 'success', transactions: [], stats })
        return
      }

      const toAnalyze = txSummaries.slice(0, 20)
      const results: TxSummary[] = [...txSummaries]

      setState({ status: 'analyzing', transactions: results, analyzedCount: 0 })

      for (let i = 0; i < toAnalyze.length; i++) {
        if (abortRef.current) return
        const txid = toAnalyze[i].txid
        try {
          const resp = await analyzeTx(txid)
          const score = resp.analysis?.privacy_score ?? 0
          const detected = Object.entries(resp.analysis?.heuristics ?? {})
            .filter(([, v]) => v.detected)
            .map(([k]) => k as HeuristicId)

          results[i] = { ...results[i], privacy_score: score, detected_heuristics: detected }
        } catch {
          // Keep original placeholder for this tx
        }
        if (!abortRef.current) {
          setState({ status: 'analyzing', transactions: [...results], analyzedCount: i + 1 })
        }
      }

      if (!abortRef.current) {
        const stats = computeStats([...results], toAnalyze.length)
        setState({ status: 'success', transactions: results, stats })
      }
    }

    run()
    return () => { abortRef.current = true }
  }, [address])

  if (state.status === 'fetching') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <Header onBack={onBack} contextId={address} backLabel="Back" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletLoadingState phase="fetching" fetchProgress={{ done: 0, total: 1 }} />
        </div>
      </div>
    )
  }

  if (state.status === 'analyzing') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <Header onBack={onBack} contextId={address} backLabel="Back" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletLoadingState
            phase="analyzing"
            analysisProgress={{
              done: state.analyzedCount,
              total: Math.min(state.transactions.length, 20),
            }}
          />
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <Header onBack={onBack} contextId={address} backLabel="Back" />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)', margin: 0, maxWidth: '400px',
            textAlign: 'center', lineHeight: 1.6,
          }}>
            {state.message}
          </p>
          <button
            onClick={onBack}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
              padding: '6px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // success
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <Header onBack={onBack} contextId={address} backLabel="Back" />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AddressSummary
          address={address}
          stats={state.stats}
          onWorstLeakClick={onTxClick}
        />
        <TransactionTimeline
          transactions={state.transactions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onTxClick={onTxClick}
          visibleCount={visibleCount}
          onLoadMore={() => setVisibleCount(c => c + 50)}
        />
      </div>
    </div>
  )
}
