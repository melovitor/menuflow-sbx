const ua = navigator.userAgent

const getVersion = (regex) => {
  const m = ua.match(regex)
  return m ? parseFloat(m[1]) : null
}

export const isBrowserCompatible = () => {
  // Samsung Internet
  const samsungVersion = getVersion(/SamsungBrowser\/([\d.]+)/)
  if (samsungVersion !== null) return samsungVersion >= 14

  // Safari (must check before Chrome since Chrome UA also contains "Safari")
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua)
  if (isSafari) {
    const safariVersion = getVersion(/Version\/([\d.]+)/)
    if (safariVersion !== null) return safariVersion >= 16.4
  }

  // Chrome (includes Chromium-based: Edge, Opera, Brave — all acceptable)
  const chromeVersion = getVersion(/Chrome\/([\d.]+)/)
  if (chromeVersion !== null) return chromeVersion >= 90

  // Unknown browser — allow through
  return true
}
