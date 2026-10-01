/** 1234 → "1,234". */
export function formatPoints(value: number) {
  return new Intl.NumberFormat().format(value)
}
