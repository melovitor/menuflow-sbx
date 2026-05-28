// Barra de 4 segmentos + rótulo. Só aparece quando há senha digitada.

import { passwordScore, STRENGTH_LABELS, STRENGTH_VARS } from './passwordStrength'

export default function PasswordStrength({ value = '', 'data-testid': testId }) {
  const level = passwordScore(value)
  if (level < 0) return null

  const color = STRENGTH_VARS[level]

  return (
    <div className="flex items-center gap-2.5 mt-0.5" data-testid={testId}>
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="flex-1 h-[3px] rounded-full transition-colors duration-200"
            style={{ background: i <= level ? color : 'var(--bg-tertiary)' }}
          />
        ))}
      </div>
      <span className="font-mono-ui text-[10px] tracking-[0.05em]" style={{ color }}>
        {STRENGTH_LABELS[level]}
      </span>
    </div>
  )
}
