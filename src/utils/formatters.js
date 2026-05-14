export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export const formatPhone = (value) => {
  const c = value.replace(/\D/g, '')
  return c.length === 11
    ? c.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : c.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const formatDate = (date, timezone) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(date))

export const generateSlug = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

export const generateAccessCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString()

export const formatDuration = (ms) => {
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
