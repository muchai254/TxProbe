import { Link } from 'react-router-dom'

export default function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: 'var(--border-hairline)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        height: '48px',
        padding: '0 var(--space-6)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
        }}
      >
        made with ❤️ by{' '}
        <a
          href="https://github.com/muchai254"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--color-text)',
            textDecoration: 'none',
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
          muchai254
        </a>
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>·</span>
      <Link
        to="/how-it-works"
        style={{
          fontSize: 'var(--text-xs)',
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
        How it works
      </Link>
    </footer>
  )
}
