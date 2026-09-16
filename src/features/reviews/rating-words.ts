/**
 * The word shown beside a score while picking.
 *
 * Kept out of the component file so that module exports components only —
 * React Fast Refresh gives up on a file that mixes the two.
 */
const RATING_WORDS = [
  'Tap a star',
  'Not what I hoped',
  'It was okay',
  'Good, with niggles',
  'Really pleased',
  'Absolutely love it',
] as const

export function ratingWord(value: number): string {
  return RATING_WORDS[Math.max(0, Math.min(5, Math.round(value)))]
}
