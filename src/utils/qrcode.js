const APP_URL = import.meta.env.VITE_APP_URL

export const getTableQrUrl = (businessSlug, tableNumber) =>
  `${APP_URL}/order/${businessSlug}/table/${tableNumber}`

export const getCounterQrUrl = (businessSlug) =>
  `${APP_URL}/order/${businessSlug}/counter`
