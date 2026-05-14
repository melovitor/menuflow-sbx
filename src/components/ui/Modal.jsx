import { useEffect } from 'react'

export default function Modal({
  open,
  onClose,
  title,
  children,
  'data-testid': testId,
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      data-testid={testId}
    >
      <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-card p-5">
        {title && (
          <p className="text-[15px] font-medium text-[var(--text)] mb-4">
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
