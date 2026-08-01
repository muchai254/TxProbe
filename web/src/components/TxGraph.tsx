import { useEffect, useState } from 'react'
import type { TxInput, TxOutput, HeuristicId, HeuristicResult } from '../lib/types'
import { getHeuristic } from '../lib/heuristics'

interface TxGraphProps {
  inputs: TxInput[];
  outputs: TxOutput[];
  privacyScore: number;
  heuristics: Record<HeuristicId, HeuristicResult>;
  detectedHeuristics: HeuristicId[];
}

const NODE_W = 140;
const NODE_H = 44;
const TX_W = 88;
const TX_H = 88;
const NODE_RADIUS = 4;
const MAX_NODES = 8;

function formatSats(sats: number): string {
  if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`
  return `${sats.toLocaleString()} sat`
}

export default function TxGraph({
  inputs,
  outputs,
  privacyScore,
  heuristics,
  detectedHeuristics,
}: TxGraphProps) {
  const [assembled, setAssembled] = useState(false)
  const [signaled, setSignaled] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setAssembled(true), 50)
    const t2 = setTimeout(() => setSignaled(true), 800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const visibleInputs = inputs.slice(0, MAX_NODES)
  const visibleOutputs = outputs.slice(0, MAX_NODES)
  const extraInputs = Math.max(0, inputs.length - MAX_NODES)
  const extraOutputs = Math.max(0, outputs.length - MAX_NODES)

  const hasDetections = detectedHeuristics.length > 0

  const PADDING_H = 32
  const PADDING_V = 24
  const COL_GAP = 80
  const inputCount = Math.max(visibleInputs.length, 1)
  const outputCount = Math.max(visibleOutputs.length, 1)
  const rowSpacing = 12

  const inputColHeight = inputCount * NODE_H + (inputCount - 1) * rowSpacing
  const outputColHeight = outputCount * NODE_H + (outputCount - 1) * rowSpacing
  const totalHeight = Math.max(inputColHeight, outputColHeight, TX_H) + PADDING_V * 2

  const svgWidth = PADDING_H + NODE_W + COL_GAP + TX_W + COL_GAP + NODE_W + PADDING_H
  const svgHeight = totalHeight

  const txCenterX = PADDING_H + NODE_W + COL_GAP
  const txCenterY = totalHeight / 2

  function inputY(i: number): number {
    const startY = (totalHeight - inputColHeight) / 2
    return startY + i * (NODE_H + rowSpacing)
  }
  function outputY(i: number): number {
    const startY = (totalHeight - outputColHeight) / 2
    return startY + i * (NODE_H + rowSpacing)
  }

  function nodeColor(detected: boolean): string {
    return detected && signaled ? 'var(--color-signal)' : 'var(--color-border)'
  }

  function edge(x1: number, y1: number, x2: number, y2: number, active: boolean, key: string) {
    const cx = (x1 + x2) / 2
    return (
      <path
        key={key}
        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={active && signaled ? 'var(--color-signal-mid)' : 'var(--color-border)'}
        strokeWidth={active && signaled ? '1.5' : '1'}
        style={{
          opacity: assembled ? 1 : 0,
          transition: 'opacity 200ms ease-out, stroke 400ms ease-out',
        }}
      />
    )
  }

  const chipLabels = detectedHeuristics.slice(0, 5).map(h => getHeuristic(h).chip)
  const chipTotalW = chipLabels.length * 38 - 2

  return (
    <div style={{ width: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ maxWidth: '100%', fontFamily: 'var(--font-mono)' }}
      >
        {visibleInputs.map((_, i) => {
          const y = inputY(i) + NODE_H / 2
          return edge(PADDING_H + NODE_W, y, txCenterX + TX_W / 2, txCenterY, hasDetections, `in-edge-${i}`)
        })}
        {visibleOutputs.map((_, i) => {
          const y = outputY(i) + NODE_H / 2
          return edge(txCenterX + TX_W / 2, txCenterY, svgWidth - PADDING_H - NODE_W, y, hasDetections, `out-edge-${i}`)
        })}

        {visibleInputs.map((inp, i) => {
          const y = inputY(i)
          return (
            <g key={`inp-${i}`}>
              <rect
                x={PADDING_H} y={y} width={NODE_W} height={NODE_H} rx={NODE_RADIUS}
                fill="var(--color-surface)"
                stroke={nodeColor(hasDetections)}
                strokeWidth="1"
                style={{ opacity: assembled ? 1 : 0, transition: `opacity 200ms ease-out ${i * 40}ms, stroke 400ms ease-out` }}
              />
              <text x={PADDING_H + 10} y={y + 17} fontSize="10" fill="var(--color-text-muted)"
                style={{ opacity: assembled ? 1 : 0, transition: `opacity 200ms ease-out ${i * 40}ms` }}>
                {inp.script_type.toUpperCase()}
              </text>
              <text x={PADDING_H + 10} y={y + 31} fontSize="11" fill="var(--color-text)" fontWeight="500"
                style={{ opacity: assembled ? 1 : 0, transition: `opacity 200ms ease-out ${i * 40}ms` }}>
                {formatSats(inp.value_sats)}
              </text>
            </g>
          )
        })}

        {extraInputs > 0 && (
          <text x={PADDING_H + NODE_W / 2} y={inputY(MAX_NODES) + 14} fontSize="11" fill="var(--color-text-muted)" textAnchor="middle">
            +{extraInputs} more
          </text>
        )}

        <g>
          <rect
            x={txCenterX} y={txCenterY - TX_H / 2} width={TX_W} height={TX_H} rx="6"
            fill="var(--color-surface)"
            stroke={hasDetections && signaled ? 'var(--color-signal)' : 'var(--color-border)'}
            strokeWidth="1"
            style={{ opacity: assembled ? 1 : 0, transition: 'opacity 200ms ease-out 200ms, stroke 400ms ease-out' }}
          />
          <text
            x={txCenterX + TX_W / 2} y={txCenterY + 6}
            fontSize="22" fontWeight="700" textAnchor="middle"
            fill={hasDetections && signaled ? 'var(--color-signal)' : 'var(--color-text)'}
            style={{ opacity: assembled ? 1 : 0, transition: 'opacity 200ms ease-out 200ms, fill 400ms ease-out' }}
          >
            {privacyScore}
          </text>
          {chipLabels.map((chip, ci) => {
            const chipX = txCenterX + TX_W / 2 - chipTotalW / 2 + ci * 38
            return (
              <g key={chip} style={{ opacity: signaled ? 1 : 0, transition: 'opacity 400ms ease-out' }}>
                <rect x={chipX} y={txCenterY + TX_H / 2 + 8} width={34} height={16} rx="3"
                  fill="var(--color-signal-low)" stroke="var(--color-signal)" strokeWidth="0.5" />
                <text x={chipX + 17} y={txCenterY + TX_H / 2 + 20} fontSize="8" fontWeight="600"
                  fill="var(--color-signal)" textAnchor="middle">
                  {chip}
                </text>
              </g>
            )
          })}
        </g>

        {visibleOutputs.map((out, i) => {
          const y = outputY(i)
          const x = svgWidth - PADDING_H - NODE_W
          const changeResult = heuristics.change_detection
          const isChange = changeResult?.detected && (changeResult as { likely_change_index?: number }).likely_change_index === i
          return (
            <g key={`out-${i}`}>
              <rect
                x={x} y={y} width={NODE_W} height={NODE_H} rx={NODE_RADIUS}
                fill="var(--color-surface)"
                stroke={isChange && signaled ? 'var(--color-signal-mid)' : 'var(--color-border)'}
                strokeWidth="1"
                strokeDasharray={isChange ? '3,2' : undefined}
                style={{ opacity: assembled ? 1 : 0, transition: `opacity 200ms ease-out ${i * 40 + 300}ms, stroke 400ms ease-out` }}
              />
              <text x={x + 10} y={y + 17} fontSize="10"
                fill={isChange && signaled ? 'var(--color-signal)' : 'var(--color-text-muted)'}
                style={{ opacity: assembled ? 1 : 0, transition: `opacity 200ms ease-out ${i * 40 + 300}ms` }}>
                {isChange ? 'CHNG?' : out.script_type.toUpperCase()}
              </text>
              <text x={x + 10} y={y + 31} fontSize="11" fill="var(--color-text)" fontWeight="500"
                style={{ opacity: assembled ? 1 : 0, transition: `opacity 200ms ease-out ${i * 40 + 300}ms` }}>
                {formatSats(out.value_sats)}
              </text>
            </g>
          )
        })}

        {extraOutputs > 0 && (
          <text x={svgWidth - PADDING_H - NODE_W / 2} y={outputY(MAX_NODES) + 14} fontSize="11" fill="var(--color-text-muted)" textAnchor="middle">
            +{extraOutputs} more
          </text>
        )}
      </svg>
    </div>
  )
}
