import https from 'https';

export const BLOCKCHAIR_API = 'https://api.blockchair.com/bitcoin';

const RETRY_CODES = new Set([402, 429, 435, 500, 502, 503]);
const MAX_ATTEMPTS = 3;

export class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
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
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      }
    );
    // `timeout` above only fires on an idle socket; this caps the whole download,
    // which matters for dashboards of transactions with thousands of outputs.
    const deadline = setTimeout(() => req.destroy(new Error('Request timeout')), 30000);
    req.on('close', () => clearTimeout(deadline));
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Running total of request points spent, reset at 00:00 UTC like Blockchair's counter.
let usageDay = new Date().toISOString().slice(0, 10);
let usagePoints = 0;

function recordCost(cost) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== usageDay) {
    usageDay = today;
    usagePoints = 0;
  }
  usagePoints += cost;
  console.log(`[blockchair] cost ${cost} · today ${usagePoints.toFixed(1)} points`);
}

function apiKey() {
  const key = process.env.BLOCKCHAIR_API_KEY;
  if (!key) throw new Error('BLOCKCHAIR_API_KEY is not set');
  return key;
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
    let res;
    try {
      res = await httpsGet(url);
    } catch (err) {
      lastError = err;
      // A timed-out download was probably served (and charged) anyway; don't pay again.
      if (err.message === 'Request timeout') break;
      continue;
    }
    let json;
    try {
      json = JSON.parse(res.body);
    } catch {
      json = null;
    }
    const code = json?.context?.code ?? res.status;
    if (code === 200) {
      recordCost(json.context.request_cost ?? 0);
      return json;
    }
    lastError = new UpstreamError(json?.context?.error || `Blockchair HTTP ${code}`, code);
    if (!RETRY_CODES.has(code)) break;
  }
  throw lastError;
}

// Identical concurrent requests share one upstream call.
const inFlight = new Map();

// GET {BLOCKCHAIR_API}{path}?{params}&key=… and return the parsed JSON body.
export function bcGet(path, params = {}) {
  const qs = new URLSearchParams({ ...params, key: apiKey() });
  const url = `${BLOCKCHAIR_API}${path}?${qs}`;
  if (inFlight.has(url)) return inFlight.get(url);
  const p = fetchWithRetry(url).finally(() => inFlight.delete(url));
  inFlight.set(url, p);
  return p;
}
