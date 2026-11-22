import { STATUS_DOT } from '../constants/leads.js'

// Colour reinforces the status, but the label carries the meaning, so the
// table stays readable without relying on colour alone.
export default function StatusLabel({ status }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status] ?? 'bg-muted'}`}
      />
      {status}
    </span>
  )
}
