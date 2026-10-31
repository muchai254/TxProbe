import { describe, it, expect } from 'vitest'
import { HEURISTIC_IDS } from '../../lib/heuristics'
import { HEURISTIC_EXPLAINERS } from './content'

describe('HEURISTIC_EXPLAINERS', () => {
  it('explains exactly the heuristics the analyzer reports', () => {
    expect(Object.keys(HEURISTIC_EXPLAINERS).sort()).toEqual(
      [...HEURISTIC_IDS].sort(),
    )
  })

  it('has no empty fields', () => {
    for (const [id, e] of Object.entries(HEURISTIC_EXPLAINERS)) {
      for (const field of [e.plain, e.scoreEffect, e.avoid]) {
        expect(field.trim(), id).not.toBe('')
      }
    }
  })
})
