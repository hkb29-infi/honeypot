import { parseTimestamp, type Attack } from './stats'

export function ActivityChart({ attacks, now }: { attacks: Attack[]; now: number }) {
  const counts = Array<number>(24).fill(0)
  for (const attack of attacks) {
    const hoursAgo = Math.floor((now - parseTimestamp(attack.timestamp).getTime()) / 3600000)
    if (hoursAgo >= 0 && hoursAgo < 24) counts[23 - hoursAgo]++
  }
  const maximum = Math.max(1, ...counts)
  const description = `${counts.reduce((sum, count) => sum + count, 0)} attacks from the loaded feed in the past 24 hours, grouped by hour.`
  return (
    <figure className="mt-8" aria-label="Attacks in the loaded feed over 24 hours">
      <svg role="img" aria-label={description} viewBox="0 0 480 64" className="h-16 w-full" preserveAspectRatio="none">
        {counts.map((count, index) => (
          <rect key={index} x={index * 20} y={64 - Math.max(2, count / maximum * 62)}
            width="14" height={Math.max(2, count / maximum * 62)} rx="2"
            fill={count ? '#62e6e0' : '#202a3a'} opacity={count ? .85 : .7}>
            <title>{23 - index} hours ago: {count} attacks</title>
          </rect>
        ))}
      </svg>
      <figcaption className="mt-3 flex justify-between font-mono text-xs text-slate-400">
        <span>24 hours ago</span><span>Loaded feed only</span><span>Now</span>
      </figcaption>
    </figure>
  )
}
