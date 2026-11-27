import { getTxs, getAddressInfo } from './txStore.js';
import { getRawTx } from './rawTx.js';
import { runAnalyzer } from './analyzer.js';

// Caps on how much neighbourhood one request fetches, shared across all its
// targets. They bound the cost of a request (about 1.9 points per 10 txs and
// 1 + 0.1 per address) no matter how large the transactions involved are.
const MAX_PARENTS = 40;
const MAX_CHILDREN = 40;
const MAX_ADDRESSES = 60;
// Neighbours that haven't arrived by then are treated as unknown; late
// responses still land in the cache for later requests.
const NEIGHBOUR_BUDGET_MS = 8_000;

const isSpendable = o => o.type !== 'nulldata';

// The compact neighbour description the analyzer's TxGraphContext expects.
function toSummary(d) {
  const t = d.transaction;
  return {
    txid: t.hash,
    version: t.version,
    lock_time: t.lock_time,
    is_rbf: Boolean(t.is_rbf),
    input_count: d.inputs.length,
    output_values: d.outputs.filter(isSpendable).map(o => o.value),
    input_addresses: d.inputs.map(i => i.recipient).filter(Boolean),
    input_types: d.inputs.map(i => i.type),
  };
}

function candidates(d) {
  return {
    parents: [...new Set(d.inputs.map(i => i.transaction_hash))],
    children: [...new Set(d.outputs.map(o => o.spending_transaction_hash).filter(Boolean))],
    // Input addresses first: they belong to the sender, whose privacy is being scored.
    addresses: [
      ...new Set([...d.inputs, ...d.outputs.filter(isSpendable)].map(x => x.recipient).filter(Boolean)),
    ],
  };
}

// Take up to `max` items from several lists, one from each in turn, so every
// target gets some coverage before any one target gets a lot.
function roundRobin(lists, max) {
  const picked = new Set();
  for (let i = 0; picked.size < max; i++) {
    let any = false;
    for (const list of lists) {
      if (i < list.length) {
        any = true;
        picked.add(list[i]);
        if (picked.size >= max) break;
      }
    }
    if (!any) break;
  }
  return picked;
}

function buildContext(d, related, addressInfo) {
  const summaryOf = hash => {
    const tx = hash && related.get(hash);
    return tx ? toSummary(tx) : null;
  };
  const addresses = {};
  for (const a of candidates(d).addresses) {
    const info = addressInfo.get(a);
    if (info) addresses[a] = { output_count: info.output_count };
  }
  return {
    tx: toSummary(d),
    inputs: d.inputs.map(i => ({ parent: summaryOf(i.transaction_hash) })),
    outputs: d.outputs.map(o => ({ spent_by: summaryOf(o.spending_transaction_hash) })),
    addresses,
  };
}

async function analyzeOne(txid, d, related, addressInfo, truncated) {
  const raw = await getRawTx(d);
  const prevouts = d.inputs.map(i => ({ value: i.value, scriptpubkey: i.script_hex }));
  const context = buildContext(d, related, addressInfo);
  const result = await runAnalyzer({ raw_tx: raw, prevouts, context });
  if (!result.ok) return { ok: false, error: result.error || 'Analyzer error', status: 422 };

  result.analysis.context_summary = {
    parents: context.inputs.filter(i => i.parent).length,
    children: context.outputs.filter(o => o.spent_by).length,
    addresses: Object.keys(context.addresses).length,
    truncated,
  };
  const t = d.transaction;
  return {
    ok: true,
    txid,
    mempool: {
      confirmed: t.block_id > 0,
      block_height: t.block_id > 0 ? t.block_id : null,
      fee: t.fee ?? 0,
    },
    analysis: result.analysis,
  };
}

// Analyze several transactions with their one-hop neighbourhood. Every lookup
// is batched across all targets: tx dashboards 10 per call, addresses 100 per call.
export async function analyzeTxs(txids) {
  const ids = [...new Set(txids.map(t => t.toLowerCase()))];
  const targets = await getTxs(ids);

  const lists = [...targets.values()].map(candidates);
  const parents = roundRobin(lists.map(l => l.parents), MAX_PARENTS);
  const children = roundRobin(lists.map(l => l.children), MAX_CHILDREN);
  const addresses = roundRobin(lists.map(l => l.addresses), MAX_ADDRESSES);
  const capped = lists.some(
    l =>
      l.parents.some(h => !parents.has(h)) ||
      l.children.some(h => !children.has(h)) ||
      l.addresses.some(a => !addresses.has(a))
  );

  const [related, addressInfo] = await Promise.all([
    getTxs([...parents, ...children], { budgetMs: NEIGHBOUR_BUDGET_MS }),
    getAddressInfo([...addresses], { budgetMs: NEIGHBOUR_BUDGET_MS }),
  ]);
  // Anything requested but missing (budget ran out, or not found) counts as truncated.
  const truncated = capped || [...parents, ...children].some(h => !related.has(h));

  const results = {};
  await Promise.all(
    ids.map(async id => {
      const d = targets.get(id);
      if (!d) {
        results[id] = { ok: false, error: `Transaction ${id} not found`, status: 404 };
        return;
      }
      try {
        results[id] = await analyzeOne(id, d, related, addressInfo, truncated);
      } catch (err) {
        results[id] = { ok: false, error: err.message || 'Unknown error', status: 500 };
      }
    })
  );
  return results;
}
