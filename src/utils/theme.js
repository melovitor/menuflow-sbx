export const getInitialTheme = () => {
  return localStorage.getItem('theme') || 'dark'
}

export const applyTheme = (theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

export const toggleTheme = () => {
  const current = localStorage.getItem('theme') || 'dark'
  const next = current === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
