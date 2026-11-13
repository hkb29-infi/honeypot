import { useMemo, useState } from 'react'
import { ActivityChart } from './ActivityChart'
import { DecoyDialog } from './DecoyDialog'
import { Icon } from './Icon'
import { createDemoStats, parseTimestamp, STATS_URL, type Attack } from './stats'
import { useAttackStats } from './useAttackStats'

function formatTime(timestamp: string | Date) {
  const date = typeof timestamp === 'string' ? parseTimestamp(timestamp) : timestamp
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date)
}

export default function App() {
  const [demo, setDemo] = useState(false)
  const [demoStats] = useState(createDemoStats)
  const live = useAttackStats(demo)
  const { attacks, total } = demo ? demoStats : live
  const [selectedAttack, setSelectedAttack] = useState<Attack | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const countries = useMemo(() => new Set(attacks.map((attack) => attack.country)).size, [attacks])
  const decoys = attacks.filter((attack) => attack.decoy_served.trim()).length
  const hasData = demo || live.lastUpdated !== null
  const statusLabel = demo ? 'Sample data' : live.status === 'live' ? 'Live API'
    : live.status === 'loading' ? 'Connecting' : 'Connection lost'

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(STATS_URL)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-ink text-paper">
      <a href="#main" className="sr-only z-50 rounded bg-paprika p-3 text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to dashboard</a>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px] grid-fade" />
      <div className="relative mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-[248px] shrink-0 border-r border-line/80 px-5 py-7 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-paprika/35 bg-paprika/10 text-paprika-soft shadow-glow"><Icon name="shield" size={20} /></div>
            <div><div className="text-sm font-semibold tracking-wide text-paper">HONEYPOT</div><div className="font-mono text-[10px] tracking-[0.22em] text-muted">EDGE DEFENSE</div></div>
          </div>
          <div className="mt-auto rounded-xl border border-line bg-panel/80 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-secondary"><span className={`h-2 w-2 rounded-full ${demo ? 'bg-slate' : live.status === 'live' ? 'bg-pollen' : 'bg-paprika'}`} />{statusLabel}</div>
            <p className="mt-2 text-xs leading-5 text-muted">{demo ? 'These are fictional events for exploring the dashboard.' : 'This console reports telemetry from your security Worker.'}</p>
          </div>
        </aside>

        <main id="main" className="relative min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-paprika/35 bg-paprika/10 text-paprika-soft"><Icon name="shield" size={20} /></div><span className="text-sm font-semibold tracking-wide">HONEYPOT</span></div>
            <div className="hidden text-sm text-muted lg:block">Security console <span className="mx-2 text-subtle">/</span> Overview</div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div role="status" className="flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-2 font-mono text-[11px] text-secondary">
                <span className={`h-1.5 w-1.5 rounded-full ${demo ? 'bg-slate' : live.status === 'live' ? 'bg-pollen' : 'bg-paprika'}`} />{statusLabel}
              </div>
              <button onClick={() => { setDemo((value) => !value); setSelectedAttack(null) }} aria-pressed={demo}
                className="min-h-11 rounded-lg border border-line px-3 py-2 text-xs text-secondary hover:border-paprika/40 hover:text-paprika-soft">{demo ? 'Use live API' : 'View demo'}</button>
              <button onClick={live.refresh} disabled={demo} aria-label="Refresh attack data" title="Refresh attack data"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-secondary hover:border-paprika/40 hover:text-paprika-soft disabled:cursor-not-allowed disabled:opacity-40"><Icon name="refresh" size={16} /></button>
            </div>
          </header>

          {demo && <p className="mt-6 rounded-lg border border-slate/50 bg-slate/15 px-4 py-3 text-sm text-secondary">Demo mode. All events and totals below are fictional. Live polling is paused.</p>}
          {!demo && live.error && <div role="alert" className="mt-6 rounded-lg border border-paprika/25 bg-paprika/5 px-4 py-3 text-sm leading-6 text-pollen">
            <p>{live.error}</p><p className="text-paper/70">{live.lastUpdated ? 'Showing the last successful response. Retrying every 3 seconds.' : 'No live data yet. Configure the Worker connection or select View demo.'}</p>
          </div>}

          <section id="overview" className="mt-8 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="min-w-0 rounded-2xl border border-line bg-panel/75 p-5 shadow-glow sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div><p className="font-mono text-[11px] tracking-wider text-paprika-soft/90">{demo ? 'Sample threat telemetry' : 'Cloudflare threat telemetry'}</p>
                  <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">Honeypot security overview.</h1>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-muted">See the requests your Worker diverted away from your application.</p></div>
                <div className="hidden rounded-xl border border-pollen/25 bg-pollen/10 p-3 text-pollen sm:block"><Icon name="shield" size={22} /></div>
              </div>
              <div className="mt-9">
                <h2 className="text-sm text-secondary">Total Attacks Intercepted</h2>
                <div data-testid="attack-total" className="mt-3 break-all font-mono text-5xl font-medium tracking-[-0.07em] text-pollen sm:text-6xl">{hasData ? (total ?? attacks.length).toLocaleString() : '—'}</div>
                <p className="mt-3 text-xs leading-5 text-muted">{!hasData ? 'Waiting for the first successful stats response.'
                  : total === null ? 'Recent feed count. The API has not supplied an all-time total.' : `${demo ? 'Example' : 'All-time'} total reported by the Worker.`}</p>
              </div>
              <ActivityChart attacks={attacks} now={demo ? parseTimestamp(demoStats.attacks[0].timestamp).getTime() : live.lastUpdated?.getTime() ?? 0} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-line bg-panel/75 p-6"><div className="flex items-center justify-between"><h2 className="text-sm text-secondary">Countries in feed</h2><span className="text-paprika-soft"><Icon name="radar" /></span></div><div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-paper">{hasData ? countries : '—'}</div><p className="mt-2 text-xs text-muted">Distinct country codes in loaded events</p></div>
              <div className="rounded-2xl border border-line bg-panel/75 p-6"><div className="flex items-center justify-between"><h2 className="text-sm text-secondary">Decoy payloads recorded</h2><span className="text-pollen"><Icon name="shield" /></span></div><div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-paper">{hasData ? decoys : '—'}<span className="ml-2 text-sm font-normal text-muted">{hasData ? `of ${attacks.length} events` : ''}</span></div><p className="mt-2 text-xs text-muted">Select an event’s payload to inspect it</p></div>
            </div>
          </section>

          <section id="events" className="mt-8 overflow-hidden rounded-2xl border border-line bg-panel/75">
            <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div><h2 className="text-base font-semibold text-paper">Recent attack stream</h2><p className="mt-1 text-xs text-muted">{attacks.length} loaded events. {demo ? 'Fictional sample data.' : 'Refreshes every 3 seconds.'}</p></div>
              <p className="flex items-center gap-2 font-mono text-[10px] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-paprika" />{demo ? 'Sample timestamps' : live.lastUpdated ? `Last success ${formatTime(live.lastUpdated)}` : 'Awaiting stats'}</p>
            </div>
            <div role="region" aria-label="Recent attacks table" tabIndex={0} className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <caption className="sr-only">Intercepted requests with source IP, country, probed path, detection reason, time, and recorded decoy payload.</caption>
                <thead className="border-b border-line/70 font-mono text-[10px] tracking-wider text-muted"><tr>
                  <th scope="col" className="px-6 py-3 font-normal">Source IP / country</th><th scope="col" className="px-4 py-3 font-normal">Path probed</th><th scope="col" className="px-4 py-3 font-normal">Detection reason</th><th scope="col" className="px-4 py-3 font-normal">Time</th><th scope="col" className="px-6 py-3 text-right font-normal">Decoy</th>
                </tr></thead>
                <tbody className="divide-y divide-line/60">{attacks.map((attack) => (
                  <tr key={attack.id} className="hover:bg-white/[.025]">
                    <td className="px-6 py-4"><div className="max-w-[200px] break-all font-mono text-xs text-paper">{attack.ip}</div><div className="mt-2 flex items-center gap-2 text-[11px] text-muted"><span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">{attack.country}</span><span>{attack.method}</span></div></td>
                    <td className="max-w-[260px] px-4 py-4"><code className="break-all font-mono text-xs text-paprika-soft/90">{attack.path}</code></td>
                    <td className="max-w-[260px] break-words px-4 py-4 text-xs leading-5 text-secondary">{attack.reason}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-[11px] text-muted"><time dateTime={parseTimestamp(attack.timestamp).toISOString()} title={parseTimestamp(attack.timestamp).toLocaleString()}>{formatTime(attack.timestamp)}</time></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setSelectedAttack(attack)} aria-label={`Inspect decoy for ${attack.ip}`} className="min-h-11 whitespace-nowrap rounded-lg border border-pollen/20 bg-pollen/10 px-3 py-2 font-mono text-[10px] text-pollen hover:bg-pollen/20">{attack.decoy_served ? 'View payload' : 'No payload'}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {attacks.length === 0 && <p className="px-6 py-12 text-center text-sm text-muted">{!demo && live.status === 'loading' ? 'Connecting to the stats API…' : hasData ? 'No intercepted requests in this feed yet.' : 'Waiting for a live connection. Select View demo to explore sample events.'}</p>}
          </section>

          <section id="how-it-works" className="mt-8 grid gap-5 pb-8 lg:grid-cols-[1fr_1.15fr]">
            <div className="rounded-2xl border border-paprika/20 bg-paprika/[.045] p-6"><h2 className="flex items-center gap-2 text-sm font-medium text-paprika-soft"><Icon name="book" size={17} />How the trap works</h2>
              <ol className="mt-6 space-y-5 text-sm leading-6 text-secondary">
                <li><span className="mr-3 font-mono text-xs text-paprika-soft/90">01</span><strong className="font-medium text-paper">Your security Worker checks requests</strong> before they reach your application.</li>
                <li><span className="mr-3 font-mono text-xs text-paprika-soft/90">02</span><strong className="font-medium text-paper">Suspicious requests receive a decoy.</strong> Legitimate requests continue to your origin.</li>
                <li><span className="mr-3 font-mono text-xs text-paprika-soft/90">03</span><strong className="font-medium text-paper">This dashboard reads the attack logs.</strong> It reports what the Worker has intercepted.</li>
              </ol>
            </div>
            <div className="min-w-0 rounded-2xl border border-line bg-panel/75 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-medium text-paper">Connect your dashboard</h2>
                <button onClick={() => void copyEndpoint()} className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-secondary hover:border-paprika/40 hover:text-paprika-soft">{copyStatus === 'copied' ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}{copyStatus === 'copied' ? 'Copied' : 'Copy endpoint'}</button>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">Point the dashboard at your honeypot Worker’s stats endpoint. Polling runs automatically while you view live data.</p>
              <div className="mt-5 break-all rounded-lg border border-line bg-ink p-4 font-mono text-xs leading-6"><span className="text-muted">GET </span><span className="text-paprika-soft">{STATS_URL}</span><br /><span className="text-muted">Poll interval </span><span className="text-pollen">3 seconds</span></div>
              {copyStatus === 'error' && <p role="status" className="mt-3 text-xs text-pollen">Clipboard unavailable. Select and copy the endpoint above.</p>}
              <a href="#events" className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-paprika-soft hover:text-paper">View the attack stream <Icon name="arrow" size={14} /></a>
            </div>
          </section>
        </main>
      </div>
      {selectedAttack && <DecoyDialog attack={selectedAttack} onClose={() => setSelectedAttack(null)} />}
    </div>
  )
}
