import type { ReactNode } from 'react'

interface PageShellProps {
  header?: ReactNode
  children: ReactNode
}

export default function PageShell({ header, children }: PageShellProps) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {header}
      {children}
    </div>
  )
}
