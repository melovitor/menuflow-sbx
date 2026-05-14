const variants = {
  open: 'bg-[var(--green-bg)] text-[var(--green-text)] border border-[var(--green-border)]',
  closed: 'bg-[var(--bg-tertiary)] text-[var(--text-3)]',
  new: 'bg-[var(--red-bg)] text-[var(--red-text)] border border-[var(--red-border)]',
  preparing: 'bg-[var(--amber-bg)] text-[var(--amber-text)] border border-[var(--amber-border)]',
  ready: 'bg-[var(--green-bg)] text-[var(--green-text)] border border-[var(--green-border)]',
  accent: 'bg-[var(--accent-light)] text-[var(--accent-text)] border border-accent',
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-2)]',
}

export default function Badge({ children, variant = 'default', className = '', 'data-testid': testId }) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center px-[9px] py-[3px] rounded-pill text-[11px] font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
