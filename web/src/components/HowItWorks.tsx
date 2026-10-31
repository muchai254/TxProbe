import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from './Header'
import LandingFooter from './landing/LandingFooter'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './ui/Accordion'
import { HEURISTIC_LIST } from '../lib/heuristics'
import {
  HEURISTIC_EXPLAINERS,
  SCORE_PENALTIES,
  SCORE_BONUSES,
  SCORE_BANDS,
  type ScoreRow,
} from './howItWorks/content'

const paragraph = {
  margin: '0 0 var(--space-4)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text)',
  lineHeight: 1.7,
} as const

function Section({
  id,
  label,
  title,
  children,
}: {
  id?: string
  label: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      style={{
        borderTop: 'var(--border-hairline)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        scrollMarginTop: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <p
          style={{
            margin: '0 0 var(--space-2)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </p>
        <h2
          style={{
            margin: '0 0 var(--space-6)',
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}

function Table({
  heading,
  rows,
}: {
  heading: string
  rows: { left: ReactNode; right: ReactNode }[]
}) {
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div className="label-micro" style={{ marginBottom: 'var(--space-2)' }}>
        {heading}
      </div>
      <div
        style={{
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              borderTop: i === 0 ? 'none' : 'var(--border-hairline)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text)',
            }}
          >
            <span style={{ lineHeight: 1.5 }}>{row.left}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {row.right}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function scoreRows(rows: ScoreRow[]) {
  return rows.map((r) => ({ left: r.signal, right: r.points }))
}

function Labelled({ label, children }: { label: string; children: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div className="label-micro" style={{ marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ color: 'var(--color-text)' }}>{children}</div>
    </div>
  )
}

export default function HowItWorks() {
  const navigate = useNavigate()
  const { hash } = useLocation()

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [hash])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Header onBack={() => navigate('/')} backLabel="Back" />

      <div style={{ flex: 1 }}>
        <Section label="How it works" title="What TxProbe looks for">
          <p style={paragraph}>
            Every Bitcoin payment is recorded on a public list that anyone can
            read. Your name is not on it, but the way a payment is put together
            can leave clues about who you are, which coins are yours, and how
            much you have.
          </p>
          <p style={{ ...paragraph, margin: 0 }}>
            Companies that track Bitcoin look for 14 well-known patterns.
            TxProbe checks your transaction for the same patterns, so you can
            see what they would see. Below is how your privacy score is worked
            out, followed by each pattern in plain words.
          </p>
        </Section>

        <Section
          id="score"
          label="Privacy score"
          title="How your privacy score is calculated"
        >
          <p style={paragraph}>
            Every transaction starts with a perfect score of 100. Each clue that
            helps an observer takes points away. A few things that make you
            harder to follow add points back. The final score never goes below 0
            or above 100.
          </p>
          <Table
            heading="Things that lower your score"
            rows={scoreRows(SCORE_PENALTIES)}
          />
          <Table
            heading="Things that raise your score"
            rows={scoreRows(SCORE_BONUSES)}
          />
          <Table
            heading="What your score means"
            rows={SCORE_BANDS.map((b) => ({
              left: (
                <>
                  <span style={{ fontWeight: 600 }}>{b.label}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {' '}
                    · {b.meaning}
                  </span>
                </>
              ),
              right: b.range,
            }))}
          />
          <p
            style={{
              ...paragraph,
              margin: 0,
              color: 'var(--color-text-muted)',
            }}
          >
            Example: a payment that combines two of your coins (−20) and has
            easy-to-spot change (−15) scores 100 − 20 − 15 = 65, which is
            Traceable. New coins created as a miner&apos;s reward have no sender
            to protect, so they are not scored.
          </p>
        </Section>

        <Section label="The patterns" title="The 14 patterns TxProbe looks for">
          <Accordion type="multiple">
            {HEURISTIC_LIST.map((h) => {
              const e = HEURISTIC_EXPLAINERS[h.id]
              return (
                <AccordionItem key={h.id} value={h.id}>
                  <AccordionTrigger>{h.name}</AccordionTrigger>
                  <AccordionContent>
                    <Labelled label="What it means">{e.plain}</Labelled>
                    <Labelled label="Effect on your score">
                      {e.scoreEffect}
                    </Labelled>
                    <Labelled label="How to avoid it">{e.avoid}</Labelled>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </Section>
      </div>

      <LandingFooter />
    </div>
  )
}
