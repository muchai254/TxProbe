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

// Fetch tx history for a Bitcoin address directly from blockstream.info (CORS-enabled).
// Returns lightweight summaries; privacy_score and detected_heuristics are initially empty
// and are populated lazily by AddressAnalysis as each tx is analyzed.
// Base URL duplicated from server/upstream.js's BLOCKSTREAM_API — this bypasses the
// server entirely, so the two copies must be kept in sync by hand.
export async function fetchAddressTxs(address: string): Promise<TxSummary[]> {
  const res = await fetch(`https://blockstream.info/api/address/${address}/txs`)
  if (!res.ok) {
    if (res.status === 400) throw new Error('Invalid Bitcoin address.')
    throw new Error(`Could not fetch transactions (HTTP ${res.status}).`)
  }
  const txs: Array<{ txid: string; status?: { block_height?: number } }> =
    await res.json()
  return txs.map((tx) => ({
    txid: tx.txid,
    block_height: tx.status?.block_height ?? 0,
    privacy_score: 0,
    detected_heuristics: [],
  }))
}
