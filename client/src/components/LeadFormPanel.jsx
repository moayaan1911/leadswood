import { useEffect, useRef, useState } from 'react'
import { EMAIL_RE, LEAD_SOURCES, LEAD_STATUSES } from '../constants/leads.js'
import { usePanelKeys } from '../hooks/usePanelKeys.js'

const EMPTY = { name: '', email: '', phone: '', company: '', source: 'Website', status: 'New' }

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Name is required'
  if (!values.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address'
  if (values.phone.trim() && !/^[+\d][\d\s().-]{5,29}$/.test(values.phone.trim())) {
    errors.phone = 'Use digits, spaces and + ( ) . - only'
  }
  return errors
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
        {label}
      </label>
      <div className="relative mt-2.5">
        {children}
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

const inputClass =
  'peer w-full border-b-2 border-line bg-transparent pb-2 font-mono text-sm text-ink transition-colors focus:border-brand focus:outline-none'

// Right-hand slide-over, full screen on phones. Editing and creating share this
// panel because the form is identical — only the prefilled values differ.
export default function LeadFormPanel({
  lead,
  focusField,
  saving,
  serverError,
  serverErrors,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState(() => (lead ? { ...EMPTY, ...lead } : EMPTY))
  const [errors, setErrors] = useState({})
  const firstFieldRef = useRef(null)
  const statusRef = useRef(null)
  const panelRef = usePanelKeys(onClose)

  const isEdit = Boolean(lead)

  useEffect(() => {
    // Opened from a status cell? Land on the status select instead of the top.
    if (focusField === 'status') statusRef.current?.focus()
    else firstFieldRef.current?.focus()
  }, [focusField])

  useEffect(() => {
    // Server-side field errors are folded into the same inline slots.
    if (serverErrors?.length) {
      setErrors(Object.fromEntries(serverErrors.map((item) => [item.field, item.message])))
    }
  }, [serverErrors])

  function update(field) {
    return (event) => {
      const next = event.target.value
      setValues((prev) => ({ ...prev, [field]: next }))
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // Send only the fields the API accepts. Ids and timestamps are the
    // server's business, and an explicit list means a stray value can never
    // ride along by accident.
    onSubmit({
      name: values.name,
      email: values.email,
      phone: values.phone,
      company: values.company,
      source: values.source,
      status: values.status,
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#2a1d15]/40"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-panel-title"
        className="animate-panel-in relative flex h-full w-full flex-col border-l border-line bg-surface sm:max-w-md"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2
            id="lead-panel-title"
            className="font-display text-sm font-bold tracking-[0.2em] uppercase"
          >
            {isEdit ? 'Edit lead' : 'New lead'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-muted uppercase transition-colors hover:text-ink"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-7 px-6 py-7">
            <Field id="name" label="Name" error={errors.name}>
              <input
                id="name"
                ref={firstFieldRef}
                value={values.name}
                onChange={update('name')}
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                className={inputClass}
              />
            </Field>

            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                type="email"
                value={values.email}
                onChange={update('email')}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className={inputClass}
              />
            </Field>

            <Field id="phone" label="Phone (optional)" error={errors.phone}>
              <input
                id="phone"
                value={values.phone}
                onChange={update('phone')}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                className={inputClass}
              />
            </Field>

            <Field id="company" label="Company (optional)">
              <input
                id="company"
                value={values.company}
                onChange={update('company')}
                autoComplete="organization"
                className={inputClass}
              />
            </Field>

            <Field id="source" label="Source">
              <select
                id="source"
                value={values.source}
                onChange={update('source')}
                className={`${inputClass} cursor-pointer appearance-none`}
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 font-mono text-xs text-muted"
              >
                ▾
              </span>
            </Field>

            <Field id="status" label="Status">
              <select
                id="status"
                ref={statusRef}
                value={values.status}
                onChange={update('status')}
                className={`${inputClass} cursor-pointer appearance-none`}
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 font-mono text-xs text-muted"
              >
                ▾
              </span>
            </Field>

            {serverError ? (
              <p role="alert" className="font-mono text-[11px] text-danger">
                {serverError}
              </p>
            ) : null}
          </div>

          <footer className="flex items-center gap-6 border-t border-line px-6 py-5">
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer border-2 border-brand bg-brand px-8 py-3.5 font-display text-xs font-bold tracking-[0.25em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving' : isEdit ? 'Save changes' : 'Add lead'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-muted uppercase transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
