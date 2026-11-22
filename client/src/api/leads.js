import { request } from './client.js'
import { readToken } from './session.js'

export async function fetchLeads(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined),
  )
  return request(`/leads?${query.toString()}`, { token: readToken() })
}

export async function fetchStats() {
  return request('/leads/stats', { token: readToken() })
}

export async function createLead(values) {
  return request('/leads', { method: 'POST', body: values, token: readToken() })
}

export async function updateLead(id, values) {
  return request(`/leads/${id}`, { method: 'PATCH', body: values, token: readToken() })
}

export async function deleteLead(id) {
  return request(`/leads/${id}`, { method: 'DELETE', token: readToken() })
}