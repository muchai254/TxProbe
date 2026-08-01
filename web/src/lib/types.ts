export type HeuristicId =
  | 'cioh'
  | 'change_detection'
  | 'address_reuse'
  | 'coinjoin'
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

export type AppMode = 'transaction' | 'address'
export type NavSource = 'landing' | 'address'
