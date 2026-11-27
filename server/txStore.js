import { bcGet } from './blockchair.js';

const TX_BATCH = 10;
const ADDRESS_BATCH = 100;
const CONCURRENCY = 2;
const MUTABLE_TTL = 5 * 60_000;
const ADDRESS_TTL = 10 * 60_000;

// Map-backed LRU with optional per-entry expiry.
class LruCache {
  constructor(max) {
    this.max = max;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires && entry.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, ttl) {
    this.map.delete(key);
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value);
    this.map.set(key, { value, expires: ttl ? Date.now() + ttl : 0 });
  }
}

const txCache = new LruCache(5000);
const historyCache = new LruCache(500);
const addressCache = new LruCache(20000);

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Resolve with `partial` once `promise` settles or `budgetMs` passes, whichever
// is first. `partial` is filled in as chunks arrive, so a slow chunk only costs
// its own results; late chunks still populate the cache.
function settleWithin(promise, partial, budgetMs) {
  const all = promise.then(() => partial, () => partial);
  if (!budgetMs) return all;
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve(partial), budgetMs);
  });
  return Promise.race([all, timeout]).finally(() => clearTimeout(timer));
}

async function runLimited(tasks, limit) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// A confirmed tx whose outputs are all spent can never change again.
function isFinal(tx) {
  return tx.transaction.block_id > 0 && tx.outputs.every(o => o.is_spent || !o.is_spendable);
}

// Fetch Blockchair transaction dashboards, 10 per call. Missing txids (not
// found, failed, or still downloading when budgetMs ran out) are simply absent
// from the returned Map.
export async function getTxs(hashes, { budgetMs } = {}) {
  const wanted = [...new Set(hashes.map(h => h.toLowerCase()))];
  const found = new Map();
  const misses = [];
  for (const h of wanted) {
    const cached = txCache.get(h);
    if (cached) found.set(h, cached);
    else misses.push(h);
  }

  const work = runLimited(
    chunk(misses, TX_BATCH).map(batch => async () => {
      const path = batch.length === 1
        ? `/dashboards/transaction/${batch[0]}`
        : `/dashboards/transactions/${batch.join(',')}`;
      const res = await bcGet(path);
      for (const [hash, tx] of Object.entries(res.data ?? {})) {
        const key = hash.toLowerCase();
        txCache.set(key, tx, isFinal(tx) ? 0 : MUTABLE_TTL);
        found.set(key, tx);
      }
    }),
    CONCURRENCY,
  );
  return budgetMs ? settleWithin(work, found, budgetMs) : work.then(() => found);
}

// Fetch per-address stats (output_count, first_seen_receiving, ...), 100 per call.
export async function getAddressInfo(addresses, { budgetMs } = {}) {
  const wanted = [...new Set(addresses.filter(Boolean))];
  const found = new Map();
  const misses = [];
  for (const a of wanted) {
    const cached = addressCache.get(a);
    if (cached) found.set(a, cached);
    else misses.push(a);
  }

  const work = runLimited(
    chunk(misses, ADDRESS_BATCH).map(batch => async () => {
      const res = batch.length === 1
        ? await bcGet(`/dashboards/address/${batch[0]}`, { limit: 0 })
        : await bcGet(`/dashboards/addresses/${batch.join(',')}`, { limit: 0 });
      const infos = batch.length === 1
        ? { [batch[0]]: res.data?.[batch[0]]?.address }
        : res.data?.addresses ?? {};
      for (const [addr, info] of Object.entries(infos)) {
        if (!info) continue;
        addressCache.set(addr, info, ADDRESS_TTL);
        found.set(addr, info);
      }
    }),
    CONCURRENCY,
  );
  return budgetMs ? settleWithin(work, found, budgetMs) : work.then(() => found);
}

// Address and wallet histories: cached briefly so reloading a page, or going
// back to it from a transaction, doesn't pay for the lookup again.
export async function getHistory(path, params) {
  const key = `${path}?${new URLSearchParams(params)}`;
  const cached = historyCache.get(key);
  if (cached) return cached;
  const res = await bcGet(path, params);
  historyCache.set(key, res, MUTABLE_TTL);
  return res;
}
