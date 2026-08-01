import type { HeuristicMeta } from './heuristics';

type Severity = HeuristicMeta['severity'];

export const SEVERITY_COLORS: Record<Severity, { text: string; bg: string }> = {
  high: { text: 'var(--color-signal)', bg: 'var(--color-signal-low)' },
  medium: { text: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  low: { text: 'var(--color-text-muted)', bg: 'transparent' },
  info: { text: 'var(--color-text-muted)', bg: 'transparent' },
};

// Badge label shown on an individual detected heuristic row.
export const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Serious',
  medium: 'Notable',
  low: 'Minor',
  info: 'Noted',
};

// Distinct, lowercase vocabulary for the findings-panel summary sentence
// ("2 issues detected · 1 serious · 1 notable") — deliberately not unified with
// SEVERITY_LABELS above, which renders as a capitalized badge elsewhere.
export const SEVERITY_SUMMARY_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: 'serious',
  medium: 'notable',
  low: 'minor',
};
