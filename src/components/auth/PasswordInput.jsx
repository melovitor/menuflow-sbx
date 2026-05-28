// Campo de senha com toggle de visibilidade e anel de foco em latão.

import { useState } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

export default function PasswordInput({
  label,
  value,
  onChange,
  onKeyDown,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  error = false,
  'data-testid': testId,
  'data-testid-toggle': toggleTestId,
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-mono-ui text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-2)]">
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center h-11 rounded-input bg-[var(--bg-primary)] border transition-all duration-150 ring-brass
          ${error ? 'border-[var(--red-text)]' : 'border-[var(--border-strong)]'}`}
      >
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          data-testid={testId}
          className="w-full h-full bg-transparent outline-none border-0 pl-3.5 pr-11 text-[14px] text-[var(--text)] placeholder:text-[var(--text-3)] tracking-[0.02em]"
        />
        <button
          type="button"
          tabIndex={-1}
          data-testid={toggleTestId}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
        >
          {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </button>
      </div>
    </div>
  )
}
