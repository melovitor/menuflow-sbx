// Noir Veludo — botão premium. Primário = latão preenchido com glow sutil.
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  'data-testid': testId,
  className = '',
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold tracking-ui transition-all duration-150 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'

  const sizes = {
    sm: 'px-3.5 py-2 text-[13px] rounded-button',
    md: 'px-4 py-2.5 text-[14px] rounded-button',
    lg: 'px-5 py-3 text-[15px] rounded-button',
  }

  const variants = {
    primary:
      'bg-accent text-accent-contrast border-0 glow-brass glow-brass-hover',
    secondary:
      'bg-transparent text-[var(--text)] border border-[var(--border-strong)] hover:border-accent',
    ghost:
      'bg-transparent text-[var(--accent-text)] border border-[var(--border)] hover:border-accent',
    destructive:
      'bg-[var(--red-text)] text-white border-0 hover:opacity-90',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid={testId}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
