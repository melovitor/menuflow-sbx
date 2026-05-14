export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <span
      className={`inline-block border-2 border-[var(--border-strong)] border-t-accent rounded-full animate-spin ${sizes[size]} ${className}`}
    />
  )
}
