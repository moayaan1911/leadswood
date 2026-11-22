import { ApiError } from './client.js'
import { EMAIL_RE, LEAD_STATUSES, LEAD_SOURCES } from '../constants/leads.js'

// In-memory stand-in for MongoDB, behind exactly the same contract as the
// Express API. It exists so the dashboard can be built and demonstrated before
// the server is written; deleting this file plus flipping USE_MOCK_API is the
// whole switch-over.

const SEED = [
  ['Asha Rao', 'asha.rao@northwind.example', '+91 98200 41122', 'Northwind Traders', 'Referral', 'Qualified'],
  ['Vikram Menon', 'vikram@brightlayne.example', '+91 98450 21188', 'Brightlayne', 'Website', 'New'],
  ['Neha Kulkarni', 'neha.k@cobaltlabs.example', '+91 99001 33447', 'Cobalt Labs', 'Email Campaign', 'Contacted'],
  ['Rohit Sharma', 'rohit.sharma@ferroworks.example', '+91 97300 55210', 'Ferroworks', 'Cold Call', 'New'],
  ['Priya Iyer', 'priya.iyer@harborline.example', '+91 98860 11902', 'Harborline', 'Event', 'Qualified'],
  ['Daniel Fernandes', 'daniel@stonebridge.example', '+91 90040 77451', 'Stonebridge', 'Website', 'Contacted'],
  ['Meera Nair', 'meera.nair@quantexco.example', '+91 98211 66003', 'Quantex Co', 'Social Media', 'Lost'],
  ['Arjun Bhatt', 'arjun.bhatt@verdantco.example', '+91 98020 33876', 'Verdant Co', 'Referral', 'New'],
  ['Sana Qureshi', 'sana.q@lumenpath.example', '+91 99456 20117', 'Lumenpath', 'Email Campaign', 'Qualified'],
  ['Karthik Reddy', 'karthik@ironbark.example', '+91 90080 45523', 'Ironbark', 'Cold Call', 'Contacted'],
  ['Tanvi Desai', 'tanvi.desai@coastalpoint.example', '+91 98950 71234', 'Coastal Point', 'Website', 'New'],
  ['Imran Sheikh', 'imran.s@plainsight.example', '+91 99300 88210', 'Plainsight', 'Event', 'Lost'],
  ['Divya Krishnan', 'divya@meridianlog.example', '+91 97400 66512', 'Meridian Logistics', 'Referral', 'Qualified'],
  ['Aditya Verma', 'aditya.verma@northgate.example', '+91 98200 90870', 'Northgate', 'Social Media', 'New'],
  ['Kavya Pillai', 'kavya.p@solsticebio.example', '+91 90140 22998', 'Solstice Bio', 'Email Campaign', 'Contacted'],
  ['Nikhil Joshi', 'nikhil.joshi@axlewood.example', '+91 98050 44167', 'Axlewood', 'Cold Call', 'Lost'],
  ['Riya Sen', 'riya.sen@tangentray.example', '+91 98456 77340', 'Tangent Ray', 'Website', 'Qualified'],
  ['Farhan Ali', 'farhan.ali@westbrook.example', '+91 99080 12345', 'Westbrook', 'Referral', 'New'],
  ['Ananya Ghosh', 'ananya.g@pebblecourt.example', '+91 98301 55678', 'Pebblecourt', 'Event', 'Contacted'],
  ['Siddharth Jain', 'sid.jain@oxbowtools.example', '+91 98870 90012', 'Oxbow Tools', 'Social Media', 'New'],
  ['Ishita Bose', 'ishita.bose@hollowpine.example', '+91 90390 34455', 'Hollowpine', 'Email Campaign', 'Qualified'],
  ['Manav Kapoor', 'manav@ridgecrest.example', '+91 98220 66789', 'Ridgecrest', 'Cold Call', 'Lost'],
  ['Pooja Shetty', 'pooja.shetty@amberly.example', '+91 99670 21109', 'Amberly', 'Website', 'Contacted'],
  ['Yash Agarwal', 'yash.agarwal@driftwoodco.example', '+91 97020 88031', 'Driftwood Co', 'Referral', 'New'],
  ['Sneha Raut', 'sneha.raut@cinderlane.example', '+91 98330 45612', 'Cinderlane', 'Event', 'Qualified'],
  ['Aakash Malhotra', 'aakash.m@foxgloveit.example', '+91 98670 33098', 'Foxglove IT', 'Social Media', 'Contacted'],
  ['Lakshmi Narayan', 'lakshmi.n@palegrove.example', '+91 90430 77120', 'Palegrove', 'Email Campaign', 'New'],
  ['Zoya Khan', 'zoya.khan@thistledown.example', '+91 99100 54432', 'Thistledown', 'Website', 'Lost'],
  ['Harsh Vardhan', 'harsh.v@egretworks.example', '+91 97700 98811', 'Egretworks', 'Cold Call', 'Contacted'],
  ['Nandini Rao', 'nandini.rao@bramblex.example', '+91 98450 66774', 'Bramblex', 'Referral', 'Qualified'],
]

