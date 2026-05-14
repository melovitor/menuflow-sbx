const SESSION_DURATION_HOURS = 8
export const QUANTITY_ALERT_THRESHOLD = 10

export const saveCustomerSession = (businessSlug, customer) => {
  const session = {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    businessSlug,
    sessionStart: new Date().toISOString(),
  }
  localStorage.setItem(`session_${businessSlug}`, JSON.stringify(session))
  localStorage.setItem(`phone_${businessSlug}`, customer.phone)
}

export const getCustomerSession = (businessSlug) => {
  const raw = localStorage.getItem(`session_${businessSlug}`)
  if (!raw) return null
  const session = JSON.parse(raw)
  const hoursElapsed =
    (new Date() - new Date(session.sessionStart)) / (1000 * 60 * 60)
  if (hoursElapsed > SESSION_DURATION_HOURS) {
    localStorage.removeItem(`session_${businessSlug}`)
    return null
  }
  return session
}

export const getSavedPhone = (businessSlug) =>
  localStorage.getItem(`phone_${businessSlug}`)

export const clearCustomerSession = (businessSlug) => {
  localStorage.removeItem(`session_${businessSlug}`)
}
