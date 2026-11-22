// The one place the frontend talks to the network, so unwrapping the shared
// envelope happens here once and no screen has to know the shape.

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

  // a proxy or gateway error answers with html, not with our envelope
  if (!payload) {
    throw new ApiError('Could not reach the server.', {
      status: response.status,
      code: 'NETWORK_ERROR',
    })
  }

  if (!payload.success) {
    throw new ApiError(payload?.message ?? 'Something went wrong.', {
      status: response.status,
      code: payload?.code ?? '',
      errors: payload?.errors ?? [],
    })
  }

  return { data: payload.data, meta: payload.meta, message: payload.message }
}