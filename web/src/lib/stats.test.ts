import { describe, it, expect } from 'vitest'
import { computeStats } from './stats'
import type { TxSummary } from './types'

function tx(overrides: Partial<TxSummary>): TxSummary {
  return {
    txid: 'tx',
    block_height: 800000,
    privacy_score: 0,
    detected_heuristics: [],
    ...overrides,
  }
}

describe('computeStats', () => {
  it('returns defaults for an empty transaction list', () => {
    const stats = computeStats([], 0)
    expect(stats).toEqual({
      overall_score: 50,
      tx_count: 0,
      analyzed_count: 0,
      worst_tx: '',
      most_frequent_heuristic: '',
      heuristic_counts: {},
    })
  })

  it('excludes transactions with no score and no detected heuristics from aggregation', () => {
    const transactions = [
      tx({ txid: 'a', privacy_score: 80 }),
      tx({ txid: 'b', privacy_score: 0, detected_heuristics: [] }), // never successfully analyzed
    ]
    const stats = computeStats(transactions, 2)
    expect(stats.tx_count).toBe(2)
    expect(stats.overall_score).toBe(80)
  })

  it('averages scores across analyzed transactions and rounds the result', () => {
    const transactions = [
      tx({ txid: 'a', privacy_score: 70 }),
      tx({ txid: 'b', privacy_score: 71 }),
    ]
    const stats = computeStats(transactions, 2)
    expect(stats.overall_score).toBe(71) // 70.5 rounds up
  })

  it('picks the transaction with the lowest privacy score as worst_tx', () => {
    const transactions = [
      tx({ txid: 'high', privacy_score: 90 }),
      tx({ txid: 'low', privacy_score: 20 }),
      tx({ txid: 'mid', privacy_score: 55 }),
    ]
    const stats = computeStats(transactions, 3)
    expect(stats.worst_tx).toBe('low')
  })

  it('does not mutate the input array while finding the worst transaction', () => {
    const transactions = [
      tx({ txid: 'first', privacy_score: 90 }),
      tx({ txid: 'second', privacy_score: 20 }),
    ]
    const original = [...transactions]
    computeStats(transactions, 2)
    expect(transactions).toEqual(original)
  })

  it('counts detected heuristics and picks the most frequent, first-seen on ties', () => {
    const transactions = [
      tx({
        txid: 'a',
        privacy_score: 50,
        detected_heuristics: ['cioh', 'address_reuse'],
      }),
      tx({ txid: 'b', privacy_score: 60, detected_heuristics: ['cioh'] }),
      tx({
        txid: 'c',
        privacy_score: 40,
        detected_heuristics: ['address_reuse'],
      }),
    ]
    const stats = computeStats(transactions, 3)
    expect(stats.heuristic_counts).toEqual({ cioh: 2, address_reuse: 2 })
    // 'cioh' is inserted into heuristic_counts before 'address_reuse', so it wins the tie.
    expect(stats.most_frequent_heuristic).toBe('cioh')
  })

  it('treats analyzed_count as the caller-supplied progress figure, independent of tx_count', () => {
    const transactions = [tx({ txid: 'a', privacy_score: 50 })]
    const stats = computeStats(transactions, 20)
    expect(stats.analyzed_count).toBe(20)
    expect(stats.tx_count).toBe(1)
  })
})
