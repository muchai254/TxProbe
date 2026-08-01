import { describe, it, expect } from 'vitest'
import { truncateId, formatSats } from './format'

describe('truncateId', () => {
  it('truncates using the default 10/6 shape', () => {
    expect(truncateId('0123456789abcdef0123')).toBe('0123456789...ef0123')
  })

  it('truncates using an explicit 8/6 shape', () => {
    expect(truncateId('0123456789abcdef0123', 8, 6)).toBe('01234567...ef0123')
  })

  it('returns an empty string for an empty id', () => {
    expect(truncateId('')).toBe('')
  })

  it('does not add "..." when the id is shorter than head+tail', () => {
    expect(truncateId('short')).toBe('short...short')
  })
})

describe('formatSats', () => {
  it('formats sub-BTC amounts as sats with locale grouping', () => {
    expect(formatSats(1234)).toBe('1,234 sat')
  })

  it('formats amounts at or above 1 BTC as BTC with 4 decimals', () => {
    expect(formatSats(100_000_000)).toBe('1.0000 BTC')
  })

  it('formats an arbitrary BTC amount correctly', () => {
    expect(formatSats(123_456_789)).toBe('1.2346 BTC')
  })

  it('formats zero as sats', () => {
    expect(formatSats(0)).toBe('0 sat')
  })
})
