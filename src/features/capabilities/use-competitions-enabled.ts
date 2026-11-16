import { useEffect, useSyncExternalStore } from 'react'
import { getCapabilities, type Capabilities } from '@/api/capabilities'

/**
 * The competitions policy this build understands. A response with any other
 * version is treated as "off": a newer server may have rules this site does
 * not know how to show.
 */
const KNOWN_POLICY_VERSION = 1

/** Re-ask the server this often, so a switch-off reaches open tabs. */
const REFRESH_MS = 5 * 60 * 1000

let enabled = false
let loaded = false
let inflight: Promise<void> | null = null
let lastFetch = 0
const listeners = new Set<() => void>()

/** Competitions show only on an explicit, recognised "enabled". */
export function competitionsAllowed(caps: Capabilities | null | undefined): boolean {
  const c = caps?.competitions
  return c?.enabled === true && c.policyVersion === KNOWN_POLICY_VERSION
}

function set(next: boolean) {
  loaded = true
  enabled = next
  listeners.forEach((l) => l())
}

function refresh(): Promise<void> {
  if (inflight) return inflight
  if (loaded && Date.now() - lastFetch < REFRESH_MS) return Promise.resolve()
  lastFetch = Date.now()
  inflight = getCapabilities()
    .then((caps) => set(competitionsAllowed(caps)))
    // Unreachable or unreadable: keep competitions hidden.
    .catch(() => set(false))
    .finally(() => {
      inflight = null
    })
  return inflight
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Whether competitions may be shown. False until the server says otherwise,
 * so nothing about competitions flashes up while the answer is on its way.
 */
export function useCompetitionsEnabled(): boolean {
  useEffect(() => {
    void refresh()
  }, [])
  return useSyncExternalStore(subscribe, () => enabled, () => false)
}

/** Like useCompetitionsEnabled, plus whether the server has answered yet. */
export function useCompetitionsStatus(): { enabled: boolean; loaded: boolean } {
  useEffect(() => {
    void refresh()
  }, [])
  const on = useSyncExternalStore(subscribe, () => enabled, () => false)
  const ready = useSyncExternalStore(subscribe, () => loaded, () => false)
  return { enabled: on, loaded: ready }
}
