export default function LgpdFooter({ className = '' }) {
  return (
    <footer className={`py-5 px-5 text-center ${className}`}>
      <p className="text-[11px] text-[var(--text-3)]">
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--text-2)] underline underline-offset-2 transition-colors"
        >
          Privacidade
        </a>
        {' · '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--text-2)] underline underline-offset-2 transition-colors"
        >
          Termos de Uso
        </a>
      </p>
    </footer>
  )
}
