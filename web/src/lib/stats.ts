import type { TxSummary, AddressStats } from './types'

export function computeStats(
  transactions: TxSummary[],
  analyzedCount: number,
): AddressStats {
  const analyzed = transactions.filter(
    (t) => t.privacy_score > 0 || t.detected_heuristics.length > 0,
  )
  const scores = analyzed.map((t) => t.privacy_score).filter((s) => s > 0)
  const overall =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 50

  const heuristic_counts: Record<string, number> = {}
  for (const tx of analyzed) {
    for (const h of tx.detected_heuristics) {
      heuristic_counts[h] = (heuristic_counts[h] ?? 0) + 1
    }
  }

  let most_frequent_heuristic = ''
  let maxCount = 0
  for (const [h, count] of Object.entries(heuristic_counts)) {
    if (count > maxCount) {
      most_frequent_heuristic = h
      maxCount = count
    }
  }

  // Sort a copy — `analyzed` is derived from component state and callers don't expect
  // computeStats to reorder it out from under them.
  const worst = [...analyzed].sort(
    (a, b) => a.privacy_score - b.privacy_score,
  )[0]
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
