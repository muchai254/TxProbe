import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/Accordion'
import { Link } from 'react-router-dom'
import { FAQ_ITEMS } from './content'

export default function FaqSection() {
  return (
    <section
      style={{
        borderTop: 'var(--border-hairline)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-8)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <p
          style={{
            margin: '0 0 var(--space-6)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Common questions
        </p>
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Link
          to="/how-it-works"
          style={{
            display: 'inline-block',
            marginTop: 'var(--space-6)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text)',
            borderBottom: 'var(--border-hairline)',
            fontWeight: 500,
            transition: 'border-color var(--duration-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderBottomColor = 'var(--color-text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderBottomColor = 'var(--color-border)'
          }}
        >
          See every pattern explained →
        </Link>
      </div>
    </section>
  )
}
