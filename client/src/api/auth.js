import { USE_MOCK_API, ApiError, request } from './client.js'
import { readSession, readToken } from './session.js'

// Auth calls. The mock accepts any well-formed email with a password of 8+
// characters, so the login, signup and profile screens can be exercised end to
// end before the Express API and bcrypt/JWT exist.

const delay = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms))

function assertCredentials({ email, password }) {
  if (!email?.trim() || !password) {
    throw new ApiError('Email and password are required', {
      status: 400,
      code: 'VALIDATION_ERROR',
    })
  }
  if (password.length < 8) {
    throw new ApiError('Invalid email or password', { status: 401, code: 'UNAUTHORIZED' })
  }
}

function passwordErrors(newPassword) {
  if (!newPassword) return 'Enter a new password'
  if (newPassword.length < 8) return 'Use at least 8 characters'
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return 'Use at least one letter and one number'
  }
  return ''
}

export async function login({ email, password }) {
  if (!USE_MOCK_API) {
    return request('/auth/login', { method: 'POST', body: { email, password } })
  }

  await delay()
  assertCredentials({ email, password })

  const name = email.split('@')[0].replace(/[._]/g, ' ')
  return {
    data: {
      user: { id: 'user_1', name, email: email.trim().toLowerCase() },
      token: 'mock.jwt.token',
    },
    message: 'Signed in',
  }
}

export async function signup({ name, email, password }) {
  if (!USE_MOCK_API) {
    return request('/auth/signup', { method: 'POST', body: { name, email, password } })
  }

  await delay()
  assertCredentials({ email, password })

  return {
    data: {
      user: { id: 'user_1', name: name.trim(), email: email.trim().toLowerCase() },
      token: 'mock.jwt.token',
    },
    message: 'Account created',
  }
}

export async function updateName({ name }) {
  if (!USE_MOCK_API) {
    return request('/auth/me', { method: 'PATCH', body: { name }, token: readToken() })
  }

  await delay(400)

  if (!name?.trim()) {
    throw new ApiError('Validation failed', {
      status: 400,
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'name', message: 'Name is required' }],
    })
  }

  const user = readSession()?.user ?? { id: 'user_1' }
  return { data: { user: { ...user, name: name.trim() } }, message: 'Name updated' }
}

export async function changePassword({ currentPassword, newPassword }) {
  if (!USE_MOCK_API) {
    return request('/auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
      token: readToken(),
    })
  }

  await delay(500)

  const errors = []
  if (!currentPassword) {
    errors.push({ field: 'currentPassword', message: 'Enter your current password' })
  }

  const problem = passwordErrors(newPassword)
  if (problem) errors.push({ field: 'newPassword', message: problem })

  if (errors.length > 0) {
    throw new ApiError('Validation failed', { status: 400, code: 'VALIDATION_ERROR', errors })
  }

  return { data: { id: readSession()?.user?.id ?? 'user_1' }, message: 'Password updated' }
}
