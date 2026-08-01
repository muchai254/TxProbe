import { useEffect, useState, useRef } from 'react'
import type { HeuristicId, TxSummary, AddressStats } from '../lib/types'
import { fetchAddressTxs, analyzeTx } from '../lib/api'
import { computeStats } from '../lib/stats'
import Header from './Header'
import AddressSummary from './AddressSummary'
import TransactionTimeline from './TransactionTimeline'
import { WalletLoadingState } from './LoadingState'
import PageShell from './ui/PageShell'
import SecondaryButton from './ui/SecondaryButton'

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

  const header = <Header onBack={onBack} contextId={address} backLabel="Back" />

  if (state.status === 'fetching') {
    return (
      <PageShell header={header}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletLoadingState phase="fetching" fetchProgress={{ done: 0, total: 1 }} />
        </div>
      </PageShell>
    )
  }

  if (state.status === 'analyzing') {
    return (
      <PageShell header={header}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletLoadingState
            phase="analyzing"
            analysisProgress={{
              done: state.analyzedCount,
              total: Math.min(state.transactions.length, 20),
            }}
          />
        </div>
      </PageShell>
    )
  }

  if (state.status === 'error') {
    return (
      <PageShell header={header}>
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
    </PageShell>
  )
}
