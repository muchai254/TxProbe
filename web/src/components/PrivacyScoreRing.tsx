import { useEffect, useRef } from 'react'

interface PrivacyScoreRingProps {
  score: number;
  size?: number;
  animate?: boolean;
}

export default function PrivacyScoreRing({ score, size = 80, animate = true }: PrivacyScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const isClean = score >= 80
  const strokeColor = isClean ? 'var(--color-border)' : 'var(--color-signal)'

  useEffect(() => {
    if (!animate || !circleRef.current) return
    const el = circleRef.current
    el.style.transition = 'none'
    el.style.strokeDashoffset = String(circumference)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 800ms ease-out'
        el.style.strokeDashoffset = String(offset)
      })
    })
  }, [score, animate, circumference, offset])

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="3"
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: animate ? 'none' : undefined }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: size >= 64 ? 'var(--text-xl)' : 'var(--text-md)',
          fontWeight: 600,
          color: isClean ? 'var(--color-text)' : 'var(--color-signal)',
          lineHeight: 1,
        }}>
          {score}
        </span>
      </div>
    </div>
  )
}
