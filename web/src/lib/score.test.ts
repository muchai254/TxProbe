import { describe, it, expect } from 'vitest'
import { getScoreLabel, isCleanScore, isLowScore } from './score'

describe('getScoreLabel', () => {
  it('labels each bucket, inclusive of its lower boundary', () => {
    expect(getScoreLabel(100)).toBe('Private')
    expect(getScoreLabel(90)).toBe('Private')
    expect(getScoreLabel(89)).toBe('Guarded')
    expect(getScoreLabel(75)).toBe('Guarded')
    expect(getScoreLabel(74)).toBe('Traceable')
    expect(getScoreLabel(55)).toBe('Traceable')
    expect(getScoreLabel(54)).toBe('Exposed')
    expect(getScoreLabel(35)).toBe('Exposed')
    expect(getScoreLabel(34)).toBe('Transparent')
    expect(getScoreLabel(0)).toBe('Transparent')
  })
})

describe('isCleanScore', () => {
  it('is true at and above the 80 threshold', () => {
    expect(isCleanScore(80)).toBe(true)
    expect(isCleanScore(100)).toBe(true)
  })

  it('is false below the 80 threshold', () => {
    expect(isCleanScore(79)).toBe(false)
  })
})

describe('isLowScore', () => {
  it('is true below the 50 threshold', () => {
    expect(isLowScore(49)).toBe(true)
    expect(isLowScore(0)).toBe(true)
  })

  it('is false at and above the 50 threshold', () => {
    expect(isLowScore(50)).toBe(false)
  })
})
