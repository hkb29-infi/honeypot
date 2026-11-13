import { useCallback, useEffect, useState } from 'react'
import { parseStats, STATS_URL, type Stats } from './stats'

export function useAttackStats(demo: boolean) {
  const [stats, setStats] = useState<Stats>({ attacks: [], total: null })
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), [])

  useEffect(() => {
    if (demo) return
    let active = true
    let pending: AbortController | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined

    async function loadStats() {
      // Keep at most one request in flight, even if the Worker is slow.
      if (pending) return
      const controller = new AbortController()
      pending = controller
      timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch(STATS_URL, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`Stats API returned HTTP ${response.status}. Check the Worker connection.`)
        const nextStats = parseStats(await response.json())
        if (!active) return
        setStats(nextStats)
        setStatus('live')
        setError(null)
        setLastUpdated(new Date())
      } catch (cause: unknown) {
        if (!active) return
        setStatus('error')
        setError(controller.signal.aborted ? 'The stats API timed out. Retrying automatically.'
          : cause instanceof Error ? cause.message : 'Could not reach the stats API.')
      } finally {
        clearTimeout(timeout)
        pending = null
      }
    }

    void loadStats()
    const interval = setInterval(() => void loadStats(), 3000)
    return () => {
      active = false
      clearInterval(interval)
      clearTimeout(timeout)
      pending?.abort()
    }
  }, [demo, refreshKey])

  return { ...stats, status, error, lastUpdated, refresh }
}
