import { useEffect, useRef, useState } from 'react'
import { updateUser } from '../api/auth.js'
import { usePanelKeys } from '../hooks/usePanelKeys.js'

const inputClass =
  'peer w-full border-b-2 border-line bg-transparent pb-2 font-mono text-sm text-ink transition-colors focus:border-brand focus:outline-none'

function Field({ id, label, type = 'text', value, onChange, error, autoComplete, inputRef }) {
  return (
    <div>
      <label htmlFor={id} className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
        {label}
      </label>
      <div className="relative mt-2.5">
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputClass}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 w-full origin-center scale-x-0 bg-brand transition-transform duration-300 ease-out peer-focus:scale-x-100"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 font-mono text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Row({ label, value, note }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-5">
      <dt className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase">{label}</dt>
      <dd className="text-right">
        <span className="font-mono text-sm text-ink">{value}</span>
        {note ? <span className="mt-1 block font-mono text-[10px] text-muted">{note}</span> : null}
      </dd>
    </div>
  )
}

function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

// Profile lives in a slide-over rather than its own page: only the name and the
// password can change. It opens read-only, so an accidental click cannot edit
// anything — Edit switches the same fields into inputs.
export default function ProfilePanel({ user, onClose, onSaved }) {
  const panelRef = usePanelKeys(onClose)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [nameError, setNameError] = useState('')
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (editing) firstFieldRef.current?.focus()
  }, [editing])

  function resetDraft() {
    setName(user?.name ?? '')
    setNameError('')
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordErrors({})
  }

  function cancelEdit() {
    resetDraft()
    setEditing(false)
  }

  async function handleSave(event) {
    event.preventDefault()

    const wantsPassword = Boolean(
      passwords.currentPassword || passwords.newPassword || passwords.confirmPassword,
    )

    const found = {}
    if (!name.trim()) found.name = 'Name is required'
    if (wantsPassword) {
      if (!passwords.currentPassword) found.currentPassword = 'Enter your current password'
      if (passwords.newPassword !== passwords.confirmPassword) {
        found.confirmPassword = 'Passwords do not match'
      }
    }

    setNameError(found.name ?? '')
    setPasswordErrors({
      currentPassword: found.currentPassword,
      confirmPassword: found.confirmPassword,
    })
    if (Object.keys(found).length > 0) return

    setSaving(true)

    try {
      const payload = { name: name.trim() }
      if (wantsPassword) {
        payload.currentPassword = passwords.currentPassword
        payload.newPassword = passwords.newPassword
      }

      const result = await updateUser(payload)

      onSaved({ user: result.data.user, message: result.message })
      resetDraft()
      setEditing(false)
    } catch (error) {
      // Server-side field errors land in the same slots as the local ones.
      const serverFound = error.errors?.length
        ? Object.fromEntries(error.errors.map((item) => [item.field, item.message]))
        : {}

      if (serverFound.name) setNameError(serverFound.name)
      else if (!serverFound.currentPassword && !serverFound.newPassword) setNameError(error.message)

      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: serverFound.currentPassword,
        newPassword: serverFound.newPassword,
      }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#2a1d15]/40"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="animate-panel-in relative flex h-full w-full flex-col border-l border-line bg-surface sm:max-w-md"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <h2 id="profile-title" className="font-display text-sm font-bold tracking-[0.2em] uppercase">
            Profile
          </h2>

          <div className="flex items-center gap-4">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="cursor-pointer border-2 border-brand bg-brand px-5 py-2 font-display text-[10px] font-bold tracking-[0.22em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-muted uppercase transition-colors hover:text-ink"
            >
              Close
            </button>
          </div>
        </header>

        <div className="flex items-center gap-4 border-b border-line px-6 py-6">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center bg-brand font-display text-sm font-bold text-canvas"
          >
            {initials(user?.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-ink">{user?.name}</p>
            <p className="truncate font-mono text-xs text-muted">{user?.email}</p>
          </div>
        </div>

        {!editing ? (
          <dl className="divide-y divide-line px-6">
            <Row label="Name" value={user?.name || '—'} />
            <Row label="Email" value={user?.email} note="Email cannot be changed" />
            <Row label="Password" value="••••••••" />
          </dl>
        ) : (
          <form onSubmit={handleSave} noValidate className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-7 px-6 py-7">
              <Field
                id="profile-name"
                label="Name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameError('')
                }}
                error={nameError}
                autoComplete="name"
                inputRef={firstFieldRef}
              />

              <div className="border-t border-line pt-7">
                <h3 className="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
                  Password
                </h3>

                <div className="mt-5 flex flex-col gap-6">
                  <Field
                    id="current-password"
                    label="Current password"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(event) => {
                      setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))
                      setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }))
                    }}
                    error={passwordErrors.currentPassword}
                    autoComplete="current-password"
                  />

                  <Field
                    id="new-password"
                    label="New password"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(event) => {
                      setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))
                      setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }))
                    }}
                    error={passwordErrors.newPassword}
                    autoComplete="new-password"
                  />

                  <Field
                    id="confirm-password"
                    label="Confirm new password"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(event) => {
                      setPasswords((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                    }}
                    error={passwordErrors.confirmPassword}
                    autoComplete="new-password"
                  />
                </div>

                <p className="mt-5 font-mono text-[11px] text-muted">
                  Leave the password fields empty to keep the current one. 8–72 characters, with
                  at least one letter and one number.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 border-t border-line px-6 py-5">
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer border-2 border-brand bg-brand px-7 py-3 font-display text-[11px] font-bold tracking-[0.22em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-muted uppercase transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
