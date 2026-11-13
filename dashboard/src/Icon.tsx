export function Icon({ name, size = 18 }: { name: 'shield' | 'activity' | 'radar' | 'book' | 'refresh' | 'arrow' | 'copy' | 'check'; size?: number }) {
  const paths = {
    shield: <><path d="M12 3 4.7 6v5.3c0 4.8 3.1 8.2 7.3 9.7 4.2-1.5 7.3-4.9 7.3-9.7V6L12 3Z"/><path d="m8.7 12 2.1 2.1 4.5-4.5"/></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6"/></>,
    radar: <><path d="M12 12 19 5"/><path d="M5.6 18.4a9 9 0 1 1 12.8 0"/><path d="M8.4 15.6a5 5 0 1 1 7.2 0"/><circle cx="12" cy="12" r="1"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 5.5V21M8 7h8M8 11h8"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.6-4L3 10"/><path d="M3 5v5h5M4 13a8 8 0 0 0 14.6 4L21 14"/><path d="M21 19v-5h-5"/></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6"/></>,
    copy: <><rect x="8" y="8" width="10" height="10" rx="1"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
