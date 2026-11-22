import { LEAD_STATUSES } from '../constants/leads.js'

const ITEMS = [{ key: 'All', label: 'Total' }, ...LEAD_STATUSES.map((status) => ({ key: status, label: status }))]

// Ruled strip rather than boxes, and every cell is also the status filter.
export default function StatusCounts({ stats, active, loading, onSelect }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line border-y border-line sm:grid-cols-5 sm:divide-y-0">
      {ITEMS.map(({ key, label }) => {
        const value = key === 'All' ? stats?.total : stats?.byStatus?.[key]
        const isActive = active === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
            className={`flex cursor-pointer flex-col gap-1 px-4 py-5 text-left transition-colors hover:bg-[#f5efe4] sm:px-6 ${
              isActive ? 'bg-[#f5efe4]' : ''
            }`}
          >
            <span className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase">
              {label}
            </span>
            <span
              className={`font-display text-xl font-black tabular-nums sm:text-2xl ${
                isActive ? 'text-brand' : 'text-ink'
              }`}
            >
              {loading ? '–' : (value ?? 0)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
