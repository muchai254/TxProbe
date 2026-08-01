import { ArrowLeft, Copy, ExternalLink, Check, Fingerprint } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  onBack?: () => void;
  backLabel?: string;
  contextId?: string;
  showCopy?: boolean;
  showExternal?: boolean;
  externalUrl?: string;
}

function truncate(s: string): string {
  if (!s) return ''
  return `${s.slice(0, 10)}...${s.slice(-6)}`
}

export default function Header({
  onBack,
  backLabel,
  contextId,
  showCopy = false,
  showExternal = false,
  externalUrl,
}: HeaderProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!contextId) return
    navigator.clipboard.writeText(contextId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 var(--space-6)',
        flexShrink: 0,
      }}
    >
      {/* Left: back button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              padding: '4px 8px 4px 0',
            }}
          >
            <ArrowLeft size={16} />
            {backLabel && <span>{backLabel}</span>}
          </button>
        )}
      </div>

      {/* Center: wordmark + context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Fingerprint size={15} style={{ color: 'var(--color-text)', flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)' }}>
          TxProbe
        </span>
        {contextId && (
          <>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {truncate(contextId)}
            </span>
          </>
        )}
      </div>

      {/* Right: action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
        {showCopy && contextId && (
          <button
            onClick={handleCopy}
            title="Copy"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {copied ? <Check size={16} color="var(--color-signal)" /> : <Copy size={16} />}
          </button>
        )}
        {showExternal && externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </header>
  )
}
