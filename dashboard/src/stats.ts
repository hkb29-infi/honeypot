export type Attack = {
  id: number | string
  timestamp: string
  ip: string
  country: string
  method: string
  path: string
  reason: string
  decoy_served: string
}

export type Stats = { attacks: Attack[]; total: number | null }

export const STATS_URL = import.meta.env.VITE_STATS_URL || '/_aegis/stats'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseTimestamp(value: string): Date {
  // D1's CURRENT_TIMESTAMP is UTC but omits the timezone suffix.
  return new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(' ', 'T') + 'Z'
    : value)
}

export function parseStats(payload: unknown): Stats {
  const rows = Array.isArray(payload) ? payload : isRecord(payload) ? payload.intercepted : null
  if (!Array.isArray(rows)) throw new Error('The stats API must return an attack array or { intercepted: [...] }.')

  const strings = ['timestamp', 'ip', 'country', 'method', 'path', 'reason', 'decoy_served'] as const
  const attacks: Attack[] = rows.map((row: unknown) => {
    if (!isRecord(row) || !(typeof row.id === 'string' || (typeof row.id === 'number' && Number.isFinite(row.id)))
      || !strings.every((key) => typeof row[key] === 'string')
      || Number.isNaN(parseTimestamp(row.timestamp as string).getTime())) {
      throw new Error('An attack record is missing required fields or has an invalid timestamp.')
    }
    return row as Attack
  })

  const ids = new Set(attacks.map((attack) => String(attack.id)))
  if (ids.size !== attacks.length) throw new Error('The stats API returned duplicate attack IDs.')

  let total: number | null = null
  if (isRecord(payload)) {
    const candidate = payload.total ?? payload.count
    if (candidate !== undefined) {
      if (typeof candidate !== 'number' || !Number.isSafeInteger(candidate) || candidate < attacks.length) {
        throw new Error('The stats API returned an invalid total.')
      }
      total = candidate
    }
  }

  return { attacks: attacks.sort((a, b) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime()), total }
}

export function createDemoStats(): Stats {
  const probes = [
    ['192.0.2.42', 'DE', 'GET', '/admin/config', 'Probed restricted path'],
    ['198.51.100.8', 'NL', 'POST', '/api/v1/users/export', 'Automated user-agent; rate anomaly'],
    ['203.0.113.17', 'US', 'GET', '/.env', 'Canary path probe'],
    ['192.0.2.3', 'SG', 'GET', '/search?q=union+select', 'Injection signature'],
    ['198.51.100.104', 'US', 'POST', '/api/v1/debug', 'Automated user-agent'],
    ['203.0.113.19', 'PL', 'GET', '/wp-login.php', 'Probed restricted path'],
  ]
  return {
    total: 12482,
    attacks: probes.map(([ip, country, method, path, reason], index) => ({
      id: `sample-${index}`,
      timestamp: new Date(Date.now() - index * 56 * 60 * 1000).toISOString(),
      ip, country, method, path, reason,
      decoy_served: JSON.stringify({ status: 'success', records: [{ id: `demo-${index}`, name: 'Example record' }] }, null, 2),
    })),
  }
}
