import { useEffect, useMemo, useState } from 'react'
import { COUNCIL_TEAMS, TEAM_ACTIVITY, getTeam, type CouncilTeam } from '../data/councilTeams'
import { apiFetch } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/common/EmptyState'
import { initials } from './Chat'

// Ported from the original's #view-teams (~line 1534) and
// renderTeamDirectory() / renderTeamKpis() / showAllTeams() /
// openTeamWorkspace() / switchTeamTab() / loadTeamDashboard() /
// loadBudgetLedger() / saveTeamBudget() / recordTeamExpense() /
// exportTeamBudget() (~lines 2637-2890).
//
// ACTIVE_TEAM_ID in the original is plain module-level state for "which team
// card is expanded"; here it's useState. The directory search box and the
// team filter <select> are likewise local state instead of DOM reads.
//
// HEADS-UP for Shiv (PHASE2_CONTINUE.md says Teams is "local-storage-only or
// pure static/client-side data ... neither calls the real backend"). That is
// not accurate for the Budget and Performance tabs: the original's
// loadTeamDashboard() / loadBudgetLedger() / exportTeamBudget() call
// GET /api/teams/{id}/budget and GET /api/teams/{id}/budget/transactions.
// Those are ported as-is using the existing apiFetch, since dropping them
// would remove working UI. No new endpoint or contract was invented.
//
// Preserved bugs from the original (flagged, not fixed -- see README):
//  1. The "All teams / Student-led / Faculty-coordinated" <select> does
//     nothing. The original's filter predicate is
//     `(!mode || mode==='lead' || mode==='faculty')`, which is true for every
//     possible value of the select, so the option never narrows anything.
//  2. saveTeamBudget() and recordTeamExpense() write to the vestigial
//     browser-local DB (localStorage['scms_frontend_db_v1']) and then re-read
//     the ledger from the API -- so a saved allocation or a recorded expense
//     never shows up anywhere. See saveTeamBudget() below.
//  3. recordTeamExpense() calls nextId(), which is not defined anywhere in
//     original_index.html -- the button always threw a ReferenceError caught
//     by its own try/catch, surfacing as an error toast. See the note on
//     nextId() below.

const LOCAL_DB_KEY = 'scms_frontend_db_v1'

function fmt(n: unknown) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

interface TeamBudget {
  allocated?: number
  used?: number
  pending_requests?: number
  remaining?: number
  utilization?: number
  fiscal_year?: string
  notes?: string
}
interface TeamCounts {
  members: number
  open_tasks: number
  completed_tasks: number
  events: number
  goals: number
  meetings: number
  pending_approvals: number
  announcements: number
}
interface TeamDashboard {
  budget: TeamBudget
  counts: TeamCounts
}
interface LedgerRow {
  id: number
  title: string
  amount: number
  transaction_type: string
  status: string
  reference?: string
  created_by_name?: string
  created_at?: string
}

