import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { createLead, deleteLead, fetchLeads, fetchStats, updateLead } from '../api/leads.js'
import { clearSession, readSession, saveSession } from '../api/session.js'
import StatusCounts from '../components/StatusCounts.jsx'
import LeadsTable from '../components/LeadsTable.jsx'
import LeadFormPanel from '../components/LeadFormPanel.jsx'
import ProfilePanel from '../components/ProfilePanel.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'

const LIMIT = 10

const arrow = (direction) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-3.5 w-3.5"
  >
    <path
      d={direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function Dashboard() {
  usePageTitle('Dashboard — LeadsWood')

  const navigate = useNavigate()
  const [session, setSession] = useState(() => readSession())

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    sort: 'createdAt',
    order: 'desc',
    page: 1,
  })
  const [searchInput, setSearchInput] = useState('')

  const [leads, setLeads] = useState([])
  const [meta, setMeta] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [panel, setPanel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState('')
  const [panelFieldErrors, setPanelFieldErrors] = useState([])

  const [profileOpen, setProfileOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [flashId, setFlashId] = useState(null)

  const query = useMemo(() => ({ ...filters, limit: LIMIT }), [filters])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const [list, counts] = await Promise.all([fetchLeads(query), fetchStats()])
      setLeads(list.data)
      setMeta(list.meta)
      setStats(counts.data)
    } catch (error) {
      // an expired or stale token means the session is gone
      if (error.status === 401) {
        clearSession()
        navigate('/login', { replace: true })
        return
      }

      setLeads([])
      setMeta(null)
      setLoadError(error.message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput, page: 1 },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // The highlight on a just-saved row fades out on its own.
  useEffect(() => {
    if (!flashId) return undefined
    const timer = setTimeout(() => setFlashId(null), 1400)
    return () => clearTimeout(timer)
  }, [flashId])

  function selectStatus(status) {
    setFilters((prev) => ({ ...prev, status, page: 1 }))
  }

  function toggleSort(field) {
    setFilters((prev) => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }

  function clearFilters() {
    setSearchInput('')
    setFilters((prev) => ({ ...prev, search: '', status: 'All', page: 1 }))
  }

  // `focusField` lets the table open the panel with a specific control already
  // focused — clicking a status cell should land on the status select.
  function openPanel(lead = null, focusField = null) {
    setPanel({ lead, focusField })
    setPanelError('')
    setPanelFieldErrors([])
  }

  async function handlePanelSubmit(payload) {
    setSaving(true)
    setPanelError('')
    setPanelFieldErrors([])

    try {
      const result = panel.lead ? await updateLead(panel.lead.id, payload) : await createLead(payload)
      setPanel(null)
      setFlashId(result.data.id)
      setToast({ message: result.message ?? 'Saved', tone: 'ok' })
      await load()
    } catch (error) {
      setPanelError(error.message)
      setPanelFieldErrors(error.errors ?? [])
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)

    try {
      const result = await deleteLead(pendingDelete.id)
      setPendingDelete(null)
      setToast({ message: result.message ?? 'Lead deleted', tone: 'ok' })
      await load()
    } catch (error) {
      setPendingDelete(null)
      setToast({ message: error.message, tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  // The profile panel reports back after a successful change; a new name must
  // be persisted so a reload shows it too.
  function handleProfileSaved({ user, message }) {
    if (user) {
      const next = { token: session.token, user }
      saveSession(next)
      setSession(next)
    }
    setToast({ message, tone: 'ok' })
  }

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  if (!session) return <Navigate to="/login" replace />

  const hasFilters = filters.search !== '' || filters.status !== 'All'
  const first = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const last = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <span className="font-display text-sm font-black tracking-[0.28em] uppercase">
            LeadsWood
            <span aria-hidden="true" className="animate-blink">
              _
            </span>
          </span>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Profile"
              className="cursor-pointer text-muted transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
              >
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer border-2 border-brand bg-brand px-5 py-2.5 font-display text-[11px] font-bold tracking-[0.22em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <h1 className="sr-only">Your leads</h1>

        <StatusCounts
          stats={stats}
          active={filters.status}
          loading={loading && !stats}
          onSelect={selectStatus}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3 border-b-2 border-line transition-colors focus-within:border-brand">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 shrink-0 text-muted"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" strokeLinecap="round" />
            </svg>
            <input
              id="lead-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email or company"
              aria-label="Search leads"
              className="w-full min-w-[15rem] bg-transparent py-2 font-mono text-sm text-ink placeholder:text-muted/70 focus:outline-none sm:w-80"
            />
          </div>

          <button
            type="button"
            onClick={() => openPanel(null)}
            className="cursor-pointer border-2 border-brand bg-brand px-7 py-3 font-display text-[11px] font-bold tracking-[0.25em] text-canvas uppercase transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            + Add lead
          </button>
        </div>

        {loadError ? (
          <div className="border-y border-line py-16 text-center">
            <p className="font-mono text-sm text-danger">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="mt-5 cursor-pointer font-mono text-[11px] tracking-[0.2em] text-ink uppercase underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : !loading && leads.length === 0 ? (
          <div className="border-y border-line py-20 text-center">
            <p className="font-display text-sm font-bold tracking-[0.2em] uppercase">
              {hasFilters ? `No matches for “${filters.search || filters.status}”` : 'No leads yet'}
            </p>
            <p className="mt-3 font-mono text-xs text-muted">
              {hasFilters
                ? 'Nothing matched the current search or filter.'
                : 'Add your first lead to get started.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 cursor-pointer font-mono text-[11px] tracking-[0.2em] text-ink uppercase underline underline-offset-4"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openPanel(null)}
                className="mt-6 cursor-pointer border-2 border-brand bg-brand px-7 py-3 font-display text-[11px] font-bold tracking-[0.25em] text-canvas uppercase transition hover:bg-brand-hover"
              >
                + Add lead
              </button>
            )}
          </div>
        ) : (
          <LeadsTable
            leads={leads}
            loading={loading}
            sort={filters.sort}
            order={filters.order}
            flashId={flashId}
            onSort={toggleSort}
            onEdit={(lead) => openPanel(lead)}
            onEditStatus={(lead) => openPanel(lead, 'status')}
            onRequestDelete={(lead) => setPendingDelete(lead)}
          />
        )}

        {meta && meta.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 py-7 font-mono text-xs tracking-[0.12em] text-muted uppercase">
            <span>
              Showing {first}–{last} of {meta.total}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={!meta.hasPrevPage}
                className="inline-flex cursor-pointer items-center gap-2 border-2 border-line px-5 py-2 text-ink transition-colors hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                {arrow('left')}
                Prev
              </button>
              <span className="px-1 text-sm text-ink">{meta.page}</span>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={!meta.hasNextPage}
                className="inline-flex cursor-pointer items-center gap-2 border-2 border-line px-5 py-2 text-ink transition-colors hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                {arrow('right')}
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {panel ? (
        <LeadFormPanel
          lead={panel.lead}
          focusField={panel.focusField}
          saving={saving}
          serverError={panelError}
          serverErrors={panelFieldErrors}
          onClose={() => setPanel(null)}
          onSubmit={handlePanelSubmit}
        />
      ) : null}

      {profileOpen ? (
        <ProfilePanel
          user={session.user}
          onClose={() => setProfileOpen(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          lead={pendingDelete}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  )
}
