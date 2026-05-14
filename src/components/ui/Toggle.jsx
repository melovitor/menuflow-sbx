export default function Toggle({ checked, onChange, 'data-testid': testId }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center w-[38px] h-[22px] rounded-[20px] transition-colors duration-200 outline-none
        ${checked ? 'bg-accent' : 'bg-[var(--border-strong)]'}`}
    >
      <span
        className={`absolute w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}
      />
    </button>
  )
}
