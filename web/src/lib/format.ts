// Truncate an id (txid or address) to `head...tail` for display. Two different
// shapes are used across the app (10/6 vs 8/6) — both are preserved via the
// parameters rather than unified, since changing either would alter rendered output.
export function truncateId(id: string, head = 10, tail = 6): string {
  if (!id) return ''
  return `${id.slice(0, head)}...${id.slice(-tail)}`
}

export function formatSats(sats: number): string {
  if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`
  return `${sats.toLocaleString()} sat`
}
