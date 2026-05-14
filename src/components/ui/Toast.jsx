import { useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'

let toastId = 0
const listeners = []

export const toast = {
  show: (message, type = 'default', duration = 3500) => {
    const id = ++toastId
    listeners.forEach((fn) => fn({ id, message, type, duration }))
  },
  success: (msg, dur) => toast.show(msg, 'success', dur),
  error: (msg, dur) => toast.show(msg, 'error', dur),
  info: (msg, dur) => toast.show(msg, 'info', dur),
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (t) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id))
      }, t.duration)
    }
    listeners.push(handler)
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1) }
  }, [])

  const typeClass = {
    default: 'bg-[var(--bg-primary)] border-[var(--border)]',
    success: 'bg-[var(--green-bg)] border-[var(--green-border)]',
    error: 'bg-[var(--red-bg)] border-[var(--red-border)]',
    info: 'bg-[var(--accent-light)] border-accent',
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid="toast"
          className={`flex items-center gap-3 px-4 py-3 rounded-section border text-[13px] text-[var(--text)] shadow-lg ${typeClass[t.type] || typeClass.default}`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-[var(--text-3)] hover:text-[var(--text)]"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