export default function Teams() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('')
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)

  // Same filter as the original's renderTeamDirectory(). `mode` is read but
  // can never exclude anything -- preserved bug #1 above.
  const rows = useMemo(() => {
    const q = query.toLowerCase().trim()
    return COUNCIL_TEAMS.filter((t) => {
      const blob = [t.lead, t.leadRole, t.class, t.branch, t.faculty, t.facultyDept, ...t.members.flat()].join(' ').toLowerCase()
      return (!q || blob.includes(q)) && (!mode || mode === 'lead' || mode === 'faculty')
    })
  }, [query, mode])

  // renderTeamKpis(): counts are over the whole roster, not the filtered list.
  const kpis = useMemo(() => {
    const totalTeams = COUNCIL_TEAMS.length
    const totalMembers = COUNCIL_TEAMS.reduce((n, t) => n + t.members.length, 0)
    const totalLeads = COUNCIL_TEAMS.length
    const faculty = COUNCIL_TEAMS.reduce((n, t) => n + (t.facultyCoordinators?.length || (t.faculty ? 1 : 0)), 0)
    return { totalTeams, totalMembers, totalLeads, faculty }
  }, [])

  const activeTeam = activeTeamId ? getTeam(activeTeamId) : undefined

  return (
    <div id="view-teams" className="view-section">
      <div className="view-toolbar">
        <div>
          <div className="profile-chip">
            <span className="status-dot" /> Leadership Command Center
          </div>
          <h2 style={{ marginTop: '.55rem', fontSize: '1.45rem' }}>Leaders &amp; Functional Teams</h2>
          <p style={{ marginTop: '.25rem', color: 'var(--text-muted)', fontSize: '.78rem' }}>
            Live council leadership, faculty coordinators, committee members and team workspaces.
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="small-btn" onClick={() => setActiveTeamId(null)}>
            <i className="fa-solid fa-grid-2" /> All Teams
          </button>
          {/* The original's Refresh re-renders the directory from the same
              static array; there is nothing to re-fetch. Kept for parity. */}
          <button className="small-btn" onClick={() => setQuery((q) => q)}>
            <i className="fa-solid fa-rotate" /> Refresh
          </button>
        </div>
      </div>

      <div className="kpi-grid" id="team-kpis">
        <div className="kpi">
          <div className="kpi-label">Functional Teams</div>
          <div className="kpi-value">{kpis.totalTeams}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Committee Members</div>
          <div className="kpi-value">{kpis.totalMembers}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Student Leads</div>
          <div className="kpi-value">{kpis.totalLeads}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Faculty Coordinators</div>
          <div className="kpi-value">{kpis.faculty}</div>
        </div>
      </div>

      <div className="team-layout">
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Leadership Directory</h3>
              <div className="team-small">Official Student Council 2026-27 roster • 21 Aug 2026 selection report</div>
            </div>
            <span className="profile-chip">
              <i className="fa-solid fa-shield-halved" /> SCMS
            </span>
          </div>
          <div className="team-filter-row">
            <div className="team-search-box">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                id="team-search"
                className="toolbar-input"
                placeholder="Search lead, role, branch or member..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select id="team-filter" className="toolbar-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">All teams</option>
              <option value="lead">Student-led teams</option>
              <option value="faculty">Faculty-coordinated teams</option>
            </select>
          </div>
          <div className="team-directory" id="team-directory">
            {rows.length ? (
              rows.map((t) => (
                <div
                  key={t.id}
                  className={`team-lead-card${activeTeamId === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTeamId(t.id)}
                >
                  <div className="team-avatar">
                    <i className={`fa-solid ${t.icon}`} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '.84rem' }}>{t.lead}</div>
                    <div style={{ fontSize: '.72rem', color: '#58647a' }}>{t.leadRole}</div>
                    <div className="team-small">
                      {t.members.length} committee members · {t.branch}
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right" style={{ color: '#a0a8b8' }} />
                </div>
              ))
            ) : (
              <EmptyState icon="fa-users-slash" title="No matching teams" text="Try another lead, role or member name." />
            )}
          </div>
        </div>

        <div className="card team-workspace" id="team-workspace">
          {activeTeam ? (
            // Keyed so switching teams remounts the workspace, matching the
            // original's full innerHTML rebuild + loadTeamDashboard() call.
            <TeamWorkspace key={activeTeam.id} team={activeTeam} />
          ) : (
            <AllTeams onOpen={setActiveTeamId} />
          )}
        </div>
      </div>
    </div>
  )
}

// showAllTeams(). Note the original's static #team-workspace markup contains
// a "Choose a team" empty hero, but every path into the Teams view calls
// showAllTeams() ~20-30ms after arriving, so that hero is never actually
// visible. It isn't ported for that reason -- flagged in the README rather
// than kept as dead markup.
function AllTeams({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <>
      <div className="team-hero">
        <div className="team-hero-top">
          <div className="team-identity">
            <div className="team-avatar team-blue">
              <i className="fa-solid fa-people-group" />
            </div>
            <div>
              <h2>Student Council 2026-27</h2>
              <div className="team-role">Leadership &amp; Functional Team Command</div>
              <div className="team-meta">
                <span className="pill-badge">9 functional teams</span>
                <span className="pill-badge">All committee members</span>
                <span className="pill-badge">Central coordination</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="team-member-grid">
        {COUNCIL_TEAMS.map((t) => (
          <div key={t.id} className="team-member-card" onClick={() => onOpen(t.id)} style={{ cursor: 'pointer' }}>
            <div className="team-member-main">
              <div className="member-mini">
                <i className={`fa-solid ${t.icon}`} />
              </div>
              <div>
                <strong>{t.lead}</strong>
                <div className="team-small">{t.leadRole}</div>
              </div>
            </div>
            <span className="pill-badge pill-blue">{t.members.length} members</span>
          </div>
        ))}
      </div>
    </>
  )
}

const TABS: [string, string, string][] = [
  ['overview', 'fa-gauge-high', 'Overview'],
  ['people', 'fa-users', 'Team'],
  ['tasks', 'fa-list-check', 'Tasks'],
  ['goals', 'fa-bullseye', 'Goals'],
  ['budget', 'fa-wallet', 'Budget'],
  ['performance', 'fa-chart-line', 'Performance'],
  ['meetings', 'fa-handshake', 'Meetings'],
  ['files', 'fa-folder-open', 'Files'],
  ['approvals', 'fa-circle-check', 'Approvals']
]

const TEAM_FILES = ['Team action plan', 'Monthly report', 'Event checklist', 'Meeting minutes', 'Member roster']

// openTeamWorkspace(id) + switchTeamTab(). `dash` is the result of
// loadTeamDashboard(); until it resolves the stats/performance cells show the
// original's em-dash and ₹0 placeholders.
function TeamWorkspace({ team: t }: { team: CouncilTeam }) {
  const showToast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [dash, setDash] = useState<TeamDashboard | null>(null)
  const [ledger, setLedger] = useState<LedgerRow[] | 'error' | null>(null)

  const [amount, setAmount] = useState('')
  const [year, setYear] = useState('2026-27')
  const [notes, setNotes] = useState('')
  const [expTitle, setExpTitle] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expType, setExpType] = useState('Expense')
  const [expRef, setExpRef] = useState('')

  const recent = TEAM_ACTIVITY[t.id] || ['Team planning', 'Task follow-up', 'Council coordination']
  const b = dash?.budget || {}

  const loadTeamDashboard = async () => {
    try {
      const data = await apiFetch<TeamDashboard>(`/teams/${t.id}/budget`)
      setDash(data)
      // Same "only fill if empty" behavior as the original.
      setAmount((v) => (v ? v : String(data.budget?.allocated ?? 0)))
      setYear(data.budget?.fiscal_year || '2026-27')
      setNotes((v) => (v ? v : data.budget?.notes || ''))
      await loadBudgetLedger()
    } catch (e: any) {
      showToast(e?.message || 'Unable to load team dashboard', 'error')
    }
  }

  const loadBudgetLedger = async () => {
    try {
      const data = await apiFetch<LedgerRow[]>(`/teams/${t.id}/budget/transactions`)
      setLedger(Array.isArray(data) ? data : [])
    } catch {
      setLedger('error')
    }
  }

  useEffect(() => {
    loadTeamDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PRESERVED BUG (#2 above): the original writes the allocation into the
  // vestigial browser-local DB rather than PATCHing the backend, then calls
  // loadTeamDashboard() which re-reads from the API -- so the saved value is
  // silently discarded and the KPIs snap back. Replicated exactly, including
  // the success toast. If this should actually persist, it needs a backend
  // endpoint and is a product decision, not a migration fix.
  const saveTeamBudget = async () => {
    try {
      const db = readLocalDB()
      db.team_budgets = db.team_budgets || {}
      db.team_budgets[t.id] = {
        team_id: t.id,
        allocated_amount: Number(amount || 0),
        fiscal_year: year || '2026-27',
        notes,
        updated_at: new Date().toISOString()
      }
      writeLocalDB(db)
      showToast('Team budget allocation saved.')
      await loadTeamDashboard()
    } catch (e: any) {
      showToast(e?.message, 'error')
    }
  }

  // PRESERVED BUG (#2 above) plus BUG #3: in the original this function calls
  // nextId(), which is never defined in original_index.html, so every click
  // threw a ReferenceError that its own catch turned into an error toast --
  // recording an expense never worked at all. A ReferenceError can't be
  // reproduced in TypeScript without deliberately writing code that won't
  // compile, so nextId is implemented here as the obvious max-id+1 it was
  // meant to be. That means this button now "succeeds" where the original
  // always failed. It still writes only to the local DB, and the ledger below
  // still reads from the API, so nothing visible changes either way.
  // Flagged for Shiv: wiring this to a real endpoint is a product decision.
  const recordTeamExpense = async () => {
    const title = expTitle.trim()
    const amt = Number(expAmount || 0)
    if (!title || !amt) {
      showToast('Enter expense title and amount.', 'error')
      return
    }
    try {
      const db = readLocalDB()
      db.budget_transactions = Array.isArray(db.budget_transactions) ? db.budget_transactions : []
      db.budget_transactions.unshift({
        id: nextId(db.budget_transactions),
        team_id: t.id,
        title,
        amount: amt,
        transaction_type: expType,
        status: 'Approved',
        reference: expRef.trim(),
        created_by: user?.id ?? null,
        created_by_name: user?.name || '',
        created_at: new Date().toISOString()
      })
      writeLocalDB(db)
      showToast('Expense added to team budget.')
      setExpTitle('')
      setExpAmount('')
      setExpRef('')
      await loadTeamDashboard()
    } catch (e: any) {
      showToast(e?.message, 'error')
    }
  }

  const exportTeamBudget = () => {
    apiFetch<LedgerRow[]>(`/teams/${t.id}/budget/transactions`)
      .then((data) => {
        const lines = [
          ['Title', 'Amount', 'Type', 'Status', 'Reference', 'Created By', 'Created At'],
          ...(data || []).map((r) => [r.title, r.amount, r.transaction_type, r.status, r.reference || '', r.created_by_name || '', r.created_at])
        ]
        const csv = lines.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `Team_Budget_${t.id}.csv`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 500)
        showToast('Team budget export created.')
      })
      .catch(() => showToast('Export failed.', 'error'))
  }

  const teamAction = (message: string) => showToast(message)
  const facultyPills = t.facultyCoordinators || []

  return (
    <>
      <div className="team-hero">
        <div className="team-hero-top">
          <div className="team-identity">
            <div className={`team-avatar ${t.colorClass}`}>
              <i className={`fa-solid ${t.icon}`} />
            </div>
            <div>
              <h2>{t.lead}</h2>
              <div className="team-role">{t.leadRole}</div>
              <div className="team-meta">
                <span className="pill-badge">
                  {t.class} · {t.branch}
                </span>
                <span className="pill-badge">{t.members.length} committee members</span>
                {facultyPills.length ? (
                  facultyPills.map((f) => (
                    <span className="pill-badge" key={f[0]}>
                      <i className="fa-solid fa-user-tie" /> {f[0]}
                    </span>
                  ))
                ) : t.faculty ? (
                  <span className="pill-badge">
                    <i className="fa-solid fa-user-tie" /> {t.faculty}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="team-actions">
            <button className="team-action" onClick={() => teamAction('Task assigned to team')}>
              <i className="fa-solid fa-plus" /> Add Task
            </button>
            <button className="team-action" onClick={() => teamAction('Team meeting created')}>
              <i className="fa-solid fa-calendar" /> Meeting
            </button>
            <button className="team-action" onClick={() => teamAction('Announcement prepared')}>
              <i className="fa-solid fa-bullhorn" /> Announce
            </button>
            <button className="team-action" onClick={() => teamAction('Report export prepared')}>
              <i className="fa-solid fa-file-export" /> Report
            </button>
          </div>
        </div>
      </div>

      <div className="team-stats">
        <div className="team-stat">
          <div className="team-stat-label">Members</div>
          <div className="team-stat-value">{dash ? dash.counts.members : t.members.length}</div>
        </div>
        <div className="team-stat">
          <div className="team-stat-label">Open Tasks</div>
          <div className="team-stat-value">{dash ? dash.counts.open_tasks : '—'}</div>
        </div>
        <div className="team-stat">
          <div className="team-stat-label">Budget Left</div>
          <div className="team-stat-value">{dash ? fmt(b.remaining) : '—'}</div>
        </div>
        <div className="team-stat">
          <div className="team-stat-label">Utilization</div>
          <div className="team-stat-value">{dash ? `${Number(b.utilization || 0).toFixed(1)}%` : '—'}</div>
        </div>
      </div>

      <div className="team-tabs">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={`team-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            <i className={`fa-solid ${icon}`} /> {label}
          </button>
        ))}
      </div>

      <div className={`team-tab-panel${tab === 'overview' ? ' active' : ''}`}>
        <div className="team-note">
          <strong>Faculty Coordination:</strong>{' '}
          {facultyPills.length
            ? facultyPills.map((f) => `${f[0]} — ${f[1]}`).join(' · ')
            : t.faculty
              ? `${t.faculty} — ${t.facultyDept}`
              : 'No faculty coordinator is listed for this team in the selection report.'}
          . This workspace is the operating page for the lead and committee.
        </div>
        <div className="team-log" style={{ marginTop: '.8rem' }}>
          {recent.map((a, i) => (
            <div className="team-log-item" key={a}>
              <div className="team-log-icon">
                <i className={`fa-solid ${i === 0 ? 'fa-flag' : i === 1 ? 'fa-calendar-check' : 'fa-gear'}`} />
              </div>
              <div>
                <strong>{a}</strong>
                <div className="team-small">Planned team activity</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'people' ? ' active' : ''}`}>
        <div className="team-member-grid">
          {t.members.map((m) => (
            <div className="team-member-card" key={m[0]}>
              <div className="team-member-main">
                <div className="member-mini">{initials(m[0])}</div>
                <div>
                  <strong>{m[0]}</strong>
                  <div className="team-small">{m[3]}</div>
                  <div className="team-small">
                    {m[1]} · {m[2]}
                  </div>
                </div>
              </div>
              <button className="small-btn" onClick={() => teamAction('Profile opened')}>
                <i className="fa-solid fa-user" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'tasks' ? ' active' : ''}`}>
        <div className="view-toolbar">
          <strong>Team Tasks</strong>
          <div className="toolbar-actions">
            <button className="small-btn" onClick={() => teamAction('New team task created')}>
              <i className="fa-solid fa-plus" /> New
            </button>
            <button className="small-btn" onClick={() => teamAction('Task board opened')}>
              <i className="fa-solid fa-table-cells" /> Board
            </button>
          </div>
        </div>
        <div className="team-log">
          {recent.map((a, i) => (
            <div className="team-log-item" key={a}>
              <div className="team-log-icon">
                <i className="fa-solid fa-list-check" />
              </div>
              <div style={{ flex: 1 }}>
                <strong>{a}</strong>
                <div className="team-small">
                  Owner: {t.lead} · {i % 2 ? 'Medium' : 'High'} priority
                </div>
              </div>
              <span className={`pill-badge ${i % 2 ? 'pill-orange' : 'pill-blue'}`}>{i % 2 ? 'In Progress' : 'Planned'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'goals' ? ' active' : ''}`}>
        <div className="team-note">
          <strong>Quarter goals</strong>
          <br />
          Define measurable outcomes for this functional team, assign owners and review progress during every council meeting.
        </div>
        <div className="team-log" style={{ marginTop: '.8rem' }}>
          <div className="team-log-item">
            <div className="team-log-icon">
              <i className="fa-solid fa-bullseye" />
            </div>
            <div>
              <strong>Primary team objective</strong>
              <div className="team-small">Create the 2026-27 action calendar for {t.leadRole}.</div>
            </div>
            <span className="pill-badge pill-green">Active</span>
          </div>
          <div className="team-log-item">
            <div className="team-log-icon">
              <i className="fa-solid fa-chart-line" />
            </div>
            <div>
              <strong>Monthly progress review</strong>
              <div className="team-small">Review participation, task closure and upcoming activities.</div>
            </div>
            <span className="pill-badge pill-blue">Monthly</span>
          </div>
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'budget' ? ' active' : ''}`}>
        <div className="budget-actions">
          <div>
            <strong>Department Budget Command Center</strong>
            <div className="team-small">Live allocation, spending and financial utilization for this lead's team.</div>
          </div>
          <div className="toolbar-actions">
            <button className="small-btn" onClick={() => loadTeamDashboard()}>
              <i className="fa-solid fa-rotate" /> Refresh
            </button>
            <button className="small-btn" onClick={exportTeamBudget}>
              <i className="fa-solid fa-file-csv" /> Export
            </button>
          </div>
        </div>
        <div className="team-budget-grid">
          <div className="budget-card highlight">
            <div className="label">Assigned Budget</div>
            <div className="value">{fmt(b.allocated)}</div>
          </div>
          <div className="budget-card">
            <div className="label">Budget Used</div>
            <div className="value">{fmt(b.used)}</div>
          </div>
          <div className="budget-card">
            <div className="label">Pending Requests</div>
            <div className="value">{fmt(b.pending_requests)}</div>
          </div>
          <div className="budget-card">
            <div className="label">Remaining</div>
            <div className="value">{fmt(b.remaining)}</div>
          </div>
          <div className="budget-card">
            <div className="label">Utilization</div>
            <div className="value">{Number(b.utilization || 0).toFixed(1)}%</div>
            <div className="budget-progress">
              <span style={{ width: `${Math.min(100, Number(b.utilization || 0))}%` }} />
            </div>
          </div>
        </div>
        <div className="budget-forms">
          <div className="budget-form">
            <h4>
              <i className="fa-solid fa-sliders" /> Allocation
            </h4>
            <div className="team-small" style={{ marginBottom: '.55rem' }}>
              Authorized executive/finance/faculty users can assign the annual team budget.
            </div>
            <input type="number" min="0" step="100" placeholder="Assigned amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input type="text" placeholder="Financial year" value={year} onChange={(e) => setYear(e.target.value)} />
            <textarea rows={3} placeholder="Budget rules / notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="small-btn" onClick={saveTeamBudget}>
              <i className="fa-solid fa-floppy-disk" /> Save Allocation
            </button>
          </div>
          <div className="budget-form">
            <h4>
              <i className="fa-solid fa-receipt" /> Record Expense
            </h4>
            <div className="team-small" style={{ marginBottom: '.55rem' }}>
              Record approved expenditure directly against the team's ledger.
            </div>
            <input type="text" placeholder="Expense title" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />
            <input type="number" min="1" step="1" placeholder="Amount (₹)" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <select value={expType} onChange={(e) => setExpType(e.target.value)}>
                <option>Expense</option>
                <option>Purchase</option>
                <option>Travel</option>
                <option>Event</option>
                <option>Marketing</option>
                <option>Equipment</option>
              </select>
              <input type="text" placeholder="Reference / bill no." value={expRef} onChange={(e) => setExpRef(e.target.value)} />
            </div>
            <button className="small-btn" onClick={recordTeamExpense}>
              <i className="fa-solid fa-plus" /> Add Expense
            </button>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '.6rem' }}>Budget Ledger</h4>
          <div className="team-log">
            {ledger === null ? (
              <div className="team-small">Loading ledger...</div>
            ) : ledger === 'error' ? (
              <div className="team-small">Ledger unavailable.</div>
            ) : ledger.length ? (
              ledger.map((r) => (
                <div className="team-log-item" key={r.id}>
                  <div className="team-log-icon">
                    <i className="fa-solid fa-receipt" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{r.title}</strong>
                    <div className="team-small">
                      {r.transaction_type} · {r.reference || 'No reference'} · {r.created_by_name || ''}
                    </div>
                  </div>
                  <strong style={{ color: '#b91c1c' }}>₹{Number(r.amount || 0).toLocaleString('en-IN')}</strong>
                  <span className={`pill-badge ${r.status === 'Approved' ? 'pill-green' : 'pill-orange'}`}>{r.status}</span>
                </div>
              ))
            ) : (
              <EmptyState icon="fa-receipt" title="No budget transactions" text="This team's expense ledger is empty." />
            )}
          </div>
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'performance' ? ' active' : ''}`}>
        <div className="team-note">
          <strong>Lead Performance Center</strong>
          <br />
          Monitor execution, team activity, financial discipline and delivery health for this functional area.
        </div>
        <div className="team-performance">
          {(
            [
              ['Open Tasks', dash?.counts.open_tasks],
              ['Completed Tasks', dash?.counts.completed_tasks],
              ['Events', dash?.counts.events],
              ['Goals', dash?.counts.goals],
              ['Meetings', dash?.counts.meetings],
              ['Pending Approvals', dash?.counts.pending_approvals],
              ['Announcements', dash?.counts.announcements],
              ['Team Members', dash ? dash.counts.members : t.members.length]
            ] as [string, number | undefined][]
          ).map(([label, value]) => (
            <div className="performance-card" key={label}>
              <small>{label}</small>
              <div className="metric">{value ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'meetings' ? ' active' : ''}`}>
        <div className="team-log">
          <div className="team-log-item">
            <div className="team-log-icon">
              <i className="fa-solid fa-calendar-day" />
            </div>
            <div>
              <strong>Team planning meeting</strong>
              <div className="team-small">Agenda: priorities, task assignments, upcoming events and blockers.</div>
            </div>
            <span className="pill-badge pill-blue">Schedule</span>
          </div>
          <div className="team-log-item">
            <div className="team-log-icon">
              <i className="fa-solid fa-comments" />
            </div>
            <div>
              <strong>Lead review</strong>
              <div className="team-small">Lead + faculty coordinator review.</div>
            </div>
            <span className="pill-badge pill-orange">Review</span>
          </div>
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'files' ? ' active' : ''}`}>
        <div className="team-log">
          {TEAM_FILES.map((x) => (
            <div className="team-log-item" key={x}>
              <div className="team-log-icon">
                <i className="fa-solid fa-file-lines" />
              </div>
              <div style={{ flex: 1 }}>
                <strong>{x}</strong>
                <div className="team-small">Council workspace document</div>
              </div>
              <button className="small-btn" onClick={() => teamAction(`Opened ${x}`)}>
                <i className="fa-solid fa-eye" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`team-tab-panel${tab === 'approvals' ? ' active' : ''}`}>
        <div className="team-log">
          <div className="team-log-item">
            <div className="team-log-icon">
              <i className="fa-solid fa-circle-check" />
            </div>
            <div style={{ flex: 1 }}>
              <strong>Activity proposal</strong>
              <div className="team-small">Awaiting review by council leadership.</div>
            </div>
            <button className="small-btn" onClick={() => teamAction('Approval request opened')}>
              Review
            </button>
          </div>
          <div className="team-log-item">
            <div className="team-log-icon">
              <i className="fa-solid fa-indian-rupee-sign" />
            </div>
            <div style={{ flex: 1 }}>
              <strong>Budget request</strong>
              <div className="team-small">Attach estimate, justification and supporting documents.</div>
            </div>
            <button className="small-btn" onClick={() => teamAction('Budget workflow opened')}>
              Open
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// The original's getLocalDB()/saveLocalDB() around localStorage['scms_frontend_db_v1'].
// Only the two keys the budget forms touch are handled here; the rest of that
// legacy DB (tasks/events/members/...) is unused by the migrated app, which
// reads everything from the backend.
function readLocalDB(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || 'null') || {}
  } catch {
    return {}
  }
}

function writeLocalDB(db: Record<string, any>) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db))
}

// See the note on recordTeamExpense(): the original calls nextId() but never
// defines it. This is the intended implementation.
function nextId(rows: { id?: number }[]): number {
  return rows.reduce((n, x) => Math.max(n, Number(x?.id) || 0), 0) + 1
}
