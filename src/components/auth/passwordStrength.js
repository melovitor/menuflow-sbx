// Heurística simples de força de senha → 0..3 ( -1 = vazio ).

export function passwordScore(pw = '') {
  if (!pw) return -1
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 3)
}

export const STRENGTH_LABELS = ['Fraca', 'Razoável', 'Boa', 'Forte']
export const STRENGTH_VARS = [
  'var(--red-text)',
  'var(--amber-text)',
  'var(--accent)',
  'var(--green-text)',
]
