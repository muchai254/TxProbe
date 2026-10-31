import type { HeuristicId } from '../../lib/types'

export interface HeuristicExplainer {
  plain: string
  scoreEffect: string
  avoid: string
}

// Plain-language copy for the /how-it-works page. Display names come from
// HEURISTICS in lib/heuristics.ts. Score effects must match
// compute_privacy_score in src/heuristics/classification.rs.
export const HEURISTIC_EXPLAINERS: Record<HeuristicId, HeuristicExplainer> = {
  cioh: {
    plain:
      'When a payment uses more than one coin from your wallet at the same time, anyone watching assumes all those coins belong to the same person. It is like paying at a shop with three gift cards: the cashier knows all three are yours.',
    scoreEffect:
      'Lowers your score by 20 points. This does not apply to CoinJoin transactions, where many people deliberately combine coins.',
    avoid:
      'Try to pay with a single coin that is big enough for the payment. Avoid combining many small coins at once unless you have to.',
  },
  change_detection: {
    plain:
      'Bitcoin works like cash: if you pay 30 with a 50 note, you get 20 back as "change", which goes to a new address that you own. Observers try to work out which output is the payment and which is your change. Once they know, they can follow your leftover money.',
    scoreEffect:
      'Lowers your score by 15 points if the change is very easy to spot, 8 points if it is fairly easy, and 3 points if it is only a weak guess.',
    avoid:
      'Use a wallet that makes your change look like the payment, for example by using the same address type as the person you are paying.',
  },
  address_reuse: {
    plain:
      'A Bitcoin address is like an account number. If the same address appears more than once in a transaction, for example sending money back to an address it was just spent from, every observer can see that those coins have the same owner.',
    scoreEffect:
      'Lowers your score by 30 points. This is the largest single deduction, because it is the clearest link of all.',
    avoid:
      'Use a fresh address for every payment you receive. Most modern wallets do this for you if you press "receive" each time.',
  },
  coinjoin: {
    plain:
      'A CoinJoin is a transaction where many people pool their coins and each receive back the same amounts. Because the outputs all look identical, an observer cannot tell whose coin went where. This one is good news.',
    scoreEffect:
      'Raises your score by 40 points. It also cancels the "multiple coins combined" and "output order" deductions, since those are expected in a CoinJoin.',
    avoid:
      'Nothing to avoid. If privacy matters to you, wallets with built-in CoinJoin support (such as Wasabi or JoinMarket) can do this for you.',
  },
  consolidation: {
    plain:
      'Three or more coins are merged into just one or two. People do this to tidy up a wallet, but it tells observers that all those coins belong to one person.',
    scoreEffect:
      'No direct change to your score. The combining of coins is already counted by "Common Input Ownership".',
    avoid:
      'If you need to tidy up, do it in smaller batches, and preferably through a CoinJoin rather than on your own.',
  },
  self_transfer: {
    plain:
      'One coin goes in and one coin comes out, with no change. This usually means someone is moving money between their own wallets, so observers can guess the sender and the receiver are the same person.',
    scoreEffect: 'No direct change to your score. It is shown as a finding.',
    avoid:
      'This is often unavoidable. Just know that moving funds this way links your old and new wallet.',
  },
  peeling_chain: {
    plain:
      'A large coin pays a small amount, and the big remainder goes on to pay the next small amount, and so on, like peeling layers off an onion. Observers can follow the large remainder from one payment to the next.',
    scoreEffect: 'No direct change to your score. It is shown as a finding.',
    avoid:
      'Avoid spending repeatedly from one large coin. Keep your savings split into several coins, or run them through a CoinJoin first.',
  },
  op_return: {
    plain:
      'The transaction carries a small piece of extra data, often used by token or collectible systems built on Bitcoin. That data shows observers you are using that particular service.',
    scoreEffect: 'No direct change to your score. It is shown as a finding.',
    avoid:
      'Use a separate wallet for token or collectible activity, so it is not linked to your everyday payments.',
  },
  round_number_payment: {
    plain:
      'One output is a neat round amount, like exactly 0.05 BTC. People usually pay round amounts, while change is a messy leftover. So the round number gives away which output is the payment.',
    scoreEffect:
      'No direct change to your score, but it makes your change easier to spot (see "Change Detection").',
    avoid:
      'When you can, send slightly uneven amounts instead of perfectly round ones.',
  },
  locktime_analysis: {
    plain:
      'Every transaction includes a few small technical settings. Different wallet apps fill them in differently, so they act like a fingerprint that can hint at which app you use. One of these settings lets you speed up a stuck payment later (called "replace-by-fee").',
    scoreEffect:
      'Raises your score by 5 points when the speed-up setting is turned on, because most modern wallets use it, so you blend in with the crowd.',
    avoid:
      "Use a popular, up-to-date wallet. The more people share your wallet's fingerprint, the less it says about you.",
  },
  inscription: {
    plain:
      'The transaction contains an inscription: a picture, text or token stored directly on Bitcoin (often called Ordinals or BRC-20). Everything inscribed is public forever and marks you as someone who uses them.',
    scoreEffect: 'No direct change to your score. It is shown as a finding.',
    avoid:
      'Keep inscriptions in a separate wallet from your regular savings, and never inscribe anything personal.',
  },
  unnecessary_input: {
    plain:
      'The payment used more coins than it needed. Imagine paying for a coffee with a 20 note and a 50 note when the 20 alone was enough. Observers learn you had extra coins, and how much was in them.',
    scoreEffect:
      'No direct change to your score, but extra coins are linked together (see "Common Input Ownership").',
    avoid:
      'If your wallet lets you choose which coins to spend (often called "coin control"), pick only what the payment needs.',
  },
  script_type_upgrade: {
    plain:
      'Bitcoin addresses come in older and newer styles. Here, old-style addresses pay to new-style ones, which suggests a wallet in the middle of upgrading. That makes you stand out from people who already finished.',
    scoreEffect: 'No direct change to your score. It is shown as a finding.',
    avoid:
      'When you upgrade to a new wallet, move everything over in one go rather than bit by bit.',
  },
  batch_payment: {
    plain:
      'One transaction pays three or more people at once. This is common for exchanges and businesses. It saves fees, but shows everyone who got paid, and how much, in one place.',
    scoreEffect: 'No direct change to your score. It is shown as a finding.',
    avoid:
      'For private payments, pay people in separate transactions rather than all together.',
  },
}

