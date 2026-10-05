import { useEffect, useState } from 'react'

import { apiUrl } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'

/** Money in the round's currency, or plain cents when it has none yet. */
export function prizeMoney(cents: number | undefined | null, currency: string | undefined): string {
  if (cents === undefined || cents === null) return '-'
  return currency ? formatPriceAmount(cents, currency) : `${cents}¢`
}

export type LivePrize = { current_prize_cents: number; eligible_play_count: number; version: number }

/**
 * Follows the round's live prize stream (Server-Sent Events). The stream is a
 * display optimisation: the page still reloads the round after every action.
 */
export function useLivePrize(id: string, enabled: boolean): LivePrize | null {
  const [live, setLive] = useState<LivePrize | null>(null)
  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return
    const source = new EventSource(apiUrl(`/competitions/${id}/events`))
    const onEvent = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as Partial<LivePrize>
        if (typeof data.current_prize_cents !== 'number') return
        setLive((prev) =>
          prev && (data.version ?? 0) < prev.version
            ? prev
            : {
                current_prize_cents: data.current_prize_cents!,
                eligible_play_count: data.eligible_play_count ?? prev?.eligible_play_count ?? 0,
                version: data.version ?? 0,
              },
        )
      } catch {
        // A malformed event is ignored; the next reload corrects the display.
      }
    }
    for (const name of ['SNAPSHOT', 'PRIZE_UPDATED', 'STATUS_CHANGED']) {
      source.addEventListener(name, onEvent as EventListener)
    }
    return () => source.close()
  }, [id, enabled])
  return live
}

