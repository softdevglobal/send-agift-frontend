import { ApiError } from '@/lib/api'

/** What went wrong with a one-time code, in terms a person can act on. */
export type CodeProblem = {
  kind: 'wait' | 'daily_limit' | 'locked' | 'wrong' | 'expired' | 'invalid' | 'other'
  title: string
  body: string
  /** For "wait": how long until another code can be asked for. */
  seconds?: number
}

const WAIT_SECONDS = 60

/**
 * Turns the server's terse code errors into friendly copy. The server's own
 * message is matched, not shown: "wait a minute before asking for another
 * code" says what, but not what to do next.
 */
export function describeCodeProblem(err: unknown, fallback: string): CodeProblem {
  const message = err instanceof Error ? err.message : ''
  const status = err instanceof ApiError ? err.status : 0
  const m = message.toLowerCase()

  if (/wait a minute|before asking for another/.test(m)) {
    return {
      kind: 'wait',
      title: 'Hold on, a code is already on its way',
      body: 'We sent one a moment ago. Check your inbox (and spam folder), or ask for a fresh one when the timer runs out.',
      seconds: WAIT_SECONDS,
    }
  }
  if (/too many codes/.test(m)) {
    return {
      kind: 'daily_limit',
      title: "That's all the codes for today",
      body: 'You have reached the daily limit for this address. Try again tomorrow, or sign in with your password instead.',
    }
  }
  if (/too many wrong/.test(m)) {
    return {
      kind: 'locked',
      title: "Let's take a breather",
      body: 'A few codes did not match, so we paused this address to keep your account safe. Try again tomorrow or contact support.',
    }
  }
  if (/expired/.test(m)) {
    return {
      kind: 'expired',
      title: 'That code has run out',
      body: 'Codes only last 5 minutes. Send a fresh one and enter it straight away.',
    }
  }
  if (/not right|did not match|incorrect/.test(m) || status === 422) {
    return {
      kind: 'wrong',
      title: "That code didn't match",
      body: 'Double-check the 6 digits, or ask for a new code.',
    }
  }
  if (/valid (phone|email)|choose phone or email/.test(m)) {
    return { kind: 'invalid', title: 'Check the details', body: message }
  }
  return { kind: 'other', title: 'Something went sideways', body: message || fallback }
}
