import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { COUNCIL_TEAMS } from '../data/councilTeams'

// Ported from the original's #view-power (~line 1646) and the
// "SCMS POWER SUITE — local-only feature engine" script block
// (~lines 2912-2938 in _reference/original_index.html).
//
// DELIBERATE DEVIATION FROM THE ORIGINAL, flagged per PHASE2_CONTINUE.md:
// the original's powerData() reads getLocalDB() (a vestigial browser-local
// database that nothing in the shipped app ever writes real tasks/events/
// meetings/grievances into -- see PHASE2_CONTINUE.md and README.md), so in
// the original this whole page always renders against empty arrays. That's
// a bug, not a design choice, and porting it faithfully would ship a
// dashboard that always shows zero. Per the Phase 2 handoff's own
// instruction ("Power Suite's briefing generator computes pure client-side
// stats from this same data -- no new loaders needed"), this reads live
// data from useData() instead. `finances` is NOT changed: loadFinances() is
// a real stub in the original (always returns []), so an empty array there
// is the correct value, not a placeholder -- see the FINANCES constant
// below.

const POWER_KEY = 'scms_power_suite_v1'

interface PowerApproval {
  title: string
  type: string
  stage: string
  created: string
}
interface PowerGoal {
  title: string
  owner: string
  progress: number
}
interface PowerDoc {
  name: string
  category: string
  date: string
  data?: string
  type?: string
}
interface PowerMedia {
  title: string
  type: string
  stage: string
  owner: string
}
interface PowerAchievement {
  person: string
  award: string
  reason: string
}
interface PowerStore {
  approvals: PowerApproval[]
  goals: PowerGoal[]
  docs: PowerDoc[]
  media: PowerMedia[]
  achievements: PowerAchievement[]
}

function defaultStore(): PowerStore {
  return {
    approvals: [],
    goals: [
      { title: 'Improve student engagement', owner: 'General Secretary', progress: 72 },
      { title: 'Increase event participation', owner: 'Cultural & Sports', progress: 58 },
      { title: 'Improve grievance response', owner: 'Student Welfare', progress: 81 }
    ],
    docs: [],
    media: [],
    achievements: []
  }
}

function loadStore(): PowerStore {
  try {
    return JSON.parse(localStorage.getItem(POWER_KEY) || 'null') || defaultStore()
  } catch {
    return defaultStore()
  }
}

// Finance is a real stub in the original (loadFinances() always returns []),
// not a data source this migration excludes -- so [] here is correct, not a
// fabrication. Do not wire this to anything.
const FINANCES: { status?: string; amount?: number }[] = []

const APPROVAL_FLOW = ['Team Lead', 'Treasurer / Coordinator', 'General Secretary', 'President', 'Approved']
const MEDIA_FLOW = ['Idea', 'Draft', 'Review', 'Approved', 'Published']

const POWER_CARDS: { tab: string; icon: string; title: string; desc: string }[] = [
  { tab: 'command', icon: 'fa-tower-broadcast', title: 'Command Center', desc: 'Live council pulse, attention signals and one-click operations.' },
  { tab: 'calendar', icon: 'fa-calendar-days', title: 'Super Calendar', desc: 'Combine events, meetings, deadlines and tasks in one agenda.' },
  { tab: 'approvals', icon: 'fa-route', title: 'Approval Engine', desc: 'Route finance, events, announcements and requests through approval stages.' },
  { tab: 'goals', icon: 'fa-bullseye', title: 'Goals & OKRs', desc: 'Track council goals, owners, milestones and delivery.' },
  { tab: 'docs', icon: 'fa-folder-tree', title: 'Document Vault', desc: 'Local document index for minutes, circulars, reports and certificates.' },
  { tab: 'media', icon: 'fa-photo-film', title: 'Media & PR', desc: 'Plan posts, posters, press releases and event coverage.' },
  { tab: 'grievances', icon: 'fa-shield-halved', title: 'Grievance Command', desc: 'Priority queue, resolution workflow and response tracking.' },
  { tab: 'achievements', icon: 'fa-medal', title: 'Achievements', desc: 'Professional recognition for delivery, consistency and teamwork.' }
]

const TABS: { id: string; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'goals', label: 'Goals' },
  { id: 'docs', label: 'Documents' },
  { id: 'media', label: 'Media' },
  { id: 'grievances', label: 'Grievances' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'assistant', label: 'AI Assistant' }
]

