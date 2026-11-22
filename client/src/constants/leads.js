// Single source of truth for the lead vocabulary, shared by the form, the
// table, the counters and the mock API.

export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Lost']

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Event',
  'Other',
]

// Full class strings (not assembled at runtime) so Tailwind's scanner sees them.
export const STATUS_DOT = {
  New: 'bg-status-new',
  Contacted: 'bg-status-contacted',
  Qualified: 'bg-status-qualified',
  Lost: 'bg-status-lost',
}

export const SORTABLE_FIELDS = ['name', 'email', 'company', 'status', 'createdAt']

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
