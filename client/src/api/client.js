// The one place the frontend talks to the network.
//
// Every response in this app uses the same envelope:
//   success:  { success: true, message, data, meta? }
//   failure:  { success: false, message, code, data: null, errors? }
// so unwrapping happens here once, and no screen has to know the shape.

// Flip to false once the Express API is live: every endpoint in api/leads.js
// and api/auth.js then goes over HTTP instead of the in-memory mock.
export const USE_MOCK_API = true

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', errors = [] } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export async function request(path, { method = 'GET', body, token } = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // The API being down is a normal failure mode, not a crash.
    throw new ApiError('Could not reach the server.', { code: 'NETWORK_ERROR' })
  }

  const payload = await response.json().catch(() => null)

  if (!payload?.success) {
    throw new ApiError(payload?.message ?? 'Something went wrong.', {
      status: response.status,
      code: payload?.code ?? '',
      errors: payload?.errors ?? [],
    })
  }

  return { data: payload.data, meta: payload.meta, message: payload.message }
}
