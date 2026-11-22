// Token and user storage for the session. Kept in one module so the storage
// mechanism (localStorage today, httpOnly cookies later) can change without
// touching a single screen.

const TOKEN_KEY = 'leadswood.token'
const USER_KEY = 'leadswood.user'

export function saveSession({ token, user }) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Private mode can block storage; the session then simply does not persist.
  }
}

export function readSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
    return token ? { token, user } : null
  } catch {
    return null
  }
}

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // Nothing to do: there is no session to clear.
  }
}
