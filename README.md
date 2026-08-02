<div align="center">

<img src="docs/logo.svg" alt="TxProbe" width="88" height="88">

# TxProbe

**See your Bitcoin transactions the way a chain analyst does.**

![Rust](https://img.shields.io/badge/Rust-2021-CE422B?style=flat-square&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-303030?style=flat-square&logo=express&logoColor=white)

</div>

TxProbe is a Bitcoin transaction and address privacy analyzer. Give it a
transaction ID or a Bitcoin address and it runs the same chain-analysis
techniques that surveillance firms and blockchain forensics tools use. These include link
clustering, change-output detection, address reuse, coin mixing detection,
and more. It then reports back a 0 – 100 privacy score along with an
explanation of exactly what an outside observer could learn from that
transaction.

> [!IMPORTANT]
> TxProbe only ever reads public blockchain data, looked up by transaction ID
> or address. It never asks for, and has no way to use private keys, seed
> phrases, or wallet files.

---

## Why it matters

Bitcoin is pseudonymous, not anonymous. Every transaction is permanently
public, and a well-established set of heuristics lets chain analysts link
addresses together, identify which output in a payment is "change" versus
the actual payment, fingerprint wallet software, and build a picture of a
user's holdings and spending habits over time, all without ever knowing
their name. These techniques are well known to professional analytics firms
and largely invisible to everyday users, who typically have no way to see
their own transactions the way an observer would.

TxProbe closes that gap. It applies the same heuristics to a single
transaction, or across a sample of an address's recent history, and shows
you exactly what's leaking, how confident the detection is, and what an
observer would conclude. Therefore, you can make an informed decision about how you
transact, instead of learning about these patterns only after your privacy
has already been compromised.

---

## Architecture

```mermaid
flowchart LR
    B["Browser<br/>React SPA"]
    S["Express server<br/>/api/*"]
    R["Rust analyzer<br/>txprobe-analyzer"]
    E[("blockstream.info")]

    B -->|"POST /api/analyze-tx"| S
    S -->|"raw tx + prevouts"| E
    S -->|"JSON over stdin/stdout"| R
    B -.->|"address tx list (direct)"| E
```

- **Rust analyzer** (`src/`) — parses a raw transaction and its prevout data
  from stdin, runs the 14 heuristics below, and writes a JSON report to
  stdout. Invoked by the server as a subprocess.
- **Node/Express server** (`server.js`, `server/`) — fetches raw transaction
  data from blockstream.info, pipes it through the analyzer, caches the
  result, and serves the built frontend.
- **React frontend** (`web/`) — paste a txid or address, see the privacy
  score, the detected heuristics, and a visual breakdown of inputs and
  outputs.

Analyzing a single transaction goes through the server. Analyzing an
**address** works a little differently: the browser fetches that address's
transaction list straight from blockstream.info, then submits its 20 most
recent transactions to the server to be scored one at a time.

---

## Privacy heuristics

TxProbe checks every transaction against 14 heuristics. Each one detects a
specific pattern that a chain analyst could use to learn something about the
transaction's owner:

| Heuristic | What it detects |
|---|---|
| **Common Input Ownership (CIOH)** | Multiple inputs in one transaction, which analysts assume belong to the same wallet, linking those addresses together. |
| **Change Detection** | Which output is change returning to the sender versus payment going to the recipient, weighed from script type, value, output ordering, and fee/dust economics. |
| **Address Reuse** | The same output script appearing more than once within a transaction, either across its outputs, or shared between an output and one of the inputs being spent. |
| **CoinJoin Detection** | Three or more inputs paying repeated equal-value outputs above 10,000 sats, consistent with a CoinJoin mixing round. Flagged as a *positive* privacy signal, not a leak. |
| **Consolidation** | Three or more inputs merged into one or two outputs, confirming those inputs share an owner. |
| **Self-Transfer** | A single input to a single output, i.e. a wallet moving funds to itself. |
| **Peeling Chain** | A one- or two-input transaction whose two outputs differ by 10x or more, typical of a large UTXO being spent down gradually. The large remainder can be tracked through later transactions. |
| **OP_RETURN Data** | Embedded protocol data (Runes, Ordinals, etc.), which can tag the sender as a participant in that protocol. |
| **Round Number Payment** | Outputs that are exact multiples of 0.01 BTC, which are almost always payments rather than change, confirming which output is the payment. |
| **Locktime / RBF Analysis** | Locktime and sequence values that fingerprint the wallet software used. |
| **Inscription / Ordinal** | An Ordinals inscription or BRC-20 operation in the witness data. |
| **Unnecessary Inputs** | Inputs that could have been left out without underfunding the payment. A sign of suboptimal coin selection that reveals excess UTXOs. |
| **Script Type Upgrade** | Inputs that are all pre-SegWit (legacy P2PKH/P2SH, including P2SH-wrapped SegWit) paying to native SegWit or Taproot outputs, revealing a wallet mid-migration. |
| **Batch Payment** | Three or more spendable outputs, i.e. paying multiple recipients at once, exposing all of them in a single transaction. |

Each detected heuristic is shown with its confidence, what an observer
learns from it, and a suggestion for reducing the signal next time.

---

## How the privacy score is calculated

Every non-coinbase transaction starts at a baseline score of **100** (fully
private) and is adjusted based on which heuristics fire:

**Penalties**

| Signal | Penalty |
|---|---|
| Common input ownership detected (and it isn't a CoinJoin) | −20 |
| Inputs mix different script types | −10 |
| Address reuse detected | −30 |
| Change output identified, high confidence | −15 |
| Change output identified, medium confidence | −8 |
| Change output identified, low confidence | −3 |
| Outputs aren't BIP69-sorted (and it isn't a CoinJoin) | −5 |

**Bonuses**

| Signal | Bonus |
|---|---|
| CoinJoin detected | +40 |
| RBF (replace-by-fee) signaling | +5 |

The adjusted total is clamped to the 0–100 range. Coinbase transactions (the
block reward, with no real sender to protect) are excluded from scoring
entirely, and are reported with a score of `0`.

The resulting score maps to a label:

| Score | Label |
|---|---|
| 90–100 | Private |
| 75–89 | Guarded |
| 55–74 | Traceable |
| 35–54 | Exposed |
| 0–34 | Transparent |

> [!NOTE]
> Two other thresholds exist alongside those buckets: a score below 50 is
> flagged as low-privacy, and a score of 80 or above is treated as "clean."
> These are intentionally independent of the label boundaries above. They
> highlight different things in different parts of the UI, so don't expect
> the three to line up.
