// Score thresholds below intentionally disagree with each other today — 90/75/55/35
// for the label buckets, 80 for "clean", 50 for "low". See plan.md appendix item 5.
// Do not reconcile them; that would be a deliberate product decision, not a refactor.

const SCORE_PRIVATE_THRESHOLD = 90
const SCORE_GUARDED_THRESHOLD = 75
const SCORE_TRACEABLE_THRESHOLD = 55
const SCORE_EXPOSED_THRESHOLD = 35

export function getScoreLabel(score: number): string {
  if (score >= SCORE_PRIVATE_THRESHOLD) return 'Private'
  if (score >= SCORE_GUARDED_THRESHOLD) return 'Guarded'
  if (score >= SCORE_TRACEABLE_THRESHOLD) return 'Traceable'
  if (score >= SCORE_EXPOSED_THRESHOLD) return 'Exposed'
  return 'Transparent'
}

const CLEAN_SCORE_THRESHOLD = 80

export function isCleanScore(score: number): boolean {
  return score >= CLEAN_SCORE_THRESHOLD
}

const LOW_SCORE_THRESHOLD = 50

export function isLowScore(score: number): boolean {
  return score < LOW_SCORE_THRESHOLD
}
