import type { HeuristicId } from './types';

export interface HeuristicMeta {
  id: HeuristicId;
  chip: string;
  name: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  detected: string;
  observerLearns: string;
  nextTime: string;
}

export const HEURISTICS: HeuristicMeta[] = [
  {
    id: 'cioh',
    chip: 'CIOH',
    name: 'Common Input Ownership',
    severity: 'high',
    detected: 'This transaction has multiple inputs, which are assumed by chain analysts to belong to the same wallet.',
    observerLearns: 'A chain analyst links all input addresses together under one entity, expanding the known address cluster for your wallet.',
    nextTime: 'Use CoinJoin or PayJoin (pay-to-endpoint) to break input linkage. Avoid consolidating UTXOs unnecessarily.',
  },
  {
    id: 'change_detection',
    chip: 'CHNG',
    name: 'Change Detection',
    severity: 'medium',
    detected: 'A change output was identified with high confidence based on script type, value, and position signals.',
    observerLearns: 'The observer can identify which output is change (returning to you) vs. payment (going to the recipient), narrowing your wallet balance estimate.',
    nextTime: 'Use a change output that matches a different script type than your inputs, or use a round payment amount to reduce signal clarity.',
  },
  {
    id: 'address_reuse',
    chip: 'REUSE',
    name: 'Address Reuse',
    severity: 'high',
    detected: 'An address appears in both the inputs and outputs, or is seen in multiple transactions.',
    observerLearns: 'Address reuse directly links transactions, collapsing privacy across time. Any observer can follow the chain.',
    nextTime: 'Use a fresh address for every transaction. Most modern wallets do this automatically for receive addresses.',
  },
  {
    id: 'coinjoin',
    chip: 'JOIN',
    name: 'CoinJoin Detection',
    severity: 'info',
    detected: 'This transaction has equal-value outputs consistent with a CoinJoin mixing protocol.',
    observerLearns: 'The observer knows mixing occurred, but cannot reliably link specific inputs to outputs.',
    nextTime: 'Continue using CoinJoin. Consider using Whirlpool, JoinMarket, or Wasabi for coordinated mixing.',
  },
  {
    id: 'consolidation',
    chip: 'CONS',
    name: 'Consolidation',
    severity: 'medium',
    detected: 'Multiple inputs were merged into one or two outputs, a pattern consistent with UTXO consolidation.',
    observerLearns: 'The observer confirms these inputs belong to the same wallet and can now trace the consolidated UTXO.',
    nextTime: 'Consolidate during CoinJoin rounds rather than as a standalone transaction to preserve plausible deniability.',
  },
  {
    id: 'self_transfer',
    chip: 'SELF',
    name: 'Self-Transfer',
    severity: 'low',
    detected: 'This transaction has a single input and single output, consistent with a self-transfer.',
    observerLearns: 'The observer infers no external payment occurred, and both input and output belong to the same wallet.',
    nextTime: 'Batch self-transfers with payments to reduce the transaction footprint and obscure the self-transfer pattern.',
  },
  {
    id: 'peeling_chain',
    chip: 'PEEL',
    name: 'Peeling Chain',
    severity: 'medium',
    detected: 'One output is much larger than the other, consistent with a peeling chain where large UTXOs are gradually spent.',
    observerLearns: 'The observer can follow the large change output through subsequent transactions, tracing a payment chain.',
    nextTime: "Use PayJoin to mix your UTXO chain with the recipient's. Avoid sending transactions where one output is 10x+ larger than the other.",
  },
  {
    id: 'op_return',
    chip: 'OPRT',
    name: 'OP_RETURN Data',
    severity: 'info',
    detected: 'An OP_RETURN output was found, embedding data in the transaction (Runes, Ordinals, or other protocol).',
    observerLearns: 'The observer sees the embedded protocol data and can identify the sender as a participant in that protocol.',
    nextTime: 'OP_RETURN data is publicly readable. Avoid embedding identifying information in on-chain data.',
  },
  {
    id: 'round_number_payment',
    chip: 'RNPMT',
    name: 'Round Number Payment',
    severity: 'low',
    detected: 'One or more outputs are round-number values (e.g. 0.01 BTC, 0.1 BTC), indicating a likely payment amount.',
    observerLearns: 'Round-number outputs are almost certainly payments rather than change, confirming which output went to the recipient.',
    nextTime: 'Paying in sats (non-round amounts) rather than BTC reduces this signal. Adjust payment amounts slightly.',
  },
  {
    id: 'locktime_analysis',
    chip: 'LOCK',
    name: 'Locktime / RBF Analysis',
    severity: 'low',
    detected: 'The locktime or sequence values reveal wallet software characteristics (anti-fee-sniping, RBF signaling).',
    observerLearns: 'The observer can identify which wallet software you use, narrowing your identity by wallet fingerprint.',
    nextTime: 'This is a minor signal. Most privacy tools do not address locktime fingerprinting.',
  },
  {
    id: 'inscription',
    chip: 'INSC',
    name: 'Inscription / Ordinal',
    severity: 'info',
    detected: 'This transaction contains an Ordinals inscription or BRC-20 token operation in the witness data.',
    observerLearns: 'The observer can identify you as an Ordinals participant and may be able to trace token ownership history.',
    nextTime: 'Ordinal inscriptions are fully public. Consider the privacy implications before inscribing sensitive content.',
  },
  {
    id: 'unnecessary_input',
    chip: 'UNIN',
    name: 'Unnecessary Inputs',
    severity: 'medium',
    detected: 'One or more inputs could be removed without underfunding the transaction, indicating sub-optimal coin selection.',
    observerLearns: 'The observer infers you had excess UTXOs and can model your wallet balance more accurately.',
    nextTime: 'Use a coin selection algorithm that minimizes UTXO consolidation. Avoid adding inputs that exceed the payment amount by a large margin.',
  },
  {
    id: 'script_type_upgrade',
    chip: 'SCUP',
    name: 'Script Type Upgrade',
    severity: 'low',
    detected: 'Legacy inputs (P2PKH/P2SH) are being spent to native SegWit or Taproot outputs, revealing wallet migration.',
    observerLearns: 'The observer sees you are upgrading wallet types, which can distinguish you from users who stay on older script types.',
    nextTime: 'Upgrade all addresses at once rather than gradually, to reduce the duration of the mixed-type fingerprint.',
  },
  {
    id: 'batch_payment',
    chip: 'BATP',
    name: 'Batch Payment',
    severity: 'info',
    detected: 'This transaction has 3 or more spendable outputs, consistent with a batch payment to multiple recipients.',
    observerLearns: 'The observer can see all recipient addresses and payment amounts in a single transaction.',
    nextTime: 'Batch payments are efficient but expose all recipient relationships at once. Consider using PayJoin for high-privacy payments.',
  },
];

export function getHeuristic(id: HeuristicId): HeuristicMeta {
  return HEURISTICS.find(h => h.id === id) ?? {
    id,
    chip: id.slice(0, 5).toUpperCase(),
    name: id,
    severity: 'info',
    detected: '',
    observerLearns: '',
    nextTime: '',
  };
}
