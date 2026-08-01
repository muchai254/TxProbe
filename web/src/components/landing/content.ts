export const FAQ_ITEMS = [
  {
    q: 'What is a privacy score?',
    a: 'A 0–100 score measuring how much an observer can learn from a Bitcoin transaction or address history. 100 means an observer learns nothing useful. 0 means your full transaction graph is visible. Most real-world transactions score between 40 and 90.',
  },
  {
    q: 'Is it safe to enter my transaction ID or Bitcoin address?',
    a: 'Yes. Transaction IDs and Bitcoin addresses are already public on the blockchain — anyone can look them up. TxProbe does not ask for private keys, seed phrases, or any sensitive information. Nothing you enter here is stored.',
  },
  {
    q: 'What is a chain analysis heuristic?',
    a: 'A heuristic is a pattern that blockchain analysts use to make inferences about who controls which coins. TxProbe applies the same 14 techniques used by professional analytics firms, so you can see exactly what they see.',
  },
  {
    q: 'Why does address reuse damage my privacy?',
    a: 'Every time you reuse a Bitcoin address, you link two or more transactions together. Over time this collapses your privacy across your entire history — anyone watching the blockchain can connect the dots. Use a fresh address for every payment.',
  },
  {
    q: "What's the difference between analyzing a transaction and an address?",
    a: 'A transaction analysis examines a single event: what was sent, to whom, and what patterns are visible. An address analysis reviews your full transaction history, showing how privacy issues compound over time and which transaction was your worst privacy leak.',
  },
  {
    q: 'How can I improve my Bitcoin privacy?',
    a: 'Use a fresh receive address for every transaction. Avoid consolidating many small UTXOs in a single transaction. Consider CoinJoin protocols (Whirlpool, JoinMarket) for high-value amounts. Use the Lightning Network for small everyday payments. Avoid round-number payment amounts.',
  },
  {
    q: 'Does TxProbe store my data or track me?',
    a: 'No. Transaction IDs and addresses are public blockchain data — TxProbe fetches them from the public Bitcoin network the same way any block explorer does. Analysis results are cached briefly for performance and discarded. No user accounts, no logs, no tracking.',
  },
]

export const TYPING_SENTENCES = [
  'Every Bitcoin transaction leaves clues.',
  'Inputs reveal patterns.',
  'Outputs reveal behaviour.',
  'Change reveals identity.',
  'Patterns reveal privacy leaks.',
  'Investigate your Bitcoin footprint.',
]

export const TYPING_COLORS = [
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text)',
]
