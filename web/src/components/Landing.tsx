import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import type { AppMode } from '../lib/types'
import { fetchSamples } from '../lib/api'
import { validateTxid, validateAddress } from '../lib/validation'
import { TYPING_SENTENCES, TYPING_COLORS } from './landing/content'
import SearchInput from './landing/SearchInput'
import SampleChips from './landing/SampleChips'
import FaqSection from './landing/FaqSection'
import LandingFooter from './landing/LandingFooter'
import Header from './Header'
import TextType from './TextType'

interface LandingProps {
  onTxSubmit: (txid: string) => void;
  onAddressSubmit: (address: string) => void;
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

  function handleValueChange(v: string) {
    setValue(v)
    setError(null)
  }

  function handleSampleClick(s: string) {
    setValue(s)
    submit(s)
  }

  const currentSamples = mode === 'transaction' ? samples?.txids : samples?.addresses

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <Header />

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

          <SearchInput
            mode={mode}
            value={value}
            error={error}
            shaking={shaking}
            onChange={handleValueChange}
            onKeyDown={handleKeyDown}
          />

          <SampleChips
            loading={samplesLoading}
            samples={currentSamples}
            onSampleClick={handleSampleClick}
          />

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

      <FaqSection />
      <LandingFooter />
    </div>
  )
}
