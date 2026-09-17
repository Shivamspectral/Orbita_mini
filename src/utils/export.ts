// Ported 1:1 from the original index.html's export helpers. Self-contained,
// no backend calls -- see CONTINUE_HERE.md item 5.

import { COUNCIL_TEAMS } from '../data/councilTeams'

function escapeHtml(value: unknown = ''): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] as string))
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows || !rows.length) return ''
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r || {})))]
  return [keys, ...rows.map((r) => keys.map((k) => (r as any)?.[k] ?? ''))]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

function downloadBlob(content: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function exportDataset(name: string, rows: Record<string, unknown>[]) {
  downloadBlob(toCSV(rows), `SCMS_${name}.csv`, 'text/csv')
}

// Ported from the original's exportFullSnapshot() (~line 1808). Shared by
// SettingsPanel's "Full Export" button and the command palette's "Export
// full snapshot" action so both stay in sync.
// `teams: COUNCIL_TEAMS` matches the original, which includes the static team
// roster in the snapshot whenever that array is defined (it always is now
// that the Teams page ships).
export function exportFullSnapshot(records: {
  user: unknown
  tasks: unknown
  events: unknown
  meetings: unknown
  members: unknown
  grievances: unknown
}) {
  const payload = {
    exported_at: new Date().toISOString(),
    user: records.user,
    records: {
      tasks: records.tasks,
      events: records.events,
      meetings: records.meetings,
      members: records.members,
      grievances: records.grievances
    },
    teams: COUNCIL_TEAMS
  }
  downloadBlob(JSON.stringify(payload, null, 2), 'SCMS_Full_Snapshot.json', 'application/json')
}

export function exportTasksPDF(rows: any[]) {
  const w = window.open('', '_blank')
  if (!w) throw new Error('Please allow pop-ups for PDF export.')
  const completed = rows.filter((x) => x.status === 'Completed').length
  const pending = rows.length - completed
  w.document.write(
    `<html><head><title>ASTRA SCMS Task Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#3b1725}h1{color:#7a1f3d}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:9px;border:1px solid #ddd;text-align:left;font-size:12px}th{background:#f3e4d7}.summary{padding:12px;background:#fbf4ec;border:1px solid #e8d8cf;border-radius:10px}</style></head><body><h1>ASTRA • ORBITA MINI</h1><h2>Task Report</h2><div class="summary">Total: ${rows.length} &nbsp; | &nbsp; Completed: ${completed} &nbsp; | &nbsp; Pending: ${pending} &nbsp; | &nbsp; Completion: ${rows.length ? Math.round((completed / rows.length) * 100) : 0}%</div><table><tr><th>Task</th><th>Assignee</th><th>Team</th><th>Due</th><th>Status</th><th>Priority</th></tr>${rows
      .map(
        (x) =>
          `<tr><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.assigned_name || '')}</td><td>${escapeHtml(x.assigned_team || '')}</td><td>${escapeHtml(x.due_date || '')}</td><td>${escapeHtml(x.status || 'Pending')}</td><td>${escapeHtml(x.priority || '')}</td></tr>`
      )
      .join('')}</table><p style="margin-top:20px;color:#777">Generated ${new Date().toLocaleString('en-IN')}. Use Print → Save as PDF.</p><script>window.onload=()=>window.print()<\/script></body></html>`
  )
  w.document.close()
}

export function exportMeetingsPDF(rows: any[]) {
  const w = window.open('', '_blank')
  if (!w) throw new Error('Please allow pop-ups for PDF export.')
  w.document.write(
    `<html><head><title>ASTRA SCMS Meeting Report</title><style>body{font-family:Arial;padding:32px;color:#3b1725}h1{color:#7a1f3d}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:9px;font-size:12px}th{background:#f3e4d7}</style></head><body><h1>ASTRA • ORBITA MINI</h1><h2>Meeting Report</h2><table><tr><th>Meeting</th><th>Date</th><th>Time</th><th>Location</th><th>Type</th><th>Agenda</th></tr>${rows
      .map(
        (x) =>
          `<tr><td>${escapeHtml(x.title || '')}</td><td>${escapeHtml(x.date || '')}</td><td>${escapeHtml(x.time || '')}</td><td>${escapeHtml(x.location || '')}</td><td>${escapeHtml(x.type || '')}</td><td>${escapeHtml(x.agenda || '')}</td></tr>`
      )
      .join('')}</table><p>Generated ${new Date().toLocaleString('en-IN')}. Use Print → Save as PDF.</p><script>window.onload=()=>window.print()<\/script></body></html>`
  )
  w.document.close()
}
