import { api } from '@/lib/api'

/** A player as the superadmin sees them — full name and email, not the public "Sarah M.". */
export type AdminPlayer = {
  kind: 'customer' | 'guest'
  customer_id?: string
  name: string
  email?: string
  country_name?: string
}

export type AdminGameSummary = {
  slug: string
  name: string
  game_type: string
  status: string
  version: string
  /** False when the backend has no replay engine for this game yet. */
  playable: boolean
  plays: number
  scores: number
  players: number
  under_review: number
  rejected: number
  competitions: number
  top_score?: number
  top_player?: AdminPlayer
  last_played_at?: string
}

export type AdminLeaderboardRow = {
  rank: number
  player: AdminPlayer
  best_score: number
  duration_ms: number
  plays: number
  achieved_at: string
  last_played_at: string
}

export type AdminGameLeaderboard = {
  game: AdminGameSummary
  entries: AdminLeaderboardRow[]
}

export type ScoreStatus = 'accepted' | 'rejected' | 'manual_review'

export type AdminGameScore = {
  session_id: string
  player: AdminPlayer
  score: number
  client_score?: number
  moves_count: number
  duration_ms: number
  validation_status: ScoreStatus
  review_reason?: string
  stats: Record<string, number>
  created_at: string
}

export type ReviewInput = {
  status: 'accepted' | 'rejected'
  reason?: string
}

export async function listAdminGames() {
  const res = await api<{ items: AdminGameSummary[] | null }>('/admin/games')
  return res.items ?? []
}

export async function getAdminGameLeaderboard(slug: string) {
  const res = await api<AdminGameLeaderboard>(
    `/admin/games/${encodeURIComponent(slug)}/leaderboard`,
  )
  return { ...res, entries: res.entries ?? [] }
}

export async function listAdminGameScores(slug: string, status?: ScoreStatus) {
  const query = status ? `?status=${status}` : ''
  const res = await api<{ items: AdminGameScore[] | null }>(
    `/admin/games/${encodeURIComponent(slug)}/scores${query}`,
  )
  return res.items ?? []
}

export function reviewGameScore(sessionId: string, body: ReviewInput) {
  return api<null>(`/admin/games/scores/${sessionId}/review`, {
    method: 'POST',
    body,
  })
}
