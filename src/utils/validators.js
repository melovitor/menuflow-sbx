export const isValidPhone = (phone) =>
  /^\(\d{2}\) \d{4,5}-\d{4}$/.test(phone)

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const isValidCep = (cep) =>
  /^\d{5}-?\d{3}$/.test(cep)

export const isValidAccessCode = (code) =>
  /^\d{6}$/.test(code)

export const truncate = (str, max) =>
  str.length > max ? str.slice(0, max) : str
