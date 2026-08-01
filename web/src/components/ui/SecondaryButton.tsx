import type { ReactNode } from 'react'

interface SecondaryButtonProps {
  onClick: () => void;
  children: ReactNode;
}

export default function SecondaryButton({ onClick, children }: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
        padding: '6px 14px', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
        color: 'var(--color-text)',
      }}
    >
      {children}
    </button>
  )
}
