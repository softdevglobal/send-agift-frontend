const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Products seeded from the local demo catalog use short ids ('1', '2', …).
 * Only API-backed records carry a real UUID, and only those can be sent to
 * endpoints that resolve them server-side.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
