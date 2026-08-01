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
        fontSize: 'var(--text-sm)',
        padding: '6px 14px', border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
        color: 'var(--color-text)',
      }}
    >
      {children}
    </button>
  )
}
