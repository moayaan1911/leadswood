import { USE_MOCK_API, request } from './client.js'
import { readToken } from './session.js'
import * as mock from './mockDb.js'

// Each function is the single entry point for one API call. While USE_MOCK_API
// is true the in-memory implementation answers; once the Express API exists,
// flipping that flag routes the same calls over HTTP with no screen changes.

export async function fetchLeads(params = {}) {
  if (USE_MOCK_API) return mock.listLeads(params)

  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined),
  )
  return request(`/leads?${query.toString()}`, { token: readToken() })
}

export async function fetchStats() {
  if (USE_MOCK_API) return mock.leadStats()
  return request('/leads/stats', { token: readToken() })
}

export async function createLead(values) {
  if (USE_MOCK_API) return mock.createLead(values)
  return request('/leads', { method: 'POST', body: values, token: readToken() })
}

export async function updateLead(id, values) {
  if (USE_MOCK_API) return mock.updateLead(id, values)
  return request(`/leads/${id}`, { method: 'PATCH', body: values, token: readToken() })
}

export async function deleteLead(id) {
  if (USE_MOCK_API) return mock.deleteLead(id)
  return request(`/leads/${id}`, { method: 'DELETE', token: readToken() })
}
