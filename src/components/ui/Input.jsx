export default function Input({
  label,
  hint,
  error,
  maxLength,
  value = '',
  'data-testid': testId,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      {label && (
        <label className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[.06em]">
          {label}
        </label>
      )}
      <input
        value={value}
        maxLength={maxLength}
        data-testid={testId}
        className={`h-10 px-3 py-[10px] text-[13px] text-[var(--text)]
          bg-[var(--bg-primary)] border rounded-input outline-none transition-colors duration-150
          border-[var(--border-strong)]
          focus:border-accent
          placeholder:text-[var(--text-3)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500' : ''}
          ${className}`}
        {...props}
      />
      {(hint || maxLength) && !error && (
        <span className="text-[10px] text-[var(--text-3)] flex justify-between">
          <span>{hint}</span>
          {maxLength && (
            <span>{value.length}/{maxLength}</span>
          )}
        </span>
      )}
      {error && (
        <span className="text-[10px] text-red-500">{error}</span>
      )}
    </div>
  )
}
