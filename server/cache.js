// In-memory cache: txid → analysis response
export const cache = new Map();
const MAX_CACHE = 500;

export function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}
