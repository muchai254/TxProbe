// The txid regex mirrors server/routes.js's validation. Not shared across the
// language boundary — there's no shared package between this Vite frontend
// and the Node server — so keep both in sync by hand if the rule ever changes.
export function validateTxid(s: string): string | null {
  if (!s.trim()) return 'Please enter a transaction ID.'
  if (!/^[0-9a-fA-F]{64}$/.test(s.trim()))
    return 'Transaction ID must be 64 hex characters.'
  return null
}

export function validateAddress(s: string): string | null {
  if (!s.trim()) return 'Please enter a Bitcoin address.'
  if (!/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{8,90}$/.test(s.trim())) {
    return 'Enter a valid mainnet Bitcoin address (starts with 1, 3, or bc1).'
  }
  return null
}

export function validateXpub(s: string): string | null {
  if (!s.trim()) return 'Please enter an extended public key.'
  if (!/^[xyz]pub[1-9A-HJ-NP-Za-km-z]{100,112}$/.test(s.trim())) {
    return 'Enter a valid xpub, ypub, or zpub. It is public data, never your seed phrase.'
  }
  return null
}
