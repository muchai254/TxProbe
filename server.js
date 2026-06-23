import https from 'https';
import fs from 'fs';
import express from 'express';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer the static musl binary (produced by Railway / CI).
// Fall back to the native build for local development.
const BINARY_MUSL   = path.join(__dirname, 'target', 'x86_64-unknown-linux-musl', 'release', 'txprobe-analyzer');
const BINARY_NATIVE = path.join(__dirname, 'target', 'release', 'txprobe-analyzer');
const BINARY = (() => {
  try { fs.accessSync(BINARY_MUSL, fs.constants.X_OK); return BINARY_MUSL; } catch { return BINARY_NATIVE; }
})();

const MEMPOOL = 'https://blockstream.info/api';

const app = express();
app.use(express.json());

// In-memory cache: txid → analysis response
const cache = new Map();
const MAX_CACHE = 500;

function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}

// Use https module directly with family:4 to avoid IPv6 ETIMEDOUT in this environment.
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      { hostname: u.hostname, path: u.pathname + u.search, family: 4, timeout: 15000 },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          } else {
            resolve(body);
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout: ${url}`)); });
    req.on('error', reject);
  });
}

async function fetchJson(url) {
  const body = await httpsGet(url);
  return JSON.parse(body);
}

async function fetchText(url) {
  return httpsGet(url);
}

function runAnalyzer(input) {
  return new Promise((resolve, reject) => {
    const proc = spawn(BINARY, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`Analyzer exited ${code}: ${stderr}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`Failed to parse analyzer output: ${stdout}`));
      }
    });
    proc.on('error', reject);
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Samples cache: fresh txids + addresses from the latest confirmed block
let samplesCache = null;
let samplesCacheTime = 0;

app.get('/api/samples', async (_req, res) => {
  const now = Date.now();
  if (samplesCache && now - samplesCacheTime < 60_000) {
    return res.json(samplesCache);
  }
  try {
    const height = await fetchText(`${MEMPOOL}/blocks/tip/height`);
    const hash = await fetchText(`${MEMPOOL}/block-height/${height.trim()}`);
    const txids = await fetchJson(`${MEMPOOL}/block/${hash.trim()}/txids`);
    // Index 0 is always coinbase; take the next 3
    const sampleTxids = txids.slice(1, 4);
    // Fetch one tx to extract output addresses
    const tx = await fetchJson(`${MEMPOOL}/tx/${sampleTxids[0]}`);
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

app.post('/api/analyze-tx', async (req, res) => {
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
      fetchText(`${MEMPOOL}/tx/${txid}/hex`),
      fetchJson(`${MEMPOOL}/tx/${txid}`),
    ]);

    // Build prevouts from the tx metadata (mempool.space includes prevout data)
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

// Serve built frontend in production
app.use(express.static(path.join(__dirname, 'web', 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`txprobe server running on http://localhost:${PORT}`);
});
