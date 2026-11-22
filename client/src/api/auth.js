import { request } from './client.js'
import { readToken } from './session.js'

export async function login({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } })
}

export async function signup({ name, email, password }) {
  return request('/auth/signup', { method: 'POST', body: { name, email, password } })
}

// name and password in one call; undefined fields are dropped by JSON.stringify
export async function updateUser({ name, currentPassword, newPassword }) {
  return request('/auth/me', {
    method: 'PATCH',
    body: { name, currentPassword, newPassword },
    token: readToken(),
  })
}