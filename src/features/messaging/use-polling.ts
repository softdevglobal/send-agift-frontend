import { useEffect, useRef } from 'react'

/**
 * Runs `task` now, then every `intervalMs` while the tab is visible, and again
 * as soon as the tab comes back into view. `null` stops polling; a new `key`
 * restarts it immediately (switching threads shouldn't wait out the interval).
 *
 * The messaging API has no push channel, so this is how new messages arrive.
 */
export function usePolling(
  task: () => Promise<unknown>,
  intervalMs: number | null,
  key?: string | null,
) {
  const taskRef = useRef(task)

  useEffect(() => {
    taskRef.current = task
  })

  useEffect(() => {
    if (intervalMs === null) return
    let running = false

    const run = () => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      taskRef
        .current()
        .catch(() => undefined)
        .finally(() => {
          running = false
        })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run()
    }

    run()
    const timer = window.setInterval(run, intervalMs)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs, key])
}
