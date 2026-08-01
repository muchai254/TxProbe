import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'

const Accordion = AccordionPrimitive.Root

function AccordionItem({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      style={{ borderBottom: 'var(--border-hairline)' }}
      {...props}
    >
      {children}
    </AccordionPrimitive.Item>
  )
}

function AccordionTrigger({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header style={{ display: 'flex', margin: 0 }}>
      <AccordionPrimitive.Trigger
        className="accordion-trigger"
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          padding: 'var(--space-4) 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontWeight: 500,
          width: '100%',
        }}
        {...props}
      >
        {children}
        <ChevronDown
          size={14}
          className="accordion-chevron"
          style={{ flexShrink: 0, color: 'var(--color-text-muted)' }}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="accordion-content"
      style={{ overflow: 'hidden' }}
      {...props}
    >
      <div
        style={{
          paddingBottom: 'var(--space-4)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
