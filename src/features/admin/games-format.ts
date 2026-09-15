import {
  Car,
  CircleDot,
  Gamepad2,
  Grid3x3,
  Layers,
  Puzzle,
  Rocket,
  Spline,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import type { CompetitionStatus } from '@/api/competitions'

type GameLook = { icon: LucideIcon; from: string; to: string }

/** The same colours the mobile app uses for each game. */
const LOOKS: Record<string, GameLook> = {
  '2048': { icon: Grid3x3, from: '#FF5F6D', to: '#FFC371' },
  snake: { icon: Spline, from: '#0B8F72', to: '#38EF7D' },
  'slide-puzzle': { icon: Puzzle, from: '#4A00E0', to: '#FF6FD8' },
  basketball: { icon: CircleDot, from: '#E8590C', to: '#FFB347' },
  'stack-tower': { icon: Layers, from: '#2C5364', to: '#00C9A7' },
  archery: { icon: Target, from: '#2E8B57', to: '#A8E063' },
  cricket: { icon: Trophy, from: '#1B7A3A', to: '#8BD450' },
  'block-blast': { icon: Grid3x3, from: '#4338CA', to: '#22D3EE' },
  'sling-shot': { icon: Rocket, from: '#D76D77', to: '#FFAF7B' },
  'hill-rider': { icon: Car, from: '#3282B8', to: '#F9D56E' },
}

export function gameLook(slug: string): GameLook {
  return LOOKS[slug] ?? { icon: Gamepad2, from: '#6D28D9', to: '#14B8B8' }
}

export function gameGradient(slug: string): string {
  const look = gameLook(slug)
  return `linear-gradient(135deg, ${look.from}, ${look.to})`
}

export function formatScore(value: number | undefined): string {
  return value === undefined ? '—' : value.toLocaleString()
}

/** Server-measured play time, e.g. "42.6s" or "3:05". */
export function formatPlayTime(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${Math.floor(ms / 60_000)}:${String(seconds).padStart(2, '0')}`
}

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info'

export function scoreStatusTone(status: string): Tone {
  if (status === 'accepted') return 'good'
  if (status === 'rejected') return 'bad'
  if (status === 'manual_review' || status === 'pending') return 'warn'
  return 'neutral'
}

export function scoreStatusLabel(status: string): string {
  if (status === 'manual_review') return 'Under review'
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

export const competitionStatusTone: Record<CompetitionStatus, Tone> = {
  draft: 'neutral',
  scheduled: 'info',
  live: 'good',
  closed: 'warn',
  frozen: 'warn',
  finalised: 'good',
  cancelled: 'bad',
}

export function competitionStatusLabel(status: CompetitionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
