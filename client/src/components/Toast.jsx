import { useEffect } from 'react'

export default function Toast({ message, tone = 'ok', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-toast-in fixed bottom-8 left-1/2 z-50 -translate-x-1/2 border border-line bg-surface px-5 py-3"
    >
      <span
        className={`font-mono text-[11px] tracking-[0.18em] uppercase ${
          tone === 'error' ? 'text-danger' : 'text-ink'
        }`}
      >
        {message}
      </span>
    </div>
  )
}
