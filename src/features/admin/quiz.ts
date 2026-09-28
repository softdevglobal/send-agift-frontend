import type { QuizQuestion } from '@/api/competitions'

export function emptyQuestion(): QuizQuestion {
  return { prompt: '', options: ['', ''], correct_index: 0, time_limit_seconds: 20 }
}
