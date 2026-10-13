import {
  Frown,
  Meh,
  PartyPopper,
  Smile,
  SmilePlus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/** How the rating stage answers a score: a face, a line, and a nudge. */
export type ReviewMood = {
  icon: LucideIcon
  headline: string
  nudge: string
}

const MOODS: ReviewMood[] = [
  {
    icon: Sparkles,
    headline: 'Tap a star to begin',
    nudge: 'Your honest take helps the next person choosing a gift.',
  },
  {
    icon: Frown,
    headline: 'Not what I hoped',
    nudge: 'We are sorry it missed. Tell us what went wrong so it can be put right.',
  },
  {
    icon: Meh,
    headline: 'It was okay',
    nudge: 'A few things could have been better. What were they?',
  },
  {
    icon: Smile,
    headline: 'Good, with niggles',
    nudge: 'Nearly there. What would have made it great?',
  },
  {
    icon: SmilePlus,
    headline: 'Really pleased',
    nudge: 'Lovely. What made it special?',
  },
  {
    icon: PartyPopper,
    headline: 'Absolutely love it',
    nudge: 'Wonderful! Tell people why it was such a hit.',
  },
]

export function reviewMood(score: number): ReviewMood {
  return MOODS[Math.max(0, Math.min(5, Math.round(score)))]
}

const GOOD = [
  'Beautifully wrapped',
  'Arrived on time',
  'Exactly as pictured',
  'Great value',
  'Made them smile',
  'Lovely seller',
]

const BAD = [
  'Arrived late',
  'Not as pictured',
  'Damaged',
  'Poorly packaged',
  'Hard to reach the seller',
]

/** Quick things to say, suited to how the score leans. */
export function reviewHighlights(score: number): string[] {
  if (score >= 4) return GOOD
  if (score > 0 && score <= 2) return BAD
  if (score === 3) return [...GOOD.slice(0, 3), ...BAD.slice(0, 2)]
  return GOOD
}