function safeDate(v?: string) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export default function Power() {
  const { tasks, events, meetings, members, grievances } = useData()
  const { user } = useAuth()
  const showToast = useToast()
  const location = useLocation() as { state?: { briefing?: boolean } }

  const [tab, setTab] = useState('command')
  const [store, setStore] = useState<PowerStore>(() => loadStore())
  const [calendarQuery, setCalendarQuery] = useState('')
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantOutput, setAssistantOutput] = useState(
    'Ask me about tasks, events, meetings, finance, grievances, teams or today\u2019s priorities.'
  )
  const docInputRef = useRef<HTMLInputElement>(null)

  const persist = (next: PowerStore) => {
    setStore(next)
    localStorage.setItem(POWER_KEY, JSON.stringify(next))
  }

  // powerData(): live data instead of getLocalDB() -- see the note above.
  const d = useMemo(
    () => ({ tasks, events, meetings, finances: FINANCES, grievances, members }),
    [tasks, events, meetings, grievances, members]
  )

  const health = useMemo(() => {
    const total = d.tasks.length
    const done = d.tasks.filter((x) => String(x.status || '').toLowerCase() === 'completed').length
    const ev = Math.min(100, d.events.length ? 80 + d.events.length * 3 : 60)
    const meet = Math.min(100, d.meetings.length ? 82 + d.meetings.length * 2 : 60)
    const fin = d.finances.length ? 78 : 70
    const g = d.grievances.length
      ? Math.round(
          (d.grievances.filter((x) => ['resolved', 'closed'].includes(String(x.status || '').toLowerCase())).length / d.grievances.length) * 100
        )
      : 100
    return Math.round((total ? (done / total) * 100 : 72) * 0.35 + ev * 0.15 + meet * 0.15 + fin * 0.15 + g * 0.2)
  }, [d])

  // generateSCMSBriefing()
  const generateBriefing = () => {
  const over = d.tasks.filter((t) => {
    const dueDate = safeDate(t.due_date)

    return (
      String(t.status || '').toLowerCase() !== 'completed' &&
      dueDate !== null &&
      dueDate < new Date()
    )
  }).length
    const up = d.events.filter((e) => e.date && new Date(e.date) >= new Date()).length
    const pf = d.finances.filter((f) => String(f.status || 'Pending').toLowerCase() === 'pending').length
    const gr = d.grievances.filter((g) => !['resolved', 'closed'].includes(String(g.status || '').toLowerCase())).length
    const text = `SCMS DAILY COUNCIL BRIEFING

Council Health: ${health}%

ATTENTION
\u2022 ${over} overdue task(s)
\u2022 ${pf} finance request(s) awaiting review
\u2022 ${gr} open grievance(s)
\u2022 ${up} upcoming event(s)

NEXT MOVE
Review urgent tasks, clear approval bottlenecks and confirm the next event readiness.

Mode: Orbita FastAPI + Supabase workspace.`
    setTab('assistant')
    setAssistantOutput(text)
  }

  // Command palette's 'briefing' command navigates here with
  // { state: { briefing: true } } -- see CommandPalette.tsx. The original
  // calls generateSCMSBriefing() directly without navigating, which from any
  // other page silently does nothing (the assistant panel it writes into
  // isn't mounted); this is the equivalent that actually works.
  useEffect(() => {
    if (location.state?.briefing) generateBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const askAssistant = () => {
    const q = assistantInput.toLowerCase()
    let ans = ''
    if (q.includes('task')) ans = `You have ${d.tasks.length} tasks. ${d.tasks.filter((t) => String(t.status || '').toLowerCase() !== 'completed').length} are not completed.`
    else if (q.includes('event')) ans = `There are ${d.events.length} indexed events. ${d.events.filter((e) => e.date && new Date(e.date) >= new Date()).length} are upcoming.`
    else if (q.includes('meeting')) ans = `There are ${d.meetings.length} meetings in the local workspace.`
    else if (q.includes('finance') || q.includes('budget'))
      ans = `There are ${d.finances.length} finance records; ${d.finances.filter((f) => String(f.status || 'Pending').toLowerCase() === 'pending').length} are pending.`
    else if (q.includes('grievance'))
      ans = `There are ${d.grievances.filter((g) => !['resolved', 'closed'].includes(String(g.status || '').toLowerCase())).length} open grievances.`
    else ans = `Council health is ${health}%. Ask me about tasks, events, meetings, finance, grievances, teams or priorities.`
    setAssistantOutput(ans)
  }

  const exportPowerSuite = () => {
    const payload = { exportedAt: new Date().toISOString(), currentUser: user, powerSuite: store, coreData: d }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'scms-power-suite-snapshot.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 500)
    showToast('Power Suite export created.')
  }

  const openCommandPalette = () => window.dispatchEvent(new Event('scms:open-command-palette'))

  // --- Attention Center ---
  const attentionRows = useMemo(() => {
    const rows: [string, string, string, string][] = [];

const overdue = d.tasks.filter((t) => {
  const dueDate = safeDate(t.due_date);

  return (
    String(t.status || '').toLowerCase() !== 'completed' &&
    dueDate !== null &&
    dueDate < new Date()
  );
}).length;
    if (overdue) rows.push(['fa-clock', 'Overdue tasks', `${overdue} task${overdue > 1 ? 's' : ''} need immediate action.`, 'URGENT'])
    const urgentG = d.grievances.filter(
      (g) => ['urgent', 'emergency', 'critical'].includes(String(g.priority || '').toLowerCase()) && !['resolved', 'closed'].includes(String(g.status || '').toLowerCase())
    ).length
    if (urgentG) rows.push(['fa-shield-halved', 'Priority grievances', `${urgentG} high-priority grievance${urgentG > 1 ? 's' : ''} open.`, 'ATTENTION'])
    const pendingF = d.finances.filter((f) => String(f.status || 'Pending').toLowerCase() === 'pending').length
    if (pendingF) rows.push(['fa-indian-rupee-sign', 'Finance approvals', `${pendingF} funding request${pendingF > 1 ? 's' : ''} pending review.`, 'REVIEW'])
    const upcoming = d.events.filter((e) => e.date && new Date(e.date) >= new Date()).length
    rows.push(['fa-calendar', 'Upcoming calendar', `${upcoming} upcoming event${upcoming !== 1 ? 's' : ''} currently indexed.`, 'INFO'])
    return rows
  }, [d])

  // --- Super Calendar ---
  const calendarRows = useMemo(() => {
    const q = calendarQuery.toLowerCase()
    const rows = [
      ...d.events.map((x) => ({ date: x.date || '', time: x.time || '', title: x.title || 'Event', type: 'Event', icon: 'fa-calendar' })),
      ...d.meetings.map((x) => ({ date: x.date || '', time: x.time || '', title: x.title || 'Meeting', type: 'Meeting', icon: 'fa-handshake' })),
      ...d.tasks
        .filter((x) => x.due_date)
        .map((x) => ({ date: x.due_date || '', time: '', title: x.title || 'Task deadline', type: 'Task deadline', icon: 'fa-clipboard-check' }))
    ]
      .filter((x) => !q || `${x.title} ${x.type}`.toLowerCase().includes(q))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    return rows
  }, [d, calendarQuery])

  // --- Approvals ---
  const createApproval = () => {
    const title = window.prompt('Approval request title:')
    if (!title) return
    const type = window.prompt('Type (Finance/Event/Announcement):', 'Finance') || 'General'
    persist({ ...store, approvals: [...store.approvals, { title, type, stage: 'Team Lead', created: new Date().toLocaleDateString('en-IN') }] })
    showToast('Approval request created.')
  }
  const advanceApproval = (i: number) => {
    const approvals = [...store.approvals]
    const x = approvals[i]
    const n = APPROVAL_FLOW.indexOf(x.stage)
    x.stage = APPROVAL_FLOW[Math.min(n + 1, APPROVAL_FLOW.length - 1)]
    const approved = x.stage === 'Approved'
    persist({ ...store, approvals: approved ? approvals.filter((_, idx) => idx !== i) : approvals })
    showToast(approved ? 'Request approved.' : 'Approval advanced.', 'success')
  }

  // --- Goals ---
  const addPowerGoal = () => {
    const title = window.prompt('Goal title:')
    if (!title) return
    const owner = window.prompt('Owner/team:', 'Council') || 'Council'
    persist({ ...store, goals: [...store.goals, { title, owner, progress: 0 }] })
    showToast('Goal added.')
  }
  const bumpGoal = (i: number) => {
    const goals = [...store.goals]
    goals[i] = { ...goals[i], progress: Math.min(100, (Number(goals[i].progress) || 0) + 5) }
    persist({ ...store, goals })
  }
  const goalAvg = store.goals.length ? Math.round(store.goals.reduce((a, g) => a + (Number(g.progress) || 0), 0) / store.goals.length) : 0

  // --- Documents ---
  // PRESERVED BUG, flagged in README: the original's Download button reads
  // onclick="downloadDataUrl('${x.data}', ...)" -- the nested template
  // literal evaluates to the literal six characters "${x.data}", not the
  // stored data URL, so the button has never actually downloaded anything.
  // Reproduced here with the same literal string rather than fixed.
  const BROKEN_DOWNLOAD_HREF = '${x.data}'
  const downloadDataUrl = (data: string, filename: string) => {
    const a = document.createElement('a')
    a.href = data
    a.download = filename
    a.click()
  }
  const onAddDocument = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Document must be 5MB or smaller.', 'error')
      if (docInputRef.current) docInputRef.current.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const category = window.prompt('Category:', 'Meeting Minutes') || 'Council'
      persist({
        ...store,
        docs: [...store.docs, { name: file.name, category, date: new Date().toLocaleDateString('en-IN'), data: reader.result as string, type: file.type }]
      })
      showToast('Document uploaded and stored.')
      if (docInputRef.current) docInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  // --- Media ---
  const addMediaItem = () => {
    const title = window.prompt('Content title:')
    if (!title) return
    const type = window.prompt('Content type:', 'Event Poster') || 'Content'
    persist({ ...store, media: [...store.media, { title, type, stage: 'Idea', owner: 'PR & Media' }] })
    showToast('Media item added.')
  }
  const advanceMedia = (i: number) => {
    const media = [...store.media]
    const x = media[i]
    const n = MEDIA_FLOW.indexOf(x.stage)
    x.stage = MEDIA_FLOW[Math.min(n + 1, MEDIA_FLOW.length - 1)]
    persist({ ...store, media })
  }

  // --- Grievances ---
  const openGrievances = d.grievances.filter((g) => !['resolved', 'closed'].includes(String(g.status || '').toLowerCase()))
  const resolvedCount = d.grievances.length - openGrievances.length
  const resolutionRate = d.grievances.length ? Math.round((resolvedCount / d.grievances.length) * 100) : 100

  // --- Achievements ---
  const addAchievement = () => {
    const person = window.prompt('Member name:')
    if (!person) return
    const award = window.prompt('Achievement:', 'Deadline Master') || 'Achievement'
    const reason = window.prompt('Reason:', 'Strong delivery') || 'Council achievement'
    persist({ ...store, achievements: [...store.achievements, { person, award, reason }] })
    showToast('Achievement added.')
  }
  const deletePowerItem = (key: 'docs' | 'achievements', i: number) => {
    const arr = [...store[key]] as any[]
    arr.splice(i, 1)
    persist({ ...store, [key]: arr } as PowerStore)
    showToast('Removed.')
  }

  // --- Command Center ---
  const activities = useMemo(() => {
    const list = [
      ...d.tasks.slice(-3).map((x) => `Task: ${x.title}`),
      ...d.events.slice(-2).map((x) => `Event: ${x.title}`),
      ...d.meetings.slice(-2).map((x) => `Meeting: ${x.title}`)
    ]
    return list.reverse()
  }, [d])
  const engagement = Math.min(99, 62 + d.members.length)

  const runPowerAutomation = (type: 'event' | 'meeting' | 'finance') => {
    if (type === 'event' && d.events[0]) showToast('Preparation pack simulated for ' + d.events[0].title)
    else if (type === 'meeting' && d.meetings[0]) showToast('Action-item workflow simulated for ' + d.meetings[0].title)
    else if (type === 'finance' && d.finances[0]) createApproval()
    else showToast('No matching source record yet.', 'error')
  }

  return (
    <div id="view-power" className="view-section">
      <div className="power-hero">
        <div>
          <div className="power-kicker">
            <i className="fa-solid fa-bolt" /> SCMS Power Suite • ASTRA Operations
          </div>
          <h2>Student Council Operating System</h2>
          <p>Twenty connected command features with a responsive local cache and Supabase cloud persistence bridge. Changes are mirrored to the configured backend.</p>
          <div className="power-actions">
            <button className="small-btn" onClick={generateBriefing}>
              <i className="fa-solid fa-wand-magic-sparkles" /> Daily Briefing
            </button>
            <button className="small-btn" onClick={openCommandPalette}>
              <i className="fa-solid fa-terminal" /> Command K
            </button>
            <button className="small-btn" onClick={exportPowerSuite}>
              <i className="fa-solid fa-file-export" /> Export Suite
            </button>
          </div>
        </div>
        <div className="power-health">
          <span className="power-kicker">Council health</span>
          <div>
            <strong>{health}%</strong> <span className="power-badge">ON TRACK</span>
          </div>
          <div className="power-progress">
            <i style={{ width: `${health}%` }} />
          </div>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '.45rem' }}>
            Calculated from tasks, events, meetings, finance and grievances.
          </small>
        </div>
      </div>

      <div className="power-grid">
        {POWER_CARDS.map((c) => {
          let stat = 'Mission control →'
          if (c.tab === 'calendar') stat = `${calendarRows.length} scheduled`
          else if (c.tab === 'approvals') stat = `${store.approvals.length} requests`
          else if (c.tab === 'goals') stat = `${store.goals.length} goals`
          else if (c.tab === 'docs') stat = `${store.docs.length} documents`
          else if (c.tab === 'media') stat = `${store.media.length} content items`
          else if (c.tab === 'grievances') stat = `${openGrievances.length} open`
          else if (c.tab === 'achievements') stat = `${store.achievements.length} awards`
          return (
            <div className="power-card" key={c.tab} onClick={() => setTab(c.tab)}>
              <div className="power-icon">
                <i className={`fa-solid ${c.icon}`} />
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <div className="power-stat">{stat}</div>
            </div>
          )
        })}
      </div>

      <div className="power-toolbar">
        {TABS.map((t) => (
          <button key={t.id} className={`power-tab${tab === t.id ? ' active' : ''}`} data-power-tab={t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className={`power-panel${tab === 'command' ? ' active' : ''}`}>
        <div className="power-two">
          <div className="card">
            <div className="section-header">
              <div>
                <h3>Attention Center</h3>
                <div className="team-small">What the council should act on first.</div>
              </div>
              <button className="small-btn" onClick={() => setStore(loadStore())}>
                Refresh
              </button>
            </div>
            <div className="power-list">
              {attentionRows.length ? (
                attentionRows.map((r) => (
                  <div className="power-row" key={r[1]}>
                    <div className="mini">
                      <i className={`fa-solid ${r[0]}`} />
                    </div>
                    <div>
                      <strong>{r[1]}</strong>
                      <small>{r[2]}</small>
                    </div>
                    <span className="power-badge">{r[3]}</span>
                  </div>
                ))
              ) : (
                <div className="power-empty">No attention items. Council is clear. 🎉</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <div>
                <h3>Automation Recipes</h3>
                <div className="team-small">Trigger operational workflows locally.</div>
              </div>
            </div>
            <div className="power-list">
              <div className="power-row">
                <div className="mini">
                  <i className="fa-solid fa-calendar-check" />
                </div>
                <div>
                  <strong>Event → preparation pack</strong>
                  <small>Create checklist, owner tasks and reminders.</small>
                </div>
                <button className="small-btn" onClick={() => runPowerAutomation('event')}>
                  Run
                </button>
              </div>
              <div className="power-row">
                <div className="mini">
                  <i className="fa-solid fa-handshake" />
                </div>
                <div>
                  <strong>Meeting → action items</strong>
                  <small>Turn meeting decisions into tracked tasks.</small>
                </div>
                <button className="small-btn" onClick={() => runPowerAutomation('meeting')}>
                  Run
                </button>
              </div>
              <div className="power-row">
                <div className="mini">
                  <i className="fa-solid fa-file-invoice" />
                </div>
                <div>
                  <strong>Finance → approval route</strong>
                  <small>Start Team Lead → Treasurer → GS → President.</small>
                </div>
                <button className="small-btn" onClick={() => runPowerAutomation('finance')}>
                  Run
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="power-three" style={{ marginTop: '1rem' }}>
          <div className="card">
            <div className="section-header">
              <h3>Live Activity</h3>
            </div>
            <div className="power-list">
              {activities.length ? (
                activities.map((x, i) => (
                  <div className="power-row" key={i}>
                    <div className="mini">
                      <i className="fa-solid fa-bolt" />
                    </div>
                    <div>
                      <strong>{x}</strong>
                      <small>Local activity stream</small>
                    </div>
                    <span className="power-badge">LIVE</span>
                  </div>
                ))
              ) : (
                <div className="power-empty">No activity yet.</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h3>Engagement</h3>
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{engagement}%</div>
            <div className="power-progress">
              <i style={{ width: `${engagement}%` }} />
            </div>
            <small style={{ color: 'var(--text-muted)' }}>{d.members.length} council profiles indexed.</small>
          </div>
          <div className="card">
            <div className="section-header">
              <h3>Role Intelligence</h3>
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900 }}>{COUNCIL_TEAMS.length}</div>
            <small style={{ color: 'var(--text-muted)' }}>functional leadership workspaces</small>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className={`power-panel${tab === 'calendar' ? ' active' : ''}`}>
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Super Calendar</h3>
              <div className="team-small">Events + meetings + task deadlines.</div>
            </div>
            <input className="toolbar-input" placeholder="Search agenda..." value={calendarQuery} onChange={(e) => setCalendarQuery(e.target.value)} />
          </div>
          <div className="power-list">
            {calendarRows.length ? (
              calendarRows.map((x, i) => (
                <div className="power-row" key={i}>
                  <div className="mini">
                    <i className={`fa-solid ${x.icon}`} />
                  </div>
                  <div>
                    <strong>{x.title}</strong>
                    <small>
                      {x.date} {x.time} • {x.type}
                    </small>
                  </div>
                  <span className="power-badge">{x.type}</span>
                </div>
              ))
            ) : (
              <div className="power-empty">No scheduled records.</div>
            )}
          </div>
        </div>
      </div>

      {/* Approvals */}
      <div className={`power-panel${tab === 'approvals' ? ' active' : ''}`}>
        <div className="power-two">
          <div className="card">
            <div className="section-header">
              <h3>Approval Queue</h3>
              <button className="small-btn" onClick={createApproval}>
                + Request
              </button>
            </div>
            <div className="power-list">
              {store.approvals.length ? (
                store.approvals.map((x, i) => (
                  <div className="power-row" key={i}>
                    <div className="mini">
                      <i className="fa-solid fa-route" />
                    </div>
                    <div>
                      <strong>{x.title}</strong>
                      <small>
                        {x.type} • Stage: {x.stage || 'Team Lead'} • {x.created || ''}
                      </small>
                    </div>
                    <button className="small-btn" onClick={() => advanceApproval(i)}>
                      Advance
                    </button>
                  </div>
                ))
              ) : (
                <div className="power-empty">Approval queue is empty.</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h3>Workflow</h3>
            </div>
            <div className="power-list">
              <div className="power-row">
                <div className="mini">1</div>
                <div>
                  <strong>Team Lead</strong>
                  <small>Initial review</small>
                </div>
                <span className="power-badge">START</span>
              </div>
              <div className="power-row">
                <div className="mini">2</div>
                <div>
                  <strong>Treasurer / Coordinator</strong>
                  <small>Budget or operational validation</small>
                </div>
                <span className="power-badge">REVIEW</span>
              </div>
              <div className="power-row">
                <div className="mini">3</div>
                <div>
                  <strong>General Secretary</strong>
                  <small>Council-level approval</small>
                </div>
                <span className="power-badge">VERIFY</span>
              </div>
              <div className="power-row">
                <div className="mini">4</div>
                <div>
                  <strong>President</strong>
                  <small>Final decision</small>
                </div>
                <span className="power-badge">FINAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className={`power-panel${tab === 'goals' ? ' active' : ''}`}>
        <div className="power-two">
          <div className="card">
            <div className="section-header">
              <h3>Council Goals</h3>
              <button className="small-btn" onClick={addPowerGoal}>
                + Goal
              </button>
            </div>
            <div className="power-list">
              {store.goals.map((g, i) => (
                <div className="power-goal" key={i}>
                  <div className="power-goal-head">
                    <span>{g.title}</span>
                    <span>{Number(g.progress) || 0}%</span>
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>
                    {g.owner || 'Council'} •{' '}
                    <button className="small-btn" style={{ padding: '.2rem .4rem' }} onClick={() => bumpGoal(i)}>
                      +5%
                    </button>
                  </small>
                  <div className="power-goal-bar">
                    <i style={{ width: `${Math.min(100, Math.max(0, Number(g.progress) || 0))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h3>Goal Health</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{goalAvg}%</div>
            <p style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Average goal progress</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className={`power-panel${tab === 'docs' ? ' active' : ''}`}>
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Document Vault</h3>
              <div className="team-small">Upload and manage council documents with server-backed metadata.</div>
            </div>
            <button className="small-btn" onClick={() => docInputRef.current?.click()}>
              <i className="fa-solid fa-plus" /> Add document
            </button>
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" hidden onChange={onAddDocument} />
          </div>
          <div className="power-list">
            {store.docs.length ? (
              store.docs.map((x, i) => (
                <div className="power-row" key={i}>
                  <div className="mini">
                    <i className="fa-solid fa-file-lines" />
                  </div>
                  <div>
                    <strong>{x.name}</strong>
                    <small>
                      {x.category || 'Council document'} • {x.date || ''}
                    </small>
                  </div>
                  {x.data ? (
                    <button className="small-btn" onClick={() => downloadDataUrl(x.data as string, x.name)}>
                      Download
                    </button>
                  ) : null}
                  <button className="small-btn" onClick={() => deletePowerItem('docs', i)}>
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="power-empty">No documents indexed yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Media */}
      <div className={`power-panel${tab === 'media' ? ' active' : ''}`}>
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Media &amp; PR Pipeline</h3>
              <div className="team-small">Idea → Draft → Review → Approved → Published.</div>
            </div>
            <button className="small-btn" onClick={addMediaItem}>
              + Content
            </button>
          </div>
          <div className="power-list">
            {store.media.length ? (
              store.media.map((x, i) => (
                <div className="power-row" key={i}>
                  <div className="mini">
                    <i className="fa-solid fa-photo-film" />
                  </div>
                  <div>
                    <strong>{x.title}</strong>
                    <small>
                      {x.type || 'Post'} • {x.stage || 'Idea'} • Owner: {x.owner || 'PR & Media'}
                    </small>
                  </div>
                  <button className="small-btn" onClick={() => advanceMedia(i)}>
                    Advance
                  </button>
                </div>
              ))
            ) : (
              <div className="power-empty">Media pipeline is empty.</div>
            )}
          </div>
        </div>
      </div>

      {/* Grievances */}
      <div className={`power-panel${tab === 'grievances' ? ' active' : ''}`}>
        <div className="power-two">
          <div className="card">
            <div className="section-header">
              <h3>Grievance Command Queue</h3>
            </div>
            <div className="power-list">
              {openGrievances.length ? (
                openGrievances.map((g) => (
                  <div className="power-row" key={g.id}>
                    <div className="mini">
                      <i className="fa-solid fa-shield-halved" />
                    </div>
                    <div>
                      <strong>{g.subject || 'Grievance'}</strong>
                      <small>
                        {g.priority || 'Normal'} • {g.status || 'Open'}
                      </small>
                    </div>
                    <span className="power-badge">{String(g.priority || 'Normal').toUpperCase()}</span>
                  </div>
                ))
              ) : (
                <div className="power-empty">No open grievances.</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="section-header">
              <h3>Response Health</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-blue)' }}>{resolutionRate}%</div>
            <p style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Resolution rate</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className={`power-panel${tab === 'achievements' ? ' active' : ''}`}>
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Professional Achievements</h3>
              <div className="team-small">Recognition stays local and editable.</div>
            </div>
            <button className="small-btn" onClick={addAchievement}>
              + Award
            </button>
          </div>
          <div className="power-list">
            {store.achievements.length ? (
              store.achievements.map((x, i) => (
                <div className="power-row" key={i}>
                  <div className="mini">
                    <i className="fa-solid fa-medal" />
                  </div>
                  <div>
                    <strong>{x.award}</strong>
                    <small>
                      {x.person} • {x.reason || 'Council achievement'}
                    </small>
                  </div>
                  <button className="small-btn" onClick={() => deletePowerItem('achievements', i)}>
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div className="power-empty">No awards recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Assistant */}
      <div className={`power-panel${tab === 'assistant' ? ' active' : ''}`}>
        <div className="card">
          <div className="section-header">
            <div>
              <h3>SCMS Assistant</h3>
              <div className="team-small">Local rule-based council assistant — no external AI/API.</div>
            </div>
          </div>
          <div className="assistant-box">
            <input
              className="power-input"
              placeholder="Ask: what needs attention today?"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') askAssistant()
              }}
            />
            <button className="small-btn" onClick={askAssistant}>
              Ask
            </button>
          </div>
          <div className="assistant-output briefing-box">{assistantOutput}</div>
        </div>
      </div>
    </div>
  )
}
