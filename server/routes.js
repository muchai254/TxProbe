import express from 'express';
import { fetchJson, fetchText, BLOCKSTREAM_API } from './upstream.js';
import { cache, cacheSet } from './cache.js';
import { runAnalyzer } from './analyzer.js';

const router = express.Router();

router.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Samples cache: fresh txids + addresses from the latest confirmed block
let samplesCache = null;
let samplesCacheTime = 0;

router.get('/api/samples', async (_req, res) => {
  const now = Date.now();
  if (samplesCache && now - samplesCacheTime < 60_000) {
    return res.json(samplesCache);
  }
  try {
    const height = await fetchText(`${BLOCKSTREAM_API}/blocks/tip/height`);
    const hash = await fetchText(`${BLOCKSTREAM_API}/block-height/${height.trim()}`);
    const txids = await fetchJson(`${BLOCKSTREAM_API}/block/${hash.trim()}/txids`);
    // Index 0 is always coinbase; take the next 3
    const sampleTxids = txids.slice(1, 4);
    // Fetch one tx to extract output addresses
    const tx = await fetchJson(`${BLOCKSTREAM_API}/tx/${sampleTxids[0]}`);
    const addresses = tx.vout
      .filter(o => o.scriptpubkey_type !== 'op_return' && o.scriptpubkey_address)
      .map(o => o.scriptpubkey_address)
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

  if (!txid || !/^[0-9a-fA-F]{64}$/.test(txid)) {
    return res.status(400).json({ ok: false, error: 'Invalid txid' });
  }

  const cacheKey = txid.toLowerCase();
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    // Fetch raw tx hex
    const [rawHex, txMeta] = await Promise.all([
      fetchText(`${BLOCKSTREAM_API}/tx/${txid}/hex`),
      fetchJson(`${BLOCKSTREAM_API}/tx/${txid}`),
    ]);

    // Build prevouts from the tx metadata (blockstream.info includes prevout data)
    const prevouts = txMeta.vin.map(input => ({
      value: input.prevout ? input.prevout.value : 0,
      scriptpubkey: input.prevout ? input.prevout.scriptpubkey : '',
    }));

    // Run the Rust analyzer
    const result = await runAnalyzer({ raw_tx: rawHex.trim(), prevouts });

    if (!result.ok) {
      return res.status(422).json({ ok: false, error: result.error || 'Analyzer error' });
    }

    const response = {
      ok: true,
      txid: cacheKey,
      mempool: {
        confirmed: txMeta.status?.confirmed ?? false,
        block_height: txMeta.status?.block_height ?? null,
        fee: txMeta.fee ?? 0,
      },
      analysis: result.analysis,
    };

    cacheSet(cacheKey, response);
    res.json(response);
  } catch (err) {
    const msg = err.message || 'Unknown error';
    if (msg.includes('HTTP 404')) {
      return res.status(404).json({ ok: false, error: `Transaction ${txid} not found` });
    }
    res.status(500).json({ ok: false, error: msg });
  }
});

export default router;
