import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { login, signup } from '../api/auth.js'
import { saveSession } from '../api/session.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_VALUES = { name: '', email: '', password: '' }

function validate(mode, values) {
  const errors = {}

  if (mode === 'signup' && !values.name.trim()) {
    errors.name = 'Name is required'
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (!values.password) {
    errors.password = 'Password is required'
  } else if (mode === 'signup') {
    if (values.password.length < 8) {
      errors.password = 'Use at least 8 characters'
    } else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
      errors.password = 'Use at least one letter and one number'
    }
  }

  return errors
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  trailing,
  delay = 0,
}) {
  return (
    <div className="animate-slide-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="animate-shake">
        <div className="flex items-end justify-between gap-4">
          <label
            htmlFor={id}
            className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase"
          >
            {label}
          </label>
          {trailing}
        </div>
        <div className="relative mt-2.5">
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="peer w-full border-b-2 border-line bg-transparent pb-2 font-mono text-sm text-ink transition-colors focus:border-brand focus:outline-none"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-0.5 w-full origin-center scale-x-0 bg-brand transition-transform duration-300 ease-out peer-focus:scale-x-100"
          />
        </div>
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-2 font-mono text-[11px] text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Login() {
  usePageTitle('Log in — LeadsWood')

  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('idle')
  const [notice, setNotice] = useState('')
  const headingRef = useRef(null)

  const isSignup = mode === 'signup'

  // Played imperatively instead of via a `key` remount: changing a key made
  // React insert the new heading without removing the old one, so the text
  // stacked up on every switch. Animating the existing node cannot do that.
  function playHeadingGlitch() {
    const node = headingRef.current
    if (!node || typeof node.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    node.animate(
      [
        { opacity: 0, transform: 'translateX(-4px)' },
        { opacity: 1, transform: 'translateX(3px)' },
        { opacity: 0.4, transform: 'translateX(-2px)' },
        { opacity: 1, transform: 'translateX(2px)' },
        { opacity: 0.7, transform: 'translateX(-1px)' },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: 240, easing: 'ease-out' },
    )
  }

  function changeMode(next) {
    if (next === mode) return
    setMode(next)
    setErrors({})
    setNotice('')
    playHeadingGlitch()
  }

  function update(field) {
    return (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validate(mode, values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setStatus('submitting')
    setNotice('')

    try {
      // Auth is served by the in-memory mock for now; the Express API with
      // bcrypt and JWT replaces it behind this same call.
      const result = isSignup
        ? await signup({ name: values.name, email: values.email, password: values.password })
        : await login({ email: values.email, password: values.password })

      saveSession({ token: result.data.token, user: result.data.user })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setNotice(error.message)
      if (error.errors?.length) {
        setErrors(Object.fromEntries(error.errors.map((item) => [item.field, item.message])))
      }
      setStatus('idle')
    }
  }

  return (
    <div className="grid min-h-screen bg-canvas text-ink md:grid-cols-2">
      {/* Left: photo, travelling scan line, and the way back */}
      <div className="relative min-h-[34vh] overflow-hidden md:min-h-screen">
        <img
          src="/leads-banner.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1d15] via-[#2a1d15]/55 to-[#2a1d15]/15" />
        <div
          aria-hidden="true"
          className="animate-scan pointer-events-none absolute inset-x-0 h-px bg-canvas/60 shadow-[0_0_14px_3px_rgba(250,246,239,0.35)]"
        />
        <Link
          to="/"
          className="absolute top-6 left-6 font-mono text-[11px] tracking-[0.25em] text-canvas/80 uppercase transition hover:text-canvas sm:top-8 sm:left-10"
        >
          ← Home
        </Link>
      </div>

      {/* Right: the form */}
      <div className="flex items-center justify-center px-8 py-14 sm:px-14 md:px-16 lg:px-24">
        <div className="w-full max-w-sm">
          <h1
            ref={headingRef}
            className="font-display text-2xl font-black tracking-[0.12em] text-ink uppercase sm:text-3xl"
          >
            {isSignup ? 'Create account' : 'Welcome back'}
          </h1>

          {/* Toggle: two labels, one sliding underline */}
          <div className="relative mt-9 flex">
            {[
              ['login', 'Log in'],
              ['signup', 'Sign up'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeMode(value)}
                aria-pressed={mode === value}
                className={`flex-1 cursor-pointer pb-3 font-mono text-[11px] tracking-[0.25em] uppercase transition-colors ${
                  mode === value ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
            <span
              aria-hidden="true"
              className={`absolute bottom-0 left-0 h-0.5 w-1/2 bg-brand transition-transform duration-300 ease-out ${
                isSignup ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-10 flex flex-col gap-7"
          >
            {/* Name exists only on signup. The grid-rows trick animates auto
                height without measuring anything, and `inert` keeps the
                collapsed field out of the tab order. */}
            <div
              inert={!isSignup}
              aria-hidden={!isSignup}
              className={`grid transition-all duration-300 ease-out ${
                isSignup ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <Field
                  id="name"
                  label="Name"
                  value={values.name}
                  onChange={update('name')}
                  error={errors.name}
                  autoComplete="name"
                />
              </div>
            </div>

            <Field
              id="email"
              label="Email"
              type="email"
              value={values.email}
              onChange={update('email')}
              error={errors.email}
              autoComplete="email"
              delay={isSignup ? 60 : 0}
            />

            <Field
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={update('password')}
              error={errors.password}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              delay={isSignup ? 120 : 60}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="cursor-pointer font-mono text-[10px] tracking-[0.2em] text-muted uppercase transition hover:text-ink"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />

            {/* Message slot: API errors and notices land here */}
            <p
              role="status"
              aria-live="polite"
              className="min-h-4 font-mono text-[11px] text-danger"
            >
              {notice}
            </p>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-fit cursor-pointer border-2 border-brand bg-brand px-10 py-4 font-display text-xs font-bold tracking-[0.25em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === 'submitting' ? (
                <>
                  Authenticating
                  <span aria-hidden="true" className="animate-blink">
                    _
                  </span>
                </>
              ) : (
                'Enter the app'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
