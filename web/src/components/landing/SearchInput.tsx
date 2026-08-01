import { Search } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { AppMode } from '../../lib/types'

interface SearchInputProps {
  mode: AppMode
  value: string
  error: string | null
  shaking: boolean
  onChange: (value: string) => void
  onKeyDown: (e: KeyboardEvent) => void
}

export default function SearchInput({
  mode,
  value,
  error,
  shaking,
  onChange,
  onKeyDown,
}: SearchInputProps) {
  return (
    <div
      className={shaking ? 'shake' : ''}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
    >
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: '14px',
          color: 'var(--color-text-muted)',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          mode === 'transaction'
            ? 'Paste a transaction ID'
            : 'Paste a Bitcoin address'
        }
        style={{
          width: '100%',
          height: '52px',
          paddingLeft: '42px',
          paddingRight: '16px',
          fontSize: '15px',
          border: `1px solid ${error ? 'var(--color-signal)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          outline: 'none',
          transition: 'border-color var(--duration-fast)',
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--color-text)'
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--color-border)'
        }}
      />
    </div>
  )
}
