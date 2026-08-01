export default function LandingFooter() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '48px',
      padding: '0 var(--space-6)',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
      }}>
        made with ❤️ by{' '}
        <a
          href="https://github.com/muchai254"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--color-text)',
            textDecoration: 'none',
            borderBottom: '1px solid var(--color-border)',
            fontWeight: 500,
            transition: 'border-color var(--duration-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'var(--color-border)' }}
        >
          muchai254
        </a>
      </span>
    </footer>
  )
}
