// Campo de texto/e-mail com label mono uppercase e anel de foco em latão.

export default function TextInput({
  label,
  type = 'text',
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoComplete,
  inputMode,
  error = false,
  'data-testid': testId,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="font-mono-ui text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-2)]">
          {label}
        </label>
      )}
      <div
        className={`flex items-center h-11 rounded-input bg-[var(--bg-primary)] border transition-all duration-150 ring-brass
          ${error ? 'border-[var(--red-text)]' : 'border-[var(--border-strong)]'}`}
      >
        <input
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          data-testid={testId}
          className="w-full h-full bg-transparent outline-none border-0 px-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--text-3)]"
        />
      </div>
    </div>
  )
}
