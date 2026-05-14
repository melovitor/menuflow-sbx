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
    'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  const sizes = {
    sm: 'px-3 py-2 text-[13px] rounded-[10px]',
    md: 'px-4 py-3 text-[14px] rounded-[10px]',
    lg: 'px-5 py-[14px] text-[14px] rounded-[12px]',
  }

  const variants = {
    primary:
      'bg-accent text-white border-0 hover:bg-accent/90',
    secondary:
      'bg-[var(--bg-primary)] text-[var(--text-2)] border border-[var(--border-strong)] hover:border-[var(--accent)]',
    ghost:
      'bg-transparent text-accent border border-[var(--border)] hover:border-[var(--accent)]',
    destructive:
      'bg-red-500 text-white border-0 hover:bg-red-600',
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
