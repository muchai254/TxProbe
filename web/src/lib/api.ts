import type { TxAnalysisResponse, TxSummary } from './types'

export async function analyzeTx(txid: string): Promise<TxAnalysisResponse> {
  const res = await fetch('/api/analyze-tx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txid }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

export async function fetchSamples(): Promise<{
  txids: string[]
  addresses: string[]
}> {
  const res = await fetch('/api/samples')
  const data = await res.json()
  if (!res.ok || !data.ok)
    throw new Error(data.error || 'Failed to fetch samples')
  return { txids: data.txids, addresses: data.addresses }
}

export type HistoryKind = 'address' | 'wallet'

// Latest transactions for an address or an extended public key (xpub/ypub/zpub),
// as lightweight summaries. privacy_score and detected_heuristics start empty and
// are filled in by AddressAnalysis as batches are analyzed.
export async function fetchHistory(
  kind: HistoryKind,
  id: string,
): Promise<TxSummary[]> {
  const res = await fetch(`/api/${kind}/${encodeURIComponent(id)}`)
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(
      data.error || `Could not fetch transactions (HTTP ${res.status}).`,
    )
  }
  const txs: Array<{ txid: string; block_height: number }> = data.transactions
  return txs.map((tx) => ({
    txid: tx.txid,
    block_height: tx.block_height,
    privacy_score: 0,
    detected_heuristics: [],
  }))
}

// Analyze up to 10 transactions in one request; the server batches every
// upstream lookup across them. Failed txids are omitted from the result.
export async function analyzeTxs(
  txids: string[],
): Promise<Record<string, TxAnalysisResponse>> {
  const res = await fetch('/api/analyze-txs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txids }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  const results: Record<string, TxAnalysisResponse> = data.results
  return Object.fromEntries(Object.entries(results).filter(([, r]) => r.ok))
}
