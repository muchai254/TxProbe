export type HeuristicId =
  | 'cioh'
  | 'change_detection'
  | 'address_reuse'
  | 'coinjoin'
  | 'coinjoin_undone'
  | 'consolidation'
  | 'self_transfer'
  | 'peeling_chain'
  | 'op_return'
  | 'round_number_payment'
  | 'locktime_analysis'
  | 'inscription'
  | 'unnecessary_input'
  | 'script_type_upgrade'
  | 'batch_payment'

export interface HeuristicResult {
  detected: boolean
  confidence?: string
  // The per-heuristic payload fields the UI reads: the change output (TxGraph) and
  // the graph-context evidence shown in HeuristicRow. The other heuristics' extra
  // fields go unread, so a full discriminated union over all of them isn't worth
  // it — see the index signature below.
  likely_change_index?: number
  confirmation?: 'confirmed' | 'contradicted' | 'unspent' | 'inconclusive'
  scope?: 'transaction' | 'history' | 'none'
  reused_addresses?: string[]
  kind?: string
  [key: string]: unknown
}

export interface TxInput {
  index: number
  script_type: string
  value_sats: number
  address: string
}

export interface TxOutput {
  index: number
  script_type: string
  value_sats: number
  address: string | null
}

export interface TxAnalysis {
  txid: string
  version: number
  locktime: number
  is_segwit: boolean
  rbf_signaling: boolean
  weight: number
  vbytes: number
  fee_sats: number
  fee_rate_sat_vb: number
  input_count: number
  output_count: number
  inputs: TxInput[]
  outputs: TxOutput[]
  heuristics: Record<HeuristicId, HeuristicResult>
  classification: string
  privacy_score: number
  // How much of the one-hop transaction graph the server fetched.
  context_summary?: {
    parents: number
    children: number
    addresses: number
    truncated: boolean
  }
}

export interface TxAnalysisResponse {
  ok: boolean
  txid: string
  mempool: {
    confirmed: boolean
    block_height: number | null
    fee: number
  }
  analysis: TxAnalysis
  error?: string
}

export interface TxSummary {
  txid: string
  block_height: number
  privacy_score: number
  detected_heuristics: HeuristicId[]
}

export interface AddressStats {
  overall_score: number
  tx_count: number
  analyzed_count: number
  worst_tx: string
  most_frequent_heuristic: string
  heuristic_counts: Record<string, number>
}

export type AppMode = 'transaction' | 'address' | 'wallet'
export type NavSource = 'landing' | 'address'
