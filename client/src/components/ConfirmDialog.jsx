import { useEffect, useRef } from 'react'

// Deleting is the one irreversible action in the app, so the dialog is the only
// dark surface in an otherwise light interface: it reads as a deliberate stop
// rather than another form. Cancel takes focus, so an accidental Enter or Space
// cannot delete anything.
export default function ConfirmDialog({ lead, busy, onCancel, onConfirm }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-6" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-[#2a1d15]/55"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="animate-fade-up relative w-full max-w-sm border border-[#4a3220] bg-[#2a1d15] text-canvas"
      >
        <div aria-hidden="true" className="h-0.5 w-full bg-danger" />

        <div className="px-8 py-7">
          <h2 id="confirm-title" className="font-display text-base font-black tracking-[0.02em]">
            Delete {lead.name}?
          </h2>

          <p id="confirm-body" className="mt-3 font-mono text-xs text-canvas/70">
            Are you sure? This action cannot be undone.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="cursor-pointer border-2 border-canvas/35 px-6 py-3 font-display text-[11px] font-bold tracking-[0.22em] text-canvas uppercase transition-colors hover:border-canvas focus-visible:ring-2 focus-visible:ring-canvas focus-visible:outline-none"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="cursor-pointer border-2 border-danger bg-danger px-6 py-3 font-display text-[11px] font-bold tracking-[0.22em] text-canvas uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-canvas focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? 'Deleting' : 'Delete lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
