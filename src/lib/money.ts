const ZERO_DECIMAL_CURRENCIES = new Set(['JPY'])

function currencyFractionDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2
}

export function majorToMinor(major: number, currency: string): number {
  const digits = currencyFractionDigits(currency)
  return Math.round(major * 10 ** digits)
}

export function minorToMajor(minor: number, currency: string): number {
  const digits = currencyFractionDigits(currency)
  return minor / 10 ** digits
}

export function formatPriceAmount(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase()
  const digits = currencyFractionDigits(code)
  const value = minorToMajor(amount, code)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    return `${value.toFixed(digits)} ${code}`
  }
}
