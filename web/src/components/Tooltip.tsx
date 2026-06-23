import { useState, useRef } from 'react'

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  function show() {
    timerRef.current = window.setTimeout(() => setVisible(true), 400)
  }
  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-text)',
          color: 'var(--color-surface)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 100,
        }}>
          {content}
        </div>
      )}
    </div>
  )
}