const DAY = 24 * 60 * 60 * 1000

let leads = SEED.map(([name, email, phone, company, source, status], index) => ({
  id: `lead_${String(index + 1).padStart(3, '0')}`,
  name,
  email,
  phone,
  company,
  source,
  status,
  // Spread over the last ~5 weeks so date sorting is meaningful.
  createdAt: new Date(Date.now() - index * DAY * 1.2 - 2 * DAY).toISOString(),
  updatedAt: new Date(Date.now() - index * DAY * 1.2 - 2 * DAY).toISOString(),
}))

let sequence = SEED.length

const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms))

function validate(input, { partial = false } = {}) {
  const errors = []
  const required = ['name', 'email']

  if (!partial) {
    for (const field of required) {
      if (!String(input[field] ?? '').trim()) {
        errors.push({ field, message: `${field === 'name' ? 'Name' : 'Email'} is required` })
      }
    }
  } else if (input.name !== undefined && !String(input.name).trim()) {
    errors.push({ field: 'name', message: 'Name is required' })
  }

  if (input.email !== undefined && !EMAIL_RE.test(String(input.email).trim())) {
    errors.push({ field: 'email', message: 'Enter a valid email address' })
  }

  if (input.status !== undefined && !LEAD_STATUSES.includes(input.status)) {
    errors.push({ field: 'status', message: 'Unknown status' })
  }

  if (input.source !== undefined && !LEAD_SOURCES.includes(input.source)) {
    errors.push({ field: 'source', message: 'Unknown source' })
  }

  if (errors.length > 0) {
    throw new ApiError('Validation failed', { status: 400, code: 'VALIDATION_ERROR', errors })
  }
}

function normalise(input) {
  return {
    name: String(input.name).trim(),
    email: String(input.email).trim().toLowerCase(),
    phone: String(input.phone ?? '').trim(),
    company: String(input.company ?? '').trim(),
    source: input.source ?? 'Other',
    status: input.status ?? 'New',
  }
}

export async function listLeads({ search = '', status = 'All', page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = {}) {
  await delay()

  let rows = [...leads]

  if (status && status !== 'All') {
    rows = rows.filter((lead) => lead.status === status)
  }

  const term = search.trim().toLowerCase()
  if (term) {
    rows = rows.filter((lead) =>
      [lead.name, lead.email, lead.company].some((value) => value.toLowerCase().includes(term)),
    )
  }

  const direction = order === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    const left = String(a[sort] ?? '').toLowerCase()
    const right = String(b[sort] ?? '').toLowerCase()
    if (left < right) return -1 * direction
    if (left > right) return 1 * direction
    return 0
  })

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * limit

  return {
    data: rows.slice(start, start + limit),
    meta: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  }
}

export async function leadStats() {
  await delay(180)

  const byStatus = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0]))
  for (const lead of leads) {
    if (byStatus[lead.status] !== undefined) byStatus[lead.status] += 1
  }

  return { data: { total: leads.length, byStatus } }
}

export async function createLead(input) {
  await delay()
  validate(input)

  sequence += 1
  const now = new Date().toISOString()
  const lead = { id: `lead_${String(sequence).padStart(3, '0')}`, ...normalise(input), createdAt: now, updatedAt: now }

  leads = [lead, ...leads]
  return { data: lead, message: 'Lead created' }
}

export async function updateLead(id, input) {
  await delay()
  validate(input, { partial: true })

  const index = leads.findIndex((lead) => lead.id === id)
  if (index === -1) {
    throw new ApiError('Lead not found', { status: 404, code: 'NOT_FOUND' })
  }

  const merged = { ...leads[index], ...input }
  const updated = { ...merged, ...normalise(merged), updatedAt: new Date().toISOString() }
  leads = leads.map((lead, position) => (position === index ? updated : lead))

  return { data: updated, message: 'Lead updated' }
}

export async function deleteLead(id) {
  await delay()

  const exists = leads.some((lead) => lead.id === id)
  if (!exists) {
    throw new ApiError('Lead not found', { status: 404, code: 'NOT_FOUND' })
  }

  leads = leads.filter((lead) => lead.id !== id)
  return { data: { id }, message: 'Lead deleted' }
}