export interface ScoreRow {
  signal: string
  points: string
}

export const SCORE_PENALTIES: ScoreRow[] = [
  { signal: 'The same address appears more than once', points: '−30' },
  {
    signal: 'Several of your coins are combined (not a CoinJoin)',
    points: '−20',
  },
  {
    signal: 'Your change is easy to spot (very / fairly / slightly)',
    points: '−15 / −8 / −3',
  },
  { signal: 'The coins spent use a mix of address styles', points: '−10' },
  {
    signal: 'Outputs are not in the standard sorted order (not a CoinJoin)',
    points: '−5',
  },
]

export const SCORE_BONUSES: ScoreRow[] = [
  { signal: 'The transaction is a CoinJoin', points: '+40' },
  { signal: 'The "speed up later" setting is turned on', points: '+5' },
]

export interface ScoreBand {
  range: string
  label: string
  meaning: string
}

export const SCORE_BANDS: ScoreBand[] = [
  {
    range: '90–100',
    label: 'Private',
    meaning: 'An observer learns very little.',
  },
  {
    range: '75–89',
    label: 'Guarded',
    meaning: 'A few small clues, nothing serious.',
  },
  {
    range: '55–74',
    label: 'Traceable',
    meaning: 'An observer can follow some of your money.',
  },
  {
    range: '35–54',
    label: 'Exposed',
    meaning: 'Clear links between your coins are visible.',
  },
  {
    range: '0–34',
    label: 'Transparent',
    meaning: 'An observer can piece together a lot about you.',
  },
]
