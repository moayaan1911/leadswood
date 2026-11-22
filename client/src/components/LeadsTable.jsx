import StatusLabel from './StatusLabel.jsx'
import { SORTABLE_FIELDS } from '../constants/leads.js'

const COLUMNS = [
  { field: 'name', label: 'Name' },
  { field: 'email', label: 'Email' },
  { field: 'company', label: 'Company' },
  { field: 'status', label: 'Status' },
]

const actionClass =
  'group relative cursor-pointer px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none'

// No box border: the outline is drawn as an SVG stroke that cuts the top-right
// and bottom-left corners. A stroke in `currentColor` means it picks up the
// hover colour for free, and because the fill stays transparent it works on the
// plain canvas and on the hovered row alike.
function Chamfer({ tone }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <polygon
        points="0,0 90,0 100,16 100,100 10,100 0,84"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className={`opacity-60 transition-opacity group-hover:opacity-100 ${
          tone === 'danger' ? 'text-danger' : 'text-line'
        }`}
      />
    </svg>
  )
}

const ICONS = {
  Edit: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path d="M4 20h4L20 8l-4-4L4 16v4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Delete: (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path
        d="M5 7h14M10 7V5h4v2M6.5 7l1 12h9l1-12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

function ActionButton({ label, ariaLabel, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${actionClass} text-ink ${tone === 'danger' ? 'hover:text-danger' : 'hover:text-brand'}`}
    >
      <Chamfer tone={tone} />
      <span className="relative inline-flex items-center gap-2">
        {ICONS[label]}
        {label}
      </span>
    </button>
  )
}

function SortHeader({ column, sort, order, onSort }) {
  const isActive = sort === column.field
  const sortable = SORTABLE_FIELDS.includes(column.field)

  return (
    <th
      scope="col"
      aria-sort={sortable && isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-4 py-3 text-left"
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort(column.field)}
          className={`cursor-pointer font-mono text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-ink ${
            isActive ? 'text-ink' : 'text-muted'
          }`}
        >
          {column.label}
          <span aria-hidden="true" className="ml-1.5">
            {isActive ? (order === 'asc' ? '↑' : '↓') : ''}
          </span>
        </button>
      ) : (
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
          {column.label}
        </span>
      )}
    </th>
  )
}

function RowActions({ lead, onEdit, onRequestDelete }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <ActionButton label="Edit" onClick={() => onEdit(lead)} />
      <ActionButton
        label="Delete"
        tone="danger"
        ariaLabel={`Delete ${lead.name}`}
        onClick={() => onRequestDelete(lead)}
      />
    </div>
  )
}

// The status cell is itself a control: it opens the edit panel with the status
// select already focused, which is the fastest way to move a lead along.
function StatusButton({ lead, onEditStatus }) {
  return (
    <button
      type="button"
      onClick={() => onEditStatus(lead)}
      aria-label={`Change status for ${lead.name}`}
      className="cursor-pointer transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <StatusLabel status={lead.status} />
    </button>
  )
}

function Skeleton() {
  return (
    <div className="border-b border-line" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-6 border-b border-line px-4 py-5 last:border-0">
          <span className="animate-shimmer h-3 w-32 bg-[linear-gradient(90deg,#f1e9dc_25%,#faf6ef_50%,#f1e9dc_75%)] bg-[length:200%_100%]" />
          <span className="animate-shimmer h-3 w-48 bg-[linear-gradient(90deg,#f1e9dc_25%,#faf6ef_50%,#f1e9dc_75%)] bg-[length:200%_100%]" />
          <span className="animate-shimmer hidden h-3 w-28 bg-[linear-gradient(90deg,#f1e9dc_25%,#faf6ef_50%,#f1e9dc_75%)] bg-[length:200%_100%] sm:block" />
        </div>
      ))}
    </div>
  )
}

export default function LeadsTable({
  leads,
  loading,
  sort,
  order,
  flashId,
  onSort,
  onEdit,
  onEditStatus,
  onRequestDelete,
}) {
  if (loading) return <Skeleton />

  return (
    <>
      {/* Desktop and tablet: a real table, as the brief requires */}
      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">Your leads</caption>
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map((column) => (
              <SortHeader
                key={column.field}
                column={column}
                sort={sort}
                order={order}
                onSort={onSort}
              />
            ))}
            <th scope="col" className="px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, index) => (
            <tr
              key={lead.id}
              className={`animate-fade-up border-b border-line transition-colors hover:bg-[#f6f0e6] ${
                flashId === lead.id ? 'animate-flash' : ''
              }`}
              style={{ animationDelay: `${Math.min(index * 25, 200)}ms` }}
            >
              <td className="px-4 py-4 font-mono text-sm text-ink">{lead.name}</td>
              <td className="px-4 py-4 font-mono text-sm text-muted">{lead.email}</td>
              <td className="px-4 py-4 font-mono text-sm text-muted">{lead.company || '—'}</td>
              <td className="px-4 py-4">
                <StatusButton lead={lead} onEditStatus={onEditStatus} />
              </td>
              <td className="px-4 py-4">
                <RowActions lead={lead} onEdit={onEdit} onRequestDelete={onRequestDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones: the same records, stacked instead of scrolling sideways */}
      <ul className="md:hidden">
        {leads.map((lead, index) => (
          <li
            key={lead.id}
            className={`animate-fade-up border-b border-line px-4 py-5 ${
              flashId === lead.id ? 'animate-flash' : ''
            }`}
            style={{ animationDelay: `${Math.min(index * 25, 200)}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-mono text-sm text-ink">{lead.name}</span>
              <StatusButton lead={lead} onEditStatus={onEditStatus} />
            </div>
            <p className="mt-2 font-mono text-xs break-all text-muted">{lead.email}</p>
            <p className="mt-1 font-mono text-xs text-muted">
              {[lead.company, lead.phone, lead.source].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-3">
              <RowActions lead={lead} onEdit={onEdit} onRequestDelete={onRequestDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
