import { ArrowLeft, Copy, ExternalLink, Check } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  onBack?: () => void;
  backLabel?: string;
  contextId?: string;
  contextType?: 'txid' | 'xpub';
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
  contextType = 'txid',
  showCopy = false,
  showExternal = false,
  externalUrl,
}: HeaderProps) {
  const [copied, setCopied] = useState(false)

  void contextType

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
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-6)',
        gap: 'var(--space-4)',
        flexShrink: 0,
      }}
    >
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
      <div style={{ flex: 1 }} />
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
    </header>
  )
}
