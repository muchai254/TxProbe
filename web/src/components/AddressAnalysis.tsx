import { useEffect, useState, useRef } from 'react'
import type { HeuristicId, TxSummary, AddressStats } from '../lib/types'
import { fetchHistory, analyzeTxs, type HistoryKind } from '../lib/api'
import { computeStats } from '../lib/stats'
import Header from './Header'
import AddressSummary from './AddressSummary'
import TransactionTimeline from './TransactionTimeline'
import { WalletLoadingState } from './LoadingState'
import PageShell from './ui/PageShell'
import SecondaryButton from './ui/SecondaryButton'

// How many of the latest transactions are scored, and how many go in each
// request (the server's batch limit).
const ANALYZE_COUNT = 20
const BATCH_SIZE = 10

interface Props {
  kind: HistoryKind
  // An address or an extended public key, depending on kind.
  address: string
  onBack: () => void
  onTxClick: (txid: string) => void
}

type State =
  | { status: 'fetching' }
  | { status: 'analyzing'; transactions: TxSummary[]; analyzedCount: number }
  | { status: 'success'; transactions: TxSummary[]; stats: AddressStats }
  | { status: 'error'; message: string }

export default function AddressAnalysis({
  kind,
  address,
  onBack,
  onTxClick,
}: Props) {
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
        txSummaries = await fetchHistory(kind, address)
      } catch (err) {
        if (!abortRef.current) {
          setState({
            status: 'error',
            message: (err as Error).message || 'Failed to fetch transactions.',
          })
        }
        return
      }

      if (txSummaries.length === 0) {
        const stats = computeStats([], 0)
        if (!abortRef.current)
          setState({ status: 'success', transactions: [], stats })
        return
      }

      const toAnalyze = txSummaries.slice(0, ANALYZE_COUNT)
      const results: TxSummary[] = [...txSummaries]

      setState({ status: 'analyzing', transactions: results, analyzedCount: 0 })

      for (let start = 0; start < toAnalyze.length; start += BATCH_SIZE) {
        if (abortRef.current) return
        const batch = toAnalyze.slice(start, start + BATCH_SIZE)
        try {
          const responses = await analyzeTxs(batch.map((t) => t.txid))
          batch.forEach((t, j) => {
            const resp = responses[t.txid]
            if (!resp) return
            const detected = Object.entries(resp.analysis?.heuristics ?? {})
              .filter(([, v]) => v.detected)
              .map(([k]) => k as HeuristicId)
            results[start + j] = {
              ...results[start + j],
              privacy_score: resp.analysis?.privacy_score ?? 0,
              detected_heuristics: detected,
            }
          })
        } catch {
          // Keep original placeholders for this batch
        }
        if (!abortRef.current) {
          setState({
            status: 'analyzing',
            transactions: [...results],
            analyzedCount: start + batch.length,
          })
        }
      }

      if (!abortRef.current) {
        const stats = computeStats([...results], toAnalyze.length)
        setState({ status: 'success', transactions: results, stats })
      }
    }

    run()
    return () => {
      abortRef.current = true
    }
  }, [kind, address])

  const header = <Header onBack={onBack} contextId={address} backLabel="Back" />

  if (state.status === 'fetching') {
    return (
      <PageShell header={header}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WalletLoadingState
            phase="fetching"
            fetchProgress={{ done: 0, total: 1 }}
          />
        </div>
      </PageShell>
    )
  }

  if (state.status === 'analyzing') {
    return (
      <PageShell header={header}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WalletLoadingState
            phase="analyzing"
            analysisProgress={{
              done: state.analyzedCount,
              total: Math.min(state.transactions.length, ANALYZE_COUNT),
            }}
          />
        </div>
      </PageShell>
    )
  }

  if (state.status === 'error') {
    return (
      <PageShell header={header}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-muted)',
              margin: 0,
              maxWidth: '400px',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {state.message}
          </p>
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        </div>
      </PageShell>
    )
  }

  // success
  return (
    <PageShell header={header}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AddressSummary
          kind={kind}
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
          onLoadMore={() => setVisibleCount((c) => c + 50)}
        />
      </div>
    </PageShell>
  )
}
