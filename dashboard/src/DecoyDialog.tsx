import { useEffect, useRef } from 'react'
import type { Attack } from './stats'

export function DecoyDialog({ attack, onClose }: { attack: Attack; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element?.showModal()
    return () => {
      element?.close()
      previousFocus?.focus()
    }
  }, [])
  return (
    <dialog ref={dialog} aria-labelledby="decoy-title" onCancel={onClose}
      className="max-h-[85vh] w-[calc(100%_-_2rem)] max-w-[640px] rounded-2xl border border-line bg-panel p-6 text-paper backdrop:bg-black/75">
      <div className="flex items-center justify-between gap-4">
        <h2 id="decoy-title" className="text-lg font-semibold">Decoy response</h2>
        <button onClick={onClose} className="rounded-lg border border-line px-3 py-2 text-sm hover:border-paprika/50">Close</button>
      </div>
      <p className="mt-3 break-all font-mono text-xs text-paprika-soft">{attack.method} {attack.path}</p>
      <pre className="mt-5 max-h-[55vh] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-ink p-4 font-mono text-xs leading-6 text-secondary">{attack.decoy_served || 'No decoy payload was recorded.'}</pre>
    </dialog>
  )
}
