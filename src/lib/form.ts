export function toDateInputValue(value?: string | null): string {
  if (!value) return ''
  const iso = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : ''
}

export function optionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}
