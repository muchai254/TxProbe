import express from 'express';
import { bcGet, UpstreamError } from './blockchair.js';
import { getTxs, getHistory } from './txStore.js';
import { analyzeTxs } from './graph.js';

const router = express.Router();

const TXID_RE = /^[0-9a-fA-F]{64}$/;
const ADDRESS_RE = /^(bc1[02-9ac-hj-np-z]{11,87}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/;
const XPUB_RE = /^[xyz]pub[1-9A-HJ-NP-Za-km-z]{100,112}$/;
const MAX_BATCH = 10;
// How many of an address's / wallet's latest transactions are listed.
const HISTORY_LIMIT = 50;

function sendError(res, err) {
  const status = err instanceof UpstreamError && err.status === 400 ? 400 : 500;
  res.status(status).json({ ok: false, error: err.message || 'Unknown error' });
}

function toHistory(transactions) {
  return (transactions ?? []).map(t => ({
    txid: t.hash,
    block_height: t.block_id > 0 ? t.block_id : 0,
    balance_change: t.balance_change,
    time: t.time,
  }));
}

router.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Samples cache: fresh txids + addresses from the latest confirmed block
let samplesCache = null;
let samplesCacheTime = 0;
const SAMPLES_TTL = 10 * 60_000;

router.get('/api/samples', async (_req, res) => {
  const now = Date.now();
  if (samplesCache && now - samplesCacheTime < SAMPLES_TTL) {
    return res.json(samplesCache);
  }
  try {
    const stats = await bcGet('/stats');
    const height = stats.data.best_block_height;
    const block = await bcGet(`/dashboards/block/${height}`, { limit: 4 });
    // Index 0 is always coinbase; take the next 3
    const sampleTxids = (block.data[height]?.transactions ?? []).slice(1, 4);
    // Fetching them now also warms the cache for when a sample is clicked.
    const txs = await getTxs(sampleTxids);
    const addresses = (txs.get(sampleTxids[0])?.outputs ?? [])
      .filter(o => o.type !== 'nulldata' && o.recipient)
      .map(o => o.recipient)
      .slice(0, 3);
    samplesCache = { ok: true, txids: sampleTxids, addresses };
    samplesCacheTime = now;
    res.json(samplesCache);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Failed to fetch samples' });
  }
});

router.post('/api/analyze-tx', async (req, res) => {
  const { txid } = req.body;
  if (!txid || !TXID_RE.test(txid)) {
    return res.status(400).json({ ok: false, error: 'Invalid txid' });
  }
  try {
    const result = (await analyzeTxs([txid]))[txid.toLowerCase()];
    const { status, ...body } = result;
    res.status(result.ok ? 200 : status).json(body);
  } catch (err) {
    sendError(res, err);
  }
});

// Batched analysis for the address and wallet pages: up to 10 txids per call.
router.post('/api/analyze-txs', async (req, res) => {
  const { txids } = req.body;
  if (!Array.isArray(txids) || txids.length === 0 || txids.length > MAX_BATCH || !txids.every(t => TXID_RE.test(t))) {
    return res.status(400).json({ ok: false, error: `Send 1–${MAX_BATCH} valid txids` });
  }
  try {
    const raw = await analyzeTxs(txids);
    const results = Object.fromEntries(
      Object.entries(raw).map(([id, { status: _status, ...body }]) => [id, body])
    );
    res.json({ ok: true, results });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/api/address/:address', async (req, res) => {
  const { address } = req.params;
  if (!ADDRESS_RE.test(address)) {
    return res.status(400).json({ ok: false, error: 'Invalid Bitcoin address.' });
  }
  try {
    const r = await getHistory(`/dashboards/address/${address}`, {
      limit: `${HISTORY_LIMIT},0`,
      transaction_details: 'true',
    });
    const entry = Object.values(r.data ?? {})[0];
    if (!entry) return res.status(404).json({ ok: false, error: 'Address not found.' });
    res.json({ ok: true, address: entry.address, transactions: toHistory(entry.transactions) });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/api/wallet/:xpub', async (req, res) => {
  const { xpub } = req.params;
  if (!XPUB_RE.test(xpub)) {
    return res.status(400).json({ ok: false, error: 'Invalid extended public key.' });
  }
  try {
    const r = await getHistory(`/dashboards/xpub/${xpub}`, {
      limit: `${HISTORY_LIMIT},0`,
      transaction_details: 'true',
    });
    const entry = Object.values(r.data ?? {})[0];
    if (!entry) return res.status(404).json({ ok: false, error: 'Wallet not found.' });
    res.json({
      ok: true,
      wallet: entry.xpub,
      used_addresses: Object.keys(entry.addresses ?? {}),
      transactions: toHistory(entry.transactions),
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
