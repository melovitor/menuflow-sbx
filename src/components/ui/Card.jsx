export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  'data-testid': testId,
}) {
  const paddings = {
    sm: 'p-3',
    md: 'p-[14px]',
    lg: 'p-4',
  }

  const variants = {
    default: 'bg-[var(--bg-primary)] border border-[var(--border)]',
    accent: 'bg-[var(--accent-light)] border border-accent',
    green: 'bg-[var(--green-bg)] border border-[var(--green-border)]',
    amber: 'bg-[var(--amber-bg)] border border-[var(--amber-border)]',
    red: 'bg-[var(--red-bg)] border border-[var(--red-border)]',
    dashed: 'bg-[var(--bg-primary)] border border-dashed border-[var(--border-strong)]',
  }

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`rounded-card ${paddings[padding]} ${variants[variant]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
