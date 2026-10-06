/**
 * ISO 4217 minor units. Amounts are stored in these units, so this must not
 * follow Intl, which rounds some currencies (IDR, PKR, HUF) for display only.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG',
  'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
])
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'])

export function currencyFractionDigits(currency: string): number {
  const code = currency.toUpperCase()
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3
  return 2
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
