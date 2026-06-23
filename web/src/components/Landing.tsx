import { useState, useEffect, useRef } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import type { AppMode } from '../lib/types'
import { fetchSamples } from '../lib/api'
// @ts-ignore — JSX component, no type declarations needed
import TextType from './TextType'

const TYPING_SENTENCES = [
  'Every Bitcoin transaction leaves clues.',
  'Inputs reveal patterns.',
  'Outputs reveal behaviour.',
  'Change reveals identity.',
  'Patterns reveal privacy leaks.',
  'Investigate your Bitcoin footprint.',
]

const TYPING_COLORS = [
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text-muted)',
  'var(--color-text)',
]

interface LandingProps {
  onTxSubmit: (txid: string) => void;
  onAddressSubmit: (address: string) => void;
}

function validateTxid(s: string): string | null {
  if (!s.trim()) return 'Please enter a transaction ID.'
  if (!/^[0-9a-fA-F]{64}$/.test(s.trim())) return 'Transaction ID must be 64 hex characters.'
  return null
}

function validateAddress(s: string): string | null {
  if (!s.trim()) return 'Please enter a Bitcoin address.'
  if (!/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{8,90}$/.test(s.trim())) {
    return 'Enter a valid mainnet Bitcoin address (starts with 1, 3, or bc1).'
  }
  return null
}

function truncate(s: string): string {
  return `${s.slice(0, 8)}...${s.slice(-6)}`
}

interface Samples {
  txids: string[];
  addresses: string[];
}

export default function Landing({ onTxSubmit, onAddressSubmit }: LandingProps) {
  const [mode, setMode] = useState<AppMode>('transaction')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  const [samples, setSamples] = useState<Samples | null>(null)
  const [samplesLoading, setSamplesLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSamplesLoading(true)
    fetchSamples()
      .then(s => { setSamples(s); setSamplesLoading(false) })
      .catch(() => setSamplesLoading(false))
  }, [])

  function switchMode(m: AppMode) {
    setMode(m)
    setValue('')
    setError(null)
  }

  function submit(v: string) {
    const trimmed = v.trim()
    const err = mode === 'transaction' ? validateTxid(trimmed) : validateAddress(trimmed)
    if (err) {
      setError(err)
      setShaking(true)
      setTimeout(() => setShaking(false), 200)
      return
    }
    setError(null)
    if (mode === 'transaction') {
      onTxSubmit(trimmed)
    } else {
      onAddressSubmit(trimmed)
    }
  }

  function handleSubmit() {
    submit(value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
  }

  function handleSampleClick(s: string) {
    setValue(s)
    submit(s)
  }

  const currentSamples = mode === 'transaction' ? samples?.txids : samples?.addresses

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <header style={{
        height: '48px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-6)',
      }}>
        <span style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>TxProbe</span>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* TextType hero — top 40% of body */}
        <div style={{
          height: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 var(--space-8)',
        }}>
          <TextType
            text={TYPING_SENTENCES}
            typingSpeed={65}
            deletingSpeed={35}
            pauseDuration={1600}
            loop={false}
            showCursor={true}
            cursorCharacter="|"
            textColors={TYPING_COLORS}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(18px, 3vw, 28px)',
              lineHeight: 1.4,
              textAlign: 'center',
              maxWidth: '640px',
            }}
          />
        </div>

        {/* Form — remaining 60% of body, centered */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)',
        }}>
        <div style={{ width: '100%', maxWidth: '560px' }}>
          {/* Mode tabs */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
            justifyContent: 'center',
          }}>
            {(['transaction', 'address'] as AppMode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m ? '1px solid var(--color-text)' : '1px solid transparent',
                  padding: '4px 0 6px 0',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  color: mode === m ? 'var(--color-text)' : 'var(--color-text-muted)',
                  fontWeight: mode === m ? 600 : 400,
                  textTransform: 'capitalize',
                  transition: 'color var(--duration-fast)',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div
            className={shaking ? 'shake' : ''}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <Search
              size={16}
              style={{ position: 'absolute', left: '14px', color: 'var(--color-text-muted)', pointerEvents: 'none', flexShrink: 0 }}
            />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => { setValue(e.target.value); setError(null) }}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'transaction' ? 'Paste a transaction ID' : 'Paste a Bitcoin address'}
              style={{
                width: '100%',
                height: '52px',
                paddingLeft: '42px',
                paddingRight: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                border: `1px solid ${error ? 'var(--color-signal)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color var(--duration-fast)',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = 'var(--color-text)' }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--color-border)' }}
            />
          </div>

          {/* Sample chips — skeleton while loading, real chips after */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-3)',
            minHeight: '26px',
          }}>
            {(samplesLoading || currentSamples) && (
              <span style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
                marginRight: '2px',
              }}>
                Try:
              </span>
            )}
            {samplesLoading
              ? [0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 112,
                    height: 22,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-border)',
                    opacity: 0.5,
                  }} />
                ))
              : currentSamples?.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSampleClick(s)}
                    title={s}
                    style={{
                      padding: '3px 8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-text)'
                      e.currentTarget.style.color = 'var(--color-text)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                    }}
                  >
                    {truncate(s)}
                  </button>
                ))
            }
          </div>

          {/* Validation error */}
          {error && (
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-signal)' }}>
              {error}
            </p>
          )}

          {/* Submit button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <button
              onClick={handleSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '8px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                border: '1px solid var(--color-text)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all var(--duration-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--color-text)'
                e.currentTarget.style.color = 'var(--color-surface)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
            >
              Analyze
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
